import { parseCsv } from "@/lib/csv";

export type ShopifyCsvLine = {
  description: string;
  value?: number;
  origin?: string;
  source: "shopify-csv";
  existingCode?: string;
};

function pick(row: Record<string, string>, names: string[]) {
  const keys = Object.keys(row);
  for (const n of names) {
    const hit = keys.find((k) => k.trim().toLowerCase() === n);
    if (hit && row[hit]?.trim()) return row[hit].trim();
  }
  for (const n of names) {
    const hit = keys.find((k) => k.trim().toLowerCase().includes(n));
    if (hit && row[hit]?.trim()) return row[hit].trim();
  }
  return "";
}

function money(v: string) {
  const n = Number(v.replace(/[£$€,\s]/g, ""));
  return Number.isFinite(n) && v.trim() ? n : undefined;
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Shopify Admin → Products → Export. One line per product (first variant row). */
export function parseShopifyProductCsv(text: string): { lines: ShopifyCsvLine[]; skipped: number } {
  const rows = parseCsv(text);
  const lines: ShopifyCsvLine[] = [];
  let skipped = 0;
  for (const row of rows) {
    const title = pick(row, ["title", "product title", "name"]);
    if (!title) {
      skipped += 1;
      continue;
    }
    const type = pick(row, ["type", "product type"]);
    const vendor = pick(row, ["vendor"]);
    const body = stripHtml(pick(row, ["body (html)", "body", "description"]));
    const price = money(pick(row, ["variant price", "price"]));
    const origin = pick(row, ["country of origin", "coo", "origin"]) || undefined;
    const hs = pick(row, ["harmonized system code", "hs code", "hs_code"]) || undefined;
    const description = [title, type, vendor, body].filter(Boolean).join(" · ").slice(0, 300);
    lines.push({
      description,
      value: price,
      origin,
      source: "shopify-csv",
      existingCode: hs && /^\d{6,10}$/.test(hs.replace(/\s/g, "")) ? hs.replace(/\s/g, "").padEnd(10, "0").slice(0, 10) : undefined,
    });
  }
  return { lines, skipped };
}
