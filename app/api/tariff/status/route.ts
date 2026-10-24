import { db } from "@/lib/db";

// Local tariff size, and whether the live UK Trade Tariff API answers right now.
export async function GET() {
  const [codes, chapters] = await Promise.all([db.tariff.count(), db.chapter.count()]);
  let live = false;
  try {
    const res = await fetch("https://www.trade-tariff.service.gov.uk/uk/api/sections/1", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    live = res.ok;
  } catch {}
  return Response.json({ codes, chapters, live });
}
