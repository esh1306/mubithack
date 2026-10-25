import { generateText, Output, tool, isStepCount } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { uk10 } from "@/lib/codes";
import { classifyErrorMessage, hasMubitKey, mubit, MODEL_ID, mubitRequestId } from "@/lib/mubit";
import { isSimilar } from "@/lib/retrieve";
import { searchTariff } from "@/lib/tariff";
import { chapterNotes, classificationSearch, lookupCommodity, relevantNotes } from "@/lib/gov-tariff";
import type { ToolCall } from "@/lib/steps";

// Mubit groups calls into one task by system prompt + model + tools + output format.
// Keep this text and the tool definitions fixed: only the broker's name varies, which
// makes each broker its own Mubit task (and so its own adapter).
export function systemPrompt(brokerName: string) {
  return `You are the commodity-code classifier for ${brokerName}, a UK customs broker.

For each product line, choose the one 10-digit UK Trade Tariff commodity code to declare.

Work the way HMRC's own classification guidance does, one product at a time:
1. Call search_precedents first. ${brokerName}'s precedents are corrections its own classification staff made. When one applies to this line, follow it over your own judgement, and say which one you used.
2. Call hmrc_classification_search with the product description to get HMRC's shortlist. The top hit is often in the wrong heading, so compare the headings it returns.
3. Call read_chapter_notes for each chapter you are seriously considering. Chapter notes are law: an exclusion ("this chapter does not cover") rules a heading out.
4. Decide the heading by the General Interpretative Rules (GIR 1 headings and notes; GIR 2(b) and 3(b) for mixtures and sets: the material giving essential character; GIR 6 for subheadings).
5. Call lookup_commodity on your chosen code to confirm it is declarable and read its duty.
6. If the deciding fact (such as material, knitted or woven, or use) is missing from the line and no precedent settles it, call ask_client with the one question that would decide it, then give your best guess.

Reply with the code, a one-sentence reason a broker can check, the rule you applied (e.g. "GIR 3(b): melamine resin gives essential character"), the note references you relied on, the main codes you rejected with why, your confidence from 0 to 1, and the id of the precedent you followed, if any.`;
}

export const resultSchema = z.object({
  code: z.string().describe("10-digit commodity code"),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  precedentId: z.number().nullable(),
  rule: z.string().describe("The GIR and note that decided it"),
  notesCited: z.array(z.string()).describe("Note references relied on, e.g. 'Chapter 44 note 1(o)'"),
  rejected: z.array(z.object({ code: z.string(), why: z.string() })).describe("Codes considered and ruled out"),
});

const MAX_STEPS = 10;

export type ToolCallLog = ToolCall;

// The read-only tools, shared by classifyLine and Prue's chat. `lineText` is the product being
// discussed: it pulls in overlapping precedents and ranks chapter notes. Don't change these
// definitions lightly: they are part of each broker's Mubit task.
export function readTools(brokerId: string, lineText: string) {
  return {
    search_precedents: tool({
      description: "Search this broker's past corrections (precedents) by keywords, e.g. 'silicone' or 'knitted shirt'.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const terms = query.split(/\s+/).filter((t) => t.length > 2);
        const all = await db.precedent.findMany({ where: { brokerId }, orderBy: { id: "desc" }, take: 40 });
        const rows =
          terms.length === 0
            ? all.slice(0, 8)
            : all.filter((p) => terms.some((t) => p.lineText.toLowerCase().includes(t) || p.reason.toLowerCase().includes(t)));
        // Always include precedents that overlap this product line, even if the model's query was thin.
        const fromLine = all.filter((p) => isSimilar(p.lineText, lineText) || isSimilar(p.reason, lineText));
        const fromQuery = all.filter((p) => isSimilar(p.lineText, query) || isSimilar(p.reason, query));
        const found = [...fromLine, ...fromQuery, ...rows].filter((p, i, xs) => xs.findIndex((x) => x.id === p.id) === i);
        // How to use them goes in the result, not the system prompt: changing the prompt would start a new Mubit task.
        if (found.length === 0) return { precedents: [], note: "No precedents match. Classify from the tariff." };
        return {
          precedents: found
            .slice(0, 10)
            .map(({ id, lineText, oldCode, newCode, reason }) => ({ id, lineText, wrongCode: oldCode, correctCode: newCode, reason })),
          note:
            "These are this broker's binding decisions. If a precedent's reason covers this product (same kind of goods, same supplier or client fact), " +
            "treat the fact it states as known: use its correctCode heading and do not ask the client about that fact. " +
            "If the product differs in what the reason depends on (for example real wood rather than a resin composite), ignore it.",
        };
      },
    }),
    hmrc_classification_search: tool({
      description: "HMRC's UK Trade Tariff classification search: a ranked shortlist of 10-digit candidate codes for a plain product description, grouped by heading. Scores are relative to this query only, not probabilities.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const r = await classificationSearch(query, 10);
        if (r && r.candidates.length) return r;
        // HMRC search unavailable or empty: fall back to the local tariff copy.
        const local = await searchTariff({ query, limit: 10 });
        return { query, candidates: local.map((l, i) => ({ code: l.code, description: l.path, heading: l.code.slice(0, 4), rank: i + 1, relative: null })), headings: [], note: "HMRC search returned nothing; these come from the local tariff copy." };
      },
    }),
    read_chapter_notes: tool({
      description: "Read one chapter's legal notes from the UK Trade Tariff (exclusions and definitions). Pass the 2-digit chapter.",
      inputSchema: z.object({ chapter: z.string() }),
      execute: async ({ chapter }) => {
        const set = await chapterNotes(chapter);
        if (!set) return { chapter, notes: [], note: "Chapter notes unavailable." };
        const focus = relevantNotes(set, lineText, 8);
        const rest = set.notes.filter((n) => !focus.includes(n)).slice(0, 30);
        return { chapter: set.chapter, title: set.title, url: set.url, notes: [...focus, ...rest].map(({ ref, text }) => ({ ref, text: text.slice(0, 400) })) };
      },
    }),
    lookup_commodity: tool({
      description: "Look up one 10-digit code in the UK Trade Tariff: whether it is declarable, its full hierarchy, third-country duty, VAT and any trade-remedy or quota flags.",
      inputSchema: z.object({ code: z.string() }),
      execute: async ({ code }) => (await lookupCommodity(code.replace(/\D/g, "").padEnd(10, "0").slice(0, 10))) ?? { code: null, note: "Not found in the tariff." },
    }),
  };
}

