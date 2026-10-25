import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { classifyLine, classifyWithoutModel } from "@/lib/agent";
import type { ToolCall } from "@/lib/steps";
import { parseCsv } from "@/lib/csv";
import { classifyErrorMessage, hasMubitKey, TRAIN_AFTER } from "@/lib/mubit";
import { isSimilar, tokens } from "@/lib/retrieve";
import { generateVariants } from "@/lib/variants";

export const NEVER_SEEN_BATCH = "never-seen";
export const RETRO_BATCH = "retro-scan";
export const VARIANT_BATCH = "variants";
// Batches that are not invoices the broker uploaded.
export const SYSTEM_BATCHES = [NEVER_SEEN_BATCH, RETRO_BATCH, VARIANT_BATCH];

export { isSimilar };

// Stricter than isSimilar: a precedent may override the model only when the products share
// at least two meaningful words (so "bamboo chopsticks" doesn't inherit a "bamboo dinner set" fix).
export function isSameProduct(a: string, b: string) {
  const wa = new Set(tokens(a));
  return new Set(tokens(b).filter((w) => wa.has(w))).size >= 2;
}

// The model can't run at all (no key, or the key is rejected): retrying won't help.
function isAuthFailure(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  return /api key|unauthori[sz]ed|401|invalid x-api-key|authentication/i.test(m);
}

async function persistError(lineId: number, e: unknown) {
  return db.suggestion.create({
    data: {
      lineId,
      code: "",
      reason: classifyErrorMessage(e),
      confidence: 0,
      flagged: true,
      model: "error",
      toolCalls: "[]",
    },
  });
}

export async function mubitExampleCount(brokerId: string) {
  return db.suggestion.count({
    where: { line: { brokerId }, model: { notIn: ["broker", "error", "precedent", "seed", "hmrc-search"] } },
  });
}

function digits(code: string) {
  return (code ?? "").replace(/\D/g, "");
}

// A house fix that covers this product. Chopsticks / chopping boards are marked should_change=no
// so a tableware precedent is not forced onto them.
export async function bindingPrecedent(brokerId: string, text: string) {
  const stay = neverSeenItems().find((i) => i.text === text && !i.shouldChange);
  if (stay) return null;
  const all = await db.precedent.findMany({ where: { brokerId }, orderBy: { id: "desc" } });
  return all.find((p) => isSameProduct(p.lineText, text)) ?? null;
}

async function followPrecedent<T extends { id: number; code: string }>(
  brokerId: string,
  line: { id: number; text: string },
  suggestion: T,
) {
  const hit = await bindingPrecedent(brokerId, line.text);
  if (!hit || digits(suggestion.code) === digits(hit.newCode)) return suggestion;
  return db.suggestion.create({
    data: {
      lineId: line.id,
      code: hit.newCode,
      reason: `Applied precedent #${hit.id}: ${hit.reason}`,
      confidence: 1,
      flagged: false,
      precedentId: hit.id,
      model: "precedent",
      toolCalls: "[]",
    },
  });
}

// Classify one saved line and store the suggestion.
export async function classifyAndSave(
  brokerId: string,
  line: { id: number; text: string },
  opts?: { maxSteps?: number; applyPrecedent?: boolean; onCall?: (call: ToolCall) => void },
) {
  let r: Awaited<ReturnType<typeof classifyLine>>;
  try {
    r = hasMubitKey()
      ? await classifyLine(brokerId, line.text, opts)
      : await classifyWithoutModel(line.text, "No Mubit API key is set.", opts?.onCall);
  } catch (e) {
    if (!isAuthFailure(e)) throw e;
    r = await classifyWithoutModel(line.text, "The Mubit API key was rejected.", opts?.onCall);
  }
  const recorded = await db.suggestion.create({
    data: {
      lineId: line.id,
      code: r.code,
      reason: r.reason,
      confidence: r.confidence,
      flagged: r.flagged,
      question: r.question,
      precedentId: r.precedentId,
      mubitRequestId: JSON.stringify(r.mubitRequestIds),
      model: r.model,
      toolCalls: JSON.stringify(r.toolCalls),
    },
  });
  const suggestion = opts?.applyPrecedent === false ? recorded : await followPrecedent(brokerId, line, recorded);
  return { suggestion, mubitCalls: r.mubitRequestIds.length, mubitRequestIds: r.mubitRequestIds };
}

const ATTEMPTS = 3;

// Retries cover model hiccups ("No output generated", rate limits) that pass on a second try.
export async function classifyWithRetry(
  brokerId: string,
  line: { id: number; text: string },
  opts?: { maxSteps?: number; applyPrecedent?: boolean; onCall?: (call: ToolCall) => void },
) {
  let last: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await classifyAndSave(brokerId, line, opts);
    } catch (e) {
      last = e;
      console.error(`classify failed (line ${line.id}, attempt ${attempt}/${ATTEMPTS}):`, classifyErrorMessage(e));
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  const suggestion = await persistError(line.id, last);
  const err = new Error(classifyErrorMessage(last));
  throw Object.assign(err, { suggestion });
}

