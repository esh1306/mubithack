import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { parseCsvLine } from "@/lib/csv";
import { hasMubitKey } from "@/lib/mubit";
import { NEVER_SEEN_BATCH } from "@/lib/run";

async function ensurePastEntries() {
  if ((await db.pastEntry.count()) > 0) return;
  const [, ...rows] = readFileSync("data/harbourline-past-entries.csv", "utf8").trim().split("\n");
  for (const row of rows) {
    const [entryDate, text, declaredCode, value, duty] = parseCsvLine(row);
    await db.pastEntry.create({
      data: { brokerId: "harbourline", entryDate, text, declaredCode, customsValue: Number(value), dutyPaid: Number(duty) },
    });
  }
}

// POST → back to a clean seeded demo: no precedents, no invoices, no retro findings.
// Never-seen baselines (the first result per item) are kept so "before" stays instant.
// Past-entry demo history is restored if it was missing.
export async function POST() {
  await db.retroFinding.deleteMany();
  await db.precedent.deleteMany();

  const neverSeen = await db.line.findMany({
    where: { batchId: NEVER_SEEN_BATCH },
    include: { suggestions: { orderBy: { id: "asc" } } },
  });
  // Keep only a clean first result (no precedent overlay). A first result that
  // already followed a fix is not a useful "before".
  const keep = neverSeen.flatMap((l) => {
    const first = l.suggestions[0];
    if (!first) return [];
    if (first.precedentId || first.model === "precedent" || first.model === "broker") return [];
    return [first.id];
  });
  await db.suggestion.deleteMany({ where: { id: { notIn: keep } } });
  await db.line.deleteMany({ where: { batchId: { not: NEVER_SEEN_BATCH } } });
  await ensurePastEntries();

  return Response.json({
    ok: true,
    neverSeenBaselines: keep.length,
    pastEntries: await db.pastEntry.count(),
    mubit: hasMubitKey(),
  });
}
