import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { classifyLine } from "@/lib/agent";
import { parseCsv } from "@/lib/csv";

export const NEVER_SEEN_BATCH = "never-seen";
export const RETRO_BATCH = "retro-scan";
// Batches that are not invoices the broker uploaded.
export const SYSTEM_BATCHES = [NEVER_SEEN_BATCH, RETRO_BATCH];

// Classify one saved line and store the suggestion.
export async function classifyAndSave(brokerId: string, line: { id: number; text: string }) {
  const r = await classifyLine(brokerId, line.text);
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
  return { suggestion, mubitCalls: r.mubitRequestIds.length };
}

const ATTEMPTS = 3;

// Retries cover model hiccups ("No output generated", rate limits) that pass on a second try.
export async function classifyWithRetry(brokerId: string, line: { id: number; text: string }) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await classifyAndSave(brokerId, line);
    } catch (e) {
      console.error(`classify failed (line ${line.id}, attempt ${attempt}/${ATTEMPTS}):`, (e as Error).message);
      if (attempt >= ATTEMPTS) throw e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
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
        send("fatal", { message: (e as Error).message });
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

const STOP = new Set(["with", "and", "for", "the", "set", "size", "pack", "large", "small", "kids", "men's", "women's"]);

function keyWords(text: string) {
  return new Set(text.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3 && !STOP.has(w)));
}

// Lines worth re-checking after a fix: they share a key word with the fixed line.
export function isSimilar(a: string, b: string) {
  const wa = keyWords(a);
  return [...keyWords(b)].some((w) => wa.has(w));
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
