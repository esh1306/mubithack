import { readFileSync } from "node:fs";

export function GET() {
  return new Response(readFileSync("data/samples/shopify-products.csv"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="shopify-products.csv"',
    },
  });
}
