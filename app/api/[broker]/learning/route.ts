import { db } from "@/lib/db";
import { withinThreeYears } from "@/lib/duty";
import { hasMubitKey, TRAIN_AFTER } from "@/lib/mubit";
import { isSimilar } from "@/lib/retrieve";
import { mubitExampleCount } from "@/lib/run";

// GET → everything the Corrections page needs in one call: each correction, how often it was applied,
// which past entries the 3-year duty check would re-code with it, and what reached this firm's Mubit task.
// Counts are what this app sent; it cannot see whether Mubit kept an example or trained an adapter.
export async function GET(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const [precedents, past, examples, lastAi] = await Promise.all([
    db.precedent.findMany({ where: { brokerId: broker }, orderBy: { id: "desc" } }),
    db.pastEntry.findMany({ where: { brokerId: broker }, select: { text: true, entryDate: true } }),
    mubitExampleCount(broker),
    // The latest line the AI answered on its own. If it fell back to HMRC's search, Mubit refused the call.
    db.suggestion.findFirst({
      where: { line: { brokerId: broker }, model: { notIn: ["broker", "precedent", "seed", "error"] } },
      orderBy: { id: "desc" },
      select: { model: true },
    }),
  ]);
  const uses = await db.suggestion.groupBy({
    by: ["precedentId"],
    where: { precedentId: { in: precedents.map((p) => p.id) }, model: { not: "broker" } },
    _count: true,
  });
  const recent = past.filter((e) => withinThreeYears(e.entryDate));

  const hasKey = hasMubitKey();
  const mubit = hasKey ? (lastAi?.model === "hmrc-search" ? "rejected" : "ok") : "missing";

  return Response.json({
    mubit: { status: mubit, examples, trainAfter: TRAIN_AFTER },
    pastEntries: recent.length,
    precedents: precedents.map((p) => {
      let requestIds: string[] = [];
      try {
        requestIds = p.variantRequestIds ? (JSON.parse(p.variantRequestIds) as string[]) : [];
      } catch {}
      return {
        id: p.id,
        lineText: p.lineText,
        oldCode: p.oldCode,
        newCode: p.newCode,
        reason: p.reason,
        createdAt: p.createdAt,
        uses: uses.find((u) => u.precedentId === p.id)?._count ?? 0,
        variantCount: p.variantCount,
        variantsMatched: p.variantsMatched,
        variantsRecorded: requestIds.length > 0,
        pastMatches: recent.filter((e) => isSimilar(p.lineText, e.text) || isSimilar(p.reason, e.text)).length,
      };
    }),
  });
}
