import { readFileSync } from "node:fs";
import { parseCsv } from "@/lib/csv";

// The demo invoice, as lines ready for /api/[broker]/classify.
export function GET() {
  const rows = parseCsv(readFileSync("data/harbourline-invoice.csv", "utf8"));
  return Response.json(
    rows.map((r) => ({ description: r.description, qty: Number(r.qty), value: Number(r.value_gbp), origin: r.origin })),
  );
}
