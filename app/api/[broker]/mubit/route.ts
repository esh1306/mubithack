import { db } from "@/lib/db";
import { systemPrompt } from "@/lib/agent";
import { MODEL_ID } from "@/lib/mubit";
import { NEVER_SEEN_BATCH, RETRO_BATCH } from "@/lib/run";

// What this broker has sent through Mubit, from our own records (Mubit's console figures need extra permissions).
export async function GET(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const b = await db.broker.findUniqueOrThrow({ where: { id: broker } });
  const rows = await db.suggestion.findMany({
    where: { line: { brokerId: broker }, model: { not: "broker" } },
    include: { line: { select: { text: true, batchId: true } } },
    orderBy: { id: "desc" },
  });

  const calls = (s: { mubitRequestId: string | null }) => (s.mubitRequestId ? (JSON.parse(s.mubitRequestId) as string[]) : []);
  const source = (batchId: string) => (batchId === NEVER_SEEN_BATCH ? "never-seen" : batchId === RETRO_BATCH ? "retro-scan" : "invoices");
  const bySource: Record<string, { lines: number; calls: number }> = {};
  for (const r of rows) {
    const k = source(r.line.batchId);
    bySource[k] ??= { lines: 0, calls: 0 };
    bySource[k].lines++;
    bySource[k].calls += calls(r).length;
  }
  const totalCalls = rows.reduce((n, r) => n + calls(r).length, 0);

  return Response.json({
    broker: b.name,
    model: MODEL_ID,
    prompt: systemPrompt(b.name),
    classifications: rows.length,
    calls: totalCalls,
    avgSteps: rows.length ? totalCalls / rows.length : 0,
    precedentFollowed: rows.filter((r) => r.precedentId).length,
    bySource,
    recent: rows.slice(0, 15).map((r) => ({
      text: r.line.text,
      code: r.code,
      at: r.createdAt,
      source: source(r.line.batchId),
      requestIds: calls(r),
    })),
  });
}
