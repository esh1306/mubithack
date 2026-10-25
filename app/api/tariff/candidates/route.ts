import { classificationSearch } from "@/lib/gov-tariff";

// GET ?q=… → HMRC's ranked candidate codes for a product description (UK Trade Tariff classification search).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ candidates: [] });
  const r = await classificationSearch(q, 8);
  return Response.json(r ?? { candidates: [], headings: [], error: "The UK Trade Tariff did not answer." });
}
