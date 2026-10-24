import { searchTariff } from "@/lib/tariff";

// GET ?q=words or ?q=3924 (digits search by number), for the fix picker.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const digits = q.replace(/\s/g, "");
  return Response.json(await searchTariff(/^\d{2,10}$/.test(digits) ? { number: digits } : { query: q, limit: 20 }));
}
