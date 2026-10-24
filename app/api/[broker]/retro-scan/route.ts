import { db } from "@/lib/db";
import { classifyWithRetry, pool, RETRO_BATCH, sseResponse } from "@/lib/run";

// "6.00%" → 0.06. Specific duties (e.g. "£0.20 / items") can't be compared by value, so null.
function adValorem(rate: string | null | undefined) {
  const m = rate?.match(/^([\d.]+)\s*%$/);
  return m ? Number(m[1]) / 100 : null;
}

async function entriesWithFindings(broker: string) {
  const entries = await db.pastEntry.findMany({
    where: { brokerId: broker },
    include: { findings: { orderBy: { id: "desc" }, take: 1 } },
    orderBy: { entryDate: "asc" },
  });
  return entries.map(({ findings, ...e }) => ({ ...e, finding: findings[0] ?? null }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  return Response.json(await entriesWithFindings(broker));
}

// POST → SSE: re-classifies each distinct past item once (with today's precedents), then
// compares duty paid with the duty the suggested code would have charged.
export async function POST(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const entries = await db.pastEntry.findMany({ where: { brokerId: broker } });
  const texts = [...new Set(entries.map((e) => e.text))];

  return sseResponse(async (send) => {
    await db.retroFinding.deleteMany({ where: { pastEntry: { brokerId: broker } } });
    send("progress", { done: 0, total: texts.length });

    let done = 0;
    await pool(texts, 6, async (text) => {
      try {
        const line = await db.line.create({ data: { brokerId: broker, batchId: RETRO_BATCH, text } });
        const { suggestion } = await classifyWithRetry(broker, line);
        const tariff = await db.tariff.findUnique({ where: { code: suggestion.code } });
        const rate = adValorem(tariff?.dutyRate);

        for (const e of entries.filter((x) => x.text === text)) {
          const same = suggestion.code === e.declaredCode;
          const shouldPay = rate === null ? null : Math.round(e.customsValue * rate * 100) / 100;
          const delta = same || shouldPay === null ? 0 : Math.round((shouldPay - e.dutyPaid) * 100) / 100;
          const direction = same ? "same" : shouldPay === null ? "check" : delta > 0.5 ? "under" : delta < -0.5 ? "over" : "same";
          await db.retroFinding.create({
            data: {
              pastEntryId: e.id,
              suggestedCode: suggestion.code,
              direction,
              dutyDelta: delta,
              reason: suggestion.reason + (suggestion.precedentId ? ` (precedent #${suggestion.precedentId})` : ""),
            },
          });
        }
      } catch (e) {
        send("job-error", { text, message: (e as Error).message });
      }
      send("progress", { done: ++done, total: texts.length });
      send("entries", await entriesWithFindings(broker));
    });
  });
}
