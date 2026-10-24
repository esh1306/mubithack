import { db } from "@/lib/db";
import { systemPrompt } from "@/lib/agent";
import { hasMubitKey, MODEL_ID, TRAIN_AFTER } from "@/lib/mubit";
import { NEVER_SEEN_BATCH, RETRO_BATCH, VARIANT_BATCH } from "@/lib/run";

// What this broker has sent through Mubit, from our own records (Mubit's console figures need extra permissions).
export async function GET(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const b = await db.broker.findUniqueOrThrow({ where: { id: broker } });
  const rows = await db.suggestion.findMany({
    where: { line: { brokerId: broker }, model: { notIn: ["broker", "error", "precedent", "seed"] } },
    include: { line: { select: { text: true, batchId: true } } },
    orderBy: { id: "desc" },
  });

  const calls = (s: { mubitRequestId: string | null }) => (s.mubitRequestId ? (JSON.parse(s.mubitRequestId) as string[]) : []);
  const source = (batchId: string) =>
    batchId === NEVER_SEEN_BATCH ? "never-seen" : batchId === RETRO_BATCH ? "retro-scan" : batchId === VARIANT_BATCH ? "variants" : "invoices";
  const bySource: Record<string, { lines: number; calls: number }> = {};
  for (const r of rows) {
    const k = source(r.line.batchId);
    bySource[k] ??= { lines: 0, calls: 0 };
    bySource[k].lines++;
    bySource[k].calls += calls(r).length;
  }
  const totalCalls = rows.reduce((n, r) => n + calls(r).length, 0);
  const examples = rows.length;
  const precedents = await db.precedent.findMany({ where: { brokerId: broker }, orderBy: { id: "desc" }, take: 8 });

  return Response.json({
    broker: b.name,
    model: MODEL_ID,
    prompt: systemPrompt(b.name),
    hasKey: hasMubitKey(),
    trainAfter: TRAIN_AFTER,
    examples,
    examplesTowardTrain: Math.min(examples, TRAIN_AFTER),
    progress: TRAIN_AFTER ? Math.min(1, examples / TRAIN_AFTER) : 0,
    classifications: examples,
    calls: totalCalls,
    avgSteps: examples ? totalCalls / examples : 0,
    precedentFollowed: rows.filter((r) => r.precedentId).length,
    bySource,
    note:
      "Each completed classify call is one example on this broker's Mubit task. Mubit trains an adapter after about " +
      `${TRAIN_AFTER} kept examples (its console is the source of truth). This screen counts what we sent. ` +
      "It cannot see whether Mubit kept an example, trained an adapter, tested it, or served it.",
    precedents: precedents.map((p) => ({
      id: p.id,
      lineText: p.lineText,
      newCode: p.newCode,
      variantCount: p.variantCount,
      variantsMatched: p.variantsMatched,
      requestIds: p.variantRequestIds ? (JSON.parse(p.variantRequestIds) as string[]) : [],
    })),
    recent: rows.slice(0, 15).map((r) => ({
      text: r.line.text,
      code: r.code,
      at: r.createdAt,
      source: source(r.line.batchId),
      requestIds: calls(r),
    })),
  });
}
