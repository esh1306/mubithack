import { db } from "@/lib/db";
import { compareDuty, formatDutyTrail, isMoneyFinding, withinThreeYears, type DutyMaths } from "@/lib/duty";
import { hasMubitKey } from "@/lib/mubit";
import { isSimilar } from "@/lib/retrieve";
import { classifyWithRetry, pool, retroLine, sseResponse } from "@/lib/run";
import { dutyAsOf } from "@/lib/tariff";

function parseMaths(raw: string | null): DutyMaths | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DutyMaths;
  } catch {
    return null;
  }
}

async function entriesWithFindings(broker: string) {
  const entries = await db.pastEntry.findMany({
    where: { brokerId: broker },
    include: { findings: { orderBy: { id: "desc" }, take: 1 } },
    orderBy: { entryDate: "asc" },
  });
  return entries.map(({ findings, ...e }) => {
    const f = findings[0] ?? null;
    return {
      ...e,
      inWindow: withinThreeYears(e.entryDate),
      finding: f
        ? {
            suggestedCode: f.suggestedCode,
            direction: f.direction,
            dutyDelta: f.dutyDelta,
            reason: f.reason,
            maths: parseMaths(f.maths),
            trail: parseMaths(f.maths) ? formatDutyTrail(parseMaths(f.maths)!) : null,
          }
        : null,
    };
  });
}

async function suggestCode(broker: string, text: string, precedents: { id: number; lineText: string; newCode: string; reason: string }[]) {
  const local = precedents.find((p) => isSimilar(p.lineText, text) || isSimilar(p.reason, text));
  if (!hasMubitKey()) {
    return local
      ? { code: local.newCode, reason: local.reason, precedentId: local.id }
      : { code: null as string | null, reason: "No Mubit key — only precedents can re-code a line.", precedentId: null as number | null };
  }
  const line = await retroLine(broker, text);
  try {
    const { suggestion } = await classifyWithRetry(broker, line);
    // An unconfirmed HMRC search hit (model offline) is not evidence for a reclaim or a disclosure.
    if (suggestion.model === "hmrc-search") {
      return local
        ? { code: local.newCode, reason: local.reason, precedentId: local.id }
        : { code: null as string | null, reason: "AI reasoning unavailable, so this entry was not re-checked.", precedentId: null as number | null };
    }
    return { code: suggestion.code, reason: suggestion.reason, precedentId: suggestion.precedentId };
  } catch (e) {
    if (local) return { code: local.newCode, reason: `${local.reason} (classify failed; used precedent #${local.id})`, precedentId: local.id };
    throw e;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  return Response.json(await entriesWithFindings(broker));
}

// POST → SSE: re-classifies each distinct past item once (with today's precedents), then
// compares duty paid with the duty the suggested code would have charged on the import date.
export async function POST(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const all = await db.pastEntry.findMany({ where: { brokerId: broker } });
  const entries = all.filter((e) => withinThreeYears(e.entryDate));
  const skipped = all.length - entries.length;
  const texts = [...new Set(entries.map((e) => e.text))];
  const precedents = await db.precedent.findMany({ where: { brokerId: broker }, orderBy: { id: "desc" } });

  return sseResponse(async (send) => {
    await db.retroFinding.deleteMany({ where: { pastEntry: { brokerId: broker } } });
    send("progress", { done: 0, total: texts.length, skipped });

    let done = 0;
    await pool(texts, 6, async (text) => {
      try {
        const suggestion = await suggestCode(broker, text, precedents);
        for (const e of entries.filter((x) => x.text === text)) {
          const suggestedCode = suggestion.code ?? e.declaredCode;
          const [declared, suggested] = await Promise.all([dutyAsOf(e.declaredCode, e.entryDate), dutyAsOf(suggestedCode, e.entryDate)]);
          const maths = compareDuty({
            entryDate: e.entryDate,
            customsValue: e.customsValue,
            dutyPaid: e.dutyPaid,
            declaredCode: e.declaredCode,
            declaredRate: declared.rate,
            suggestedCode,
            suggestedRate: suggested.rate,
            rateAsOf: e.entryDate,
            rateSource: suggested.source,
          });
          const money = isMoneyFinding(maths);
          await db.retroFinding.create({
            data: {
              pastEntryId: e.id,
              suggestedCode,
              direction: money ? maths.direction : maths.direction === "check" ? "check" : "same",
              dutyDelta: money ? maths.delta : 0,
              reason:
                (suggestion.reason || "Same code") +
                (suggestion.precedentId ? ` (precedent #${suggestion.precedentId})` : "") +
                (suggestion.code ? "" : " (declared code kept)"),
              maths: JSON.stringify(maths),
            },
          });
        }
      } catch (e) {
        send("job-error", { text, message: (e as Error).message });
      }
      send("progress", { done: ++done, total: texts.length, skipped });
      send("entries", await entriesWithFindings(broker));
    });
  });
}
