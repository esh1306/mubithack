import { db } from "@/lib/db";
import { NEVER_SEEN_BATCH } from "@/lib/run";

// POST → back to the start of the demo: no precedents, no invoices, no retro findings.
// Never-seen baselines (the first result per item) are kept so "before" stays instant.
export async function POST() {
  await db.retroFinding.deleteMany();
  await db.precedent.deleteMany();

  const neverSeen = await db.line.findMany({
    where: { batchId: NEVER_SEEN_BATCH },
    include: { suggestions: { orderBy: { id: "asc" } } },
  });
  const keep = neverSeen.flatMap((l) => (l.suggestions[0] ? [l.suggestions[0].id] : []));
  await db.suggestion.deleteMany({ where: { id: { notIn: keep } } });
  await db.line.deleteMany({ where: { batchId: { not: NEVER_SEEN_BATCH } } });
  return Response.json({ ok: true });
}
