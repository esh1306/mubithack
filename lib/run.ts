import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { classifyLine } from "@/lib/agent";
import { parseCsv } from "@/lib/csv";
import { classifyErrorMessage, hasMubitKey } from "@/lib/mubit";
import { isSimilar } from "@/lib/retrieve";
import { generateVariants } from "@/lib/variants";

export const NEVER_SEEN_BATCH = "never-seen";
export const RETRO_BATCH = "retro-scan";
export const VARIANT_BATCH = "variants";
// Batches that are not invoices the broker uploaded.
export const SYSTEM_BATCHES = [NEVER_SEEN_BATCH, RETRO_BATCH, VARIANT_BATCH];

export { isSimilar };

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

// Classify one saved line and store the suggestion.
export async function classifyAndSave(brokerId: string, line: { id: number; text: string }, opts?: { maxSteps?: number }) {
  const r = await classifyLine(brokerId, line.text, opts);
  const suggestion = await db.suggestion.create({
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
  return { suggestion, mubitCalls: r.mubitRequestIds.length, mubitRequestIds: r.mubitRequestIds };
}

const ATTEMPTS = 3;

// Retries cover model hiccups ("No output generated", rate limits) that pass on a second try.
export async function classifyWithRetry(brokerId: string, line: { id: number; text: string }, opts?: { maxSteps?: number }) {
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
export async function teachVariants(
  brokerId: string,
  precedent: { id: number; lineText: string; newCode: string },
): Promise<{ sent: number; matched: number; requestIds: string[]; via: "llm" | "template"; skipped: string | null }> {
  const { texts, via } = await generateVariants(precedent.lineText);
  if (!hasMubitKey()) {
    await db.precedent.update({
      where: { id: precedent.id },
      data: { variantCount: texts.length, variantsMatched: 0, variantRequestIds: "[]" },
    });
    return { sent: 0, matched: 0, requestIds: [], via, skipped: "no-key" };
  }

  const requestIds: string[] = [];
  let matched = 0;
  await pool(texts, 4, async (text) => {
    const existing = await db.line.findFirst({ where: { brokerId, batchId: VARIANT_BATCH, text } });
    const line = existing ?? (await db.line.create({ data: { brokerId, batchId: VARIANT_BATCH, text } }));
    try {
      const r = await classifyWithRetry(brokerId, line, { maxSteps: 4 });
      requestIds.push(...r.mubitRequestIds);
      if (r.suggestion.code.replace(/\D/g, "") === precedent.newCode.replace(/\D/g, "")) matched++;
    } catch (e) {
      console.error("variant classify failed:", classifyErrorMessage(e));
    }
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
        return [b, { before: s[0] ?? null, now: s.at(-1) ?? null }];
      }),
    ),
  }));
}
