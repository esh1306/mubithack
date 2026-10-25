import { generateText, isStepCount } from "ai";
import { readTools } from "@/lib/agent";
import { db } from "@/lib/db";
import { hasMubitKey, mubit, MODEL_ID, NO_RECORD } from "@/lib/mubit";

// POST { broker, section, messages: [{ role, text }] } → { reply, used }. Prue's chat, with the same
// read-only tools as classify (scoped to this broker). No-record, so it stays out of the classify-task training set.
type Msg = { role: "user" | "assistant"; text: string };

const SYSTEM =
  "You are Prue, the guide inside Precedent, a UK customs commodity-code classification desk for customs brokers. " +
  "The app: Classify (invoices coded line by line, each with a receipt of HMRC sources), Precedents (a broker's corrections reused on similar products), " +
  "Retro-scan (re-checks 3 years of imports at the rate on each import date for overpaid duty), Mubit learning (every check trains the firm's own model), " +
  "Integrations (Shopify, Excel, HMRC, export to declaration software). Users can drop an invoice into this chat to get its codes. " +
  "For any code, duty or tariff question, use your tools first (search_precedents, hmrc_classification_search, read_chapter_notes, lookup_commodity) and answer from what they return.\n" +
  "How to answer:\n" +
  "- Lead with the answer. For a code: the 10-digit code, a few words, then duty/VAT only if lookup_commodity gave them, e.g. \"8539 52 00 00, LED lamps. Duty 0%, VAT 20%.\"\n" +
  "- At most 1-2 short sentences or 3 short bullets after that. Usually under 40 words.\n" +
  "- No preamble, no restating the question, no sign-off, no generic disclaimers or caveats.\n" +
  "- Only say it depends when a fact actually changes the code, and name that fact in a few words (e.g. \"If it has a battery: 8507 60 00 00.\").\n" +
  "- When lines from an attached file are given, answer only what was asked, naming just the matching lines by number, e.g. \"Lines 2 and 5: AA batteries, button cells.\"\n" +
  "- Plain text only: no markdown, no headings, no bold. Unrelated questions: one line steering back.";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { broker?: string; section?: string; messages?: Msg[] } | null;
  const messages = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .slice(-12)
    // Roomy enough for the lines of an attached invoice.
    .map((m) => ({ role: m.role, content: m.text.slice(0, 6000) }));
  // The model wants a user turn first; drop the greeting if it leads.
  while (messages[0]?.role === "assistant") messages.shift();
  if (!messages.length) return Response.json({ error: "Ask me something first." }, { status: 400 });
  if (!hasMubitKey()) return Response.json({ error: "I can't reach my brain right now: MUBIT_API_KEY isn't set." }, { status: 503 });

  try {
    const broker = body?.broker ? await db.broker.findUnique({ where: { id: body.broker } }) : null;
    const asked = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const res = await generateText({
      model: mubit(MODEL_ID),
      system: `${SYSTEM}\nBroker firm: ${broker?.name ?? "unknown"}. The broker is on the "${body?.section || "home"}" screen.`,
      messages,
      tools: readTools(broker?.id ?? "", asked),
      stopWhen: isStepCount(5),
      // Last step: ask for the answer so she never runs out of steps mid-lookup.
      prepareStep: ({ stepNumber, messages }) =>
        stepNumber === 4 ? { messages: [...messages, { role: "user", content: "That was your last tool call. Answer now." }] } : undefined,
      // Short answers by design; tool-call steps fit well inside this too.
      maxOutputTokens: 220,
      headers: NO_RECORD,
      timeout: 45000,
    });
    // What she looked at, for the "What Prue is doing" steps in the chat: `Looked up 8539520000 · duty 2.70%`.
    const used = res.steps.flatMap((s) =>
      s.toolCalls.map((c) => {
        const out = s.toolResults.find((r) => r.toolCallId === c.toolCallId)?.output as Record<string, unknown> | undefined;
        return [toolLabel(c.toolName, c.input as Record<string, string>), toolDetail(c.toolName, out)].filter(Boolean).join(" · ");
      }),
    );
    return Response.json({ reply: res.text.trim() || "Hmm, I lost my words there. Try asking again?", used });
  } catch {
    return Response.json({ error: "Sorry, I couldn't reach Mubit just now. Try again in a moment." }, { status: 502 });
  }
}

function toolLabel(name: string, input: Record<string, string>) {
  if (name === "search_precedents") return `Searched precedents for "${input.query}"`;
  if (name === "hmrc_classification_search") return `Searched HMRC for "${input.query}"`;
  if (name === "read_chapter_notes") return `Read chapter ${input.chapter} notes`;
  if (name === "lookup_commodity") return `Looked up ${input.code}`;
  return name;
}

// A few words on what each tool found, kept short for the step line.
function toolDetail(name: string, out: Record<string, unknown> | undefined) {
  if (!out) return "";
  const list = (k: string) => (Array.isArray(out[k]) ? (out[k] as Record<string, unknown>[]) : []);
  if (name === "search_precedents") {
    const n = list("precedents").length;
    return n ? `${n} match${n === 1 ? "" : "es"}` : "no matches";
  }
  if (name === "hmrc_classification_search") {
    const c = list("candidates");
    return c.length ? `top ${c[0].code}, ${c.length} candidates` : "no candidates";
  }
  if (name === "read_chapter_notes") {
    const n = list("notes").length;
    return n ? `${n} notes` : "unavailable";
  }
  if (name === "lookup_commodity") return out.code ? (out.duty ? `duty ${out.duty}` : out.declarable ? "declarable" : "not declarable") : "not found";
  return "";
}