export async function classifyLine(
  brokerId: string,
  lineText: string,
  opts?: { maxSteps?: number; onCall?: (call: ToolCall) => void },
) {
  if (!hasMubitKey()) throw new Error(classifyErrorMessage(new Error("Mubit API key is missing")));

  const broker = await db.broker.findUniqueOrThrow({ where: { id: brokerId } });
  let question: string | null = null;
  const maxSteps = opts?.maxSteps ?? MAX_STEPS;

  const tools = {
    ...readTools(brokerId, lineText),
    ask_client: tool({
      description: "Record the one question for the importer that would decide the code. Use only when the deciding fact is missing.",
      inputSchema: z.object({ question: z.string() }),
      execute: async (input) => {
        question = input.question;
        return { recorded: true, note: "Give your best guess now; the broker will send this question." };
      },
    }),
  };

  const res = await generateText({
    model: mubit(MODEL_ID),
    system: systemPrompt(broker.name),
    prompt: `Product line: ${lineText}`,
    tools,
    output: Output.object({ schema: resultSchema }),
    stopWhen: isStepCount(maxSteps),
    onStepFinish: (step) => {
      for (const r of step.toolResults) opts?.onCall?.({ tool: r.toolName, input: r.input, output: r.output });
    },
    // On the last step, ask for the answer in the messages (not via toolChoice or activeTools,
    // which Mubit counts as part of the task) so the agent never runs out of steps silently.
    prepareStep: ({ stepNumber, messages }) =>
      stepNumber === maxSteps - 1
        ? { messages: [...messages, { role: "user", content: "That was your last tool call. Give your final answer now." }] }
        : undefined,
  });

  if (!res.output?.code) throw new Error("No output generated");

  const decision: ToolCall = {
    tool: "decision",
    input: {},
    output: { rule: res.output.rule, notesCited: res.output.notesCited, rejected: res.output.rejected },
  };
  const log: ToolCallLog[] = [
    ...res.steps.flatMap((s) => s.toolResults.map((r) => ({ tool: r.toolName, input: r.input, output: r.output }))),
    decision,
  ];

  // Persist what Mubit recorded. Do not overwrite a wrong reply with a precedent after the fact —
  // that left the adapter training on the mistake while the screen showed the fix.
  const code = uk10(res.output.code) ?? res.output.code.replace(/\D/g, "");
  return {
    code,
    reason: res.output.reason,
    confidence: res.output.confidence,
    precedentId: res.output.precedentId,
    question,
    flagged: res.output.confidence < 0.8 || question !== null || !uk10(code),
    model: MODEL_ID,
    mubitRequestIds: res.steps.map((s) => mubitRequestId(s.response.headers)).filter(Boolean) as string[],
    toolCalls: log,
  };
}

// No model available (missing or rejected key): still do the evidence work with HMRC's tools,
// pick the top declarable candidate, and leave the decision to the broker.
export async function classifyWithoutModel(lineText: string, why: string, onCall?: (call: ToolCall) => void) {
  const calls: ToolCall[] = [];
  const push = (c: ToolCall) => {
    calls.push(c);
    onCall?.(c);
  };
  const shortlist = await classificationSearch(lineText, 10);
  push({ tool: "hmrc_classification_search", input: { query: lineText }, output: shortlist ?? { candidates: [] } });
  const top = shortlist?.candidates[0];
  if (top) {
    const notes = await chapterNotes(top.code.slice(0, 2));
    if (notes)
      push({
        tool: "read_chapter_notes",
        input: { chapter: notes.chapter },
        output: { chapter: notes.chapter, title: notes.title, url: notes.url, notes: relevantNotes(notes, lineText, 8) },
      });
  }
  const commodity = top ? await lookupCommodity(top.code) : null;
  if (top) push({ tool: "lookup_commodity", input: { code: top.code }, output: commodity ?? { code: null } });
  const others = (shortlist?.headings ?? []).filter((h) => h.heading !== top?.heading).map((h) => h.heading);
  push({
    tool: "fallback",
    input: {},
    output: {
      title: "AI reasoning unavailable · top HMRC candidate shown, not a decision",
      detail: `${why} Compare it with heading${others.length === 1 ? "" : "s"} ${others.slice(0, 3).join(", ") || "—"} before signing off.`,
    },
  });
  return {
    code: top?.code ?? "",
    reason: top
      ? `HMRC's tariff search ranked this first (${top.description}). Not checked against the notes by the AI: review before signing off.`
      : "HMRC's tariff search found no candidates. Classify by hand.",
    confidence: top ? 0.3 : 0,
    precedentId: null,
    question: null,
    flagged: true,
    model: "hmrc-search",
    mubitRequestIds: [] as string[],
    toolCalls: calls,
  };
}
