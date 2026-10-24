import { db } from "@/lib/db";
import { lookupCommodity, preferenceFor, rulesOfOrigin } from "@/lib/gov-tariff";

const pct = (rate: string | null | undefined) => {
  const m = rate?.match(/^\s*([\d.]+)\s*%\s*$/);
  return m ? Number(m[1]) / 100 : null;
};

// Code details for receipts, live from the UK Trade Tariff (local copy as a fallback).
// ?origin=VN adds the preferential rate and rules of origin; ?value=1200 adds duty and VAT amounts.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const search = new URL(req.url).searchParams;
  const origin = search.get("origin")?.trim().slice(0, 2).toUpperCase() || null;
  const value = Number(search.get("value")) || null;

  const live = await lookupCommodity(code);
  const local = live ? null : await db.tariff.findUnique({ where: { code } });
  if (!live && !local) return Response.json({ error: "not found" }, { status: 404 });

  const [preference, rules] = origin && live ? await Promise.all([preferenceFor(code, origin), rulesOfOrigin(code, origin)]) : [null, []];

  const third = live?.duty ?? local?.dutyRate ?? null;
  const dutyRate = pct(third);
  const prefRate = pct(preference?.rate);
  const vatRate = pct(live?.vat ?? "20%");
  const amounts =
    value && dutyRate !== null
      ? {
          value,
          duty: Math.round(value * dutyRate * 100) / 100,
          dutyWithPreference: prefRate !== null ? Math.round(value * prefRate * 100) / 100 : null,
          vat: vatRate !== null ? Math.round((value + value * dutyRate) * vatRate * 100) / 100 : null,
        }
      : null;

  return Response.json({
    code,
    source: live ? "live" : "local",
    path: live ? live.path.join(" > ") : local!.path,
    pathParts: live?.path ?? local!.path.split(" > "),
    declarable: live?.declarable ?? true,
    dutyRate: third,
    vat: live?.vat ?? null,
    flags: live?.flags ?? [],
    url: live?.url ?? `https://www.trade-tariff.service.gov.uk/commodities/${code}`,
    origin,
    preference,
    rules,
    amounts,
  });
}
