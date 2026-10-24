import { db } from "@/lib/db";
import { SYSTEM_BATCHES } from "@/lib/run";

// A line with no result yet is still being worked on if it is this recent.
const STILL_RUNNING_MS = 5 * 60 * 1000;

// GET ?list=1 → this broker's uploaded batches, newest first.
// GET ?id=<batchId> (default: the latest batch) → the batch's lines with their latest suggestion.
export async function GET(req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const search = new URL(req.url).searchParams;
  if (search.get("list")) {
    const groups = await db.line.groupBy({
      by: ["batchId"],
      where: { brokerId: broker, batchId: { notIn: SYSTEM_BATCHES } },
      _count: true,
      _min: { createdAt: true, id: true },
    });
    return Response.json(
      groups
        .sort((a, b) => (b._min.id ?? 0) - (a._min.id ?? 0))
        .map((g) => ({ batchId: g.batchId, lines: g._count, createdAt: g._min.createdAt })),
    );
  }
  const id = search.get("id");
  const latest = id
    ? { batchId: id }
    : await db.line.findFirst({
        where: { brokerId: broker, batchId: { notIn: SYSTEM_BATCHES } },
        orderBy: { id: "desc" },
        select: { batchId: true },
      });
  if (!latest) return Response.json({ batchId: null, rows: [] });

  const lines = await db.line.findMany({
    where: { brokerId: broker, batchId: latest.batchId },
    include: { suggestions: { orderBy: { id: "desc" }, take: 1 } },
    orderBy: { id: "asc" },
  });
  const now = Date.now();
  return Response.json({
    batchId: latest.batchId,
    rows: lines.map((l) => {
      const suggestion = l.suggestions[0];
      const status = suggestion ? "done" : now - l.createdAt.getTime() < STILL_RUNNING_MS ? "running" : "error";
      return {
        id: l.id,
        text: l.text,
        qty: l.qty,
        value: l.value,
        origin: l.origin,
        status,
        suggestion,
        error: status === "error" ? "No answer came back" : undefined,
      };
    }),
  });
}