// After a broker fix: paraphrase the line ~20 ways and send each through the same classify task
// so Mubit records (paraphrase → corrected heading) as kept examples. Skips the gateway without a key.
export type VariantProgress = {
  done: number;
  total: number;
  text: string;
  requestIds: string[];
  code: string | null;
  matched: boolean;
  skipped: string | null;
  examples: number;
  trainAfter: number;
};

export async function teachVariants(
  brokerId: string,
  precedent: { id: number; lineText: string; newCode: string },
  onEach?: (p: VariantProgress) => void,
): Promise<{ sent: number; matched: number; requestIds: string[]; via: "llm" | "template"; skipped: string | null }> {
  const { texts, via } = await generateVariants(precedent.lineText);
  if (!hasMubitKey()) {
    await db.precedent.update({
      where: { id: precedent.id },
      data: { variantCount: texts.length, variantsMatched: 0, variantRequestIds: "[]" },
    });
    const examples = await mubitExampleCount(brokerId);
    texts.forEach((text, i) =>
      onEach?.({
        done: i + 1,
        total: texts.length,
        text,
        requestIds: [],
        code: null,
        matched: false,
        skipped: "no-key",
        examples,
        trainAfter: TRAIN_AFTER,
      }),
    );
    return { sent: 0, matched: 0, requestIds: [], via, skipped: "no-key" };
  }

  const requestIds: string[] = [];
  let matched = 0;
  let done = 0;
  await pool(texts, 4, async (text) => {
    const existing = await db.line.findFirst({ where: { brokerId, batchId: VARIANT_BATCH, text } });
    const line = existing ?? (await db.line.create({ data: { brokerId, batchId: VARIANT_BATCH, text } }));
    let code: string | null = null;
    let ids: string[] = [];
    try {
      const r = await classifyWithRetry(brokerId, line, { maxSteps: 4, applyPrecedent: false });
      ids = r.mubitRequestIds;
      requestIds.push(...ids);
      code = r.suggestion.code;
      if (digits(r.suggestion.code) === digits(precedent.newCode)) matched++;
    } catch (e) {
      console.error("variant classify failed:", classifyErrorMessage(e));
    }
    const examples = await mubitExampleCount(brokerId);
    onEach?.({
      done: ++done,
      total: texts.length,
      text,
      requestIds: ids,
      code,
      matched: code != null && digits(code) === digits(precedent.newCode),
      skipped: null,
      examples,
      trainAfter: TRAIN_AFTER,
    });
  });

  await db.precedent.update({
    where: { id: precedent.id },
    data: { variantCount: texts.length, variantsMatched: matched, variantRequestIds: JSON.stringify(requestIds) },
  });
  return { sent: texts.length, matched, requestIds, via, skipped: null };
}

// Server-sent events over a ReadableStream. If the browser goes away, work carries on; sends stop.
export function sseResponse(work: (send: (event: string, data: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (event: string, data: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          open = false;
        }
      };
      try {
        await work(send);
      } catch (e) {
        console.error("stream failed:", e);
        send("fatal", { message: classifyErrorMessage(e) });
      }
      send("done", {});
      if (open) controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

// Run fn over items with at most `limit` in flight.
export async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

export function neverSeenItems() {
  return parseCsv(readFileSync("data/never-seen.csv", "utf8")).map((r) => ({
    text: r.description,
    shouldChange: r.should_change === "yes",
  }));
}

// One Line per (broker, never-seen item), reused across runs; each run adds a Suggestion.
export async function neverSeenLine(brokerId: string, text: string) {
  const existing = await db.line.findFirst({ where: { brokerId, batchId: NEVER_SEEN_BATCH, text } });
  return existing ?? db.line.create({ data: { brokerId, batchId: NEVER_SEEN_BATCH, text, neverSeen: true } });
}

export async function retroLine(brokerId: string, text: string) {
  const existing = await db.line.findFirst({ where: { brokerId, batchId: RETRO_BATCH, text } });
  return existing ?? db.line.create({ data: { brokerId, batchId: RETRO_BATCH, text } });
}

// For each never-seen item: the first result (baseline, before any fix) and the latest.
export async function neverSeenState(brokerIds: string[]) {
  const lines = await db.line.findMany({
    where: { batchId: NEVER_SEEN_BATCH, brokerId: { in: brokerIds } },
    include: { suggestions: { orderBy: { id: "asc" } } },
  });
  return neverSeenItems().map((item) => ({
    ...item,
    brokers: Object.fromEntries(
      brokerIds.map((b) => {
        const s = lines.find((l) => l.brokerId === b && l.text === item.text)?.suggestions ?? [];
        const usable = s.filter((x) => x.model !== "error" && x.code);
        return [b, { before: usable[0] ?? null, now: usable.at(-1) ?? null }];
      }),
    ),
  }));
}
