import { db } from "@/lib/db";
import { classifyWithRetry, pool, sseResponse } from "@/lib/run";

type InLine = { description: string; qty?: number; value?: number; origin?: string };

const CONCURRENCY = 4;

// POST { lines } or { lineIds } (retry existing lines) → SSE stream:
// "batch" with the saved lines, then one "result" or "error" per line, then "done".
export async function POST(req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const body = (await req.json()) as { lines?: InLine[]; lineIds?: number[] };

  let saved;
  if (body.lineIds) {
    saved = await db.line.findMany({ where: { id: { in: body.lineIds }, brokerId: broker } });
  } else {
    const batchId = crypto.randomUUID();
    saved = [];
    for (const l of body.lines ?? []) {
      saved.push(
        await db.line.create({
          data: { brokerId: broker, batchId, text: l.description, qty: l.qty ?? null, value: l.value ?? null, origin: l.origin ?? null },
        }),
      );
    }
  }

  return sseResponse(async (send) => {
    send("batch", { lines: saved });
    await pool(saved, CONCURRENCY, async (line) => {
      try {
        const { suggestion } = await classifyWithRetry(broker, line);
        send("result", { lineId: line.id, suggestion });
      } catch (e) {
        send("error", { lineId: line.id, message: (e as Error).message });
      }
    });
  });
}
