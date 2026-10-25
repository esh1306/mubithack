import { db } from "@/lib/db";
import { getConfig } from "@/lib/integrations";
import { mubitExampleCount, SYSTEM_BATCHES } from "@/lib/run";
import { TRAIN_AFTER } from "@/lib/mubit";
import { savings } from "@/lib/savings";

// Everything Home shows, in one call: what needs the broker, recent invoices, what was learned,
// money to recover, and which systems are connected.
export async function GET(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;

  const lines = await db.line.findMany({
    where: { brokerId: broker, batchId: { notIn: SYSTEM_BATCHES } },
    include: { suggestions: { orderBy: { id: "desc" }, take: 1 }, client: { select: { name: true } } },
    orderBy: { id: "desc" },
  });
  const latest = (l: (typeof lines)[number]) => l.suggestions[0];

  // Recent invoices, newest first, with progress.
  const byBatch = new Map<string, typeof lines>();
  for (const l of lines) byBatch.set(l.batchId, [...(byBatch.get(l.batchId) ?? []), l]);
  const invoices = [...byBatch.entries()].slice(0, 6).map(([batchId, ls]) => ({
    batchId,
    client: ls[0].client?.name ?? null,
    createdAt: ls.at(-1)!.createdAt,
    lines: ls.length,
    classified: ls.filter((l) => latest(l)).length,
    review: ls.filter((l) => latest(l)?.flagged && latest(l)?.status === "pending").length,
    signedOff: ls.filter((l) => ["approved", "corrected"].includes(latest(l)?.status ?? "")).length,
  }));

  const needsYou = lines
    .filter((l) => latest(l)?.flagged && latest(l)?.status === "pending")
    .slice(0, 6)
    .map((l) => ({
      lineId: l.id,
      batchId: l.batchId,
      text: l.text,
      client: l.client?.name ?? null,
      code: latest(l)!.code,
      confidence: latest(l)!.confidence,
      question: latest(l)!.question,
    }));

  const classified = lines.filter((l) => latest(l));
  const isSigned = (l: (typeof lines)[number]) => ["approved", "corrected"].includes(latest(l)?.status ?? "");
  const signedOff = classified.filter(isSigned).length;

  // What Prue did on her own: lines she coded (not failed runs), and those confident enough to need no question.
  const coded = classified.filter((l) => latest(l)!.model !== "error");
  const auto = coded.filter((l) => !latest(l)!.flagged).length;

  // The desk at a glance: invoices still open, fully signed, and added today.
  const today = new Date().toDateString();
  const batches = [...byBatch.values()];
  const desk = {
    open: batches.filter((ls) => !ls.every(isSigned)).length,
    done: batches.filter((ls) => ls.every(isSigned)).length,
    today: batches.filter((ls) => ls.at(-1)!.createdAt.toDateString() === today).length,
  };

  const precedents = await db.precedent.findMany({ where: { brokerId: broker }, orderBy: { id: "desc" } });
  const followed = await db.suggestion.groupBy({
    by: ["precedentId"],
    where: { precedentId: { in: precedents.map((p) => p.id) }, model: { not: "broker" }, line: { brokerId: broker } },
    _count: true,
  });
  const learned = precedents.slice(0, 5).map((p) => ({
    id: p.id,
    lineText: p.lineText,
    oldCode: p.oldCode,
    newCode: p.newCode,
    reason: p.reason,
    followed: followed.find((f) => f.precedentId === p.id)?._count ?? 0,
  }));

  const findings = await db.retroFinding.findMany({ where: { pastEntry: { brokerId: broker } } });
  const money = {
    reclaim: findings.filter((f) => f.direction === "over").reduce((s, f) => s + Math.abs(f.dutyDelta), 0),
    owe: findings.filter((f) => f.direction === "under").reduce((s, f) => s + f.dutyDelta, 0),
    scanned: findings.length > 0,
  };

  const [hmrc, clients, tariffCodes] = await Promise.all([
    getConfig<{ accessToken?: string; eori?: string }>("hmrc"),
    db.client.findMany({ where: { brokerId: broker }, select: { id: true } }),
    db.tariff.count(),
  ]);
  const stores = (await Promise.all(clients.map((c) => getConfig(`shopify:${c.id}`)))).filter(Boolean).length;

  // The latest line the AI answered on its own: if that fell back to HMRC's shortlist, the AI check is offline.
  const lastAi = lines.map(latest).find((s) => s && !["broker", "precedent"].includes(s.model ?? ""));
  const pastEntries = await db.pastEntry.count({ where: { brokerId: broker } });

  const sampleHistory = !!(await getConfig(`sample-history:${broker}`));
  const mubitExamples = await mubitExampleCount(broker);

  return Response.json({
    sampleHistory,
    learning: { examples: mubitExamples, trainAfter: TRAIN_AFTER },
    aiOffline: lastAi?.model === "hmrc-search",
    pastEntries,
    totals: {
      classified: classified.length,
      signedOff,
      review: lines.filter((l) => latest(l)?.flagged && latest(l)?.status === "pending").length,
      precedents: precedents.length,
      followed: followed.reduce((s, f) => s + f._count, 0),
      invoices: byBatch.size,
    },
    saved: { linesCoded: coded.length, auto, ...savings(coded.length) },
    desk,
    invoices,
    needsYou,
    learned,
    money,
    connected: { hmrc: !!hmrc?.accessToken, eori: hmrc?.eori ?? null, stores, clients: clients.length, tariffCodes, mubit: !!process.env.MUBIT_API_KEY },
  });
}
