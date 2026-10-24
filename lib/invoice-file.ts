import ExcelJS from "exceljs";
import { parseCsvLine } from "@/lib/csv";

export type InvoiceLine = { description: string; qty?: number; value?: number; origin?: string };

// Commercial invoices name their columns many ways; match on these words.
const COLUMNS = {
  description: ["description", "goods", "product", "item description", "item", "article", "commodity", "title", "name"],
  qty: ["qty", "quantity", "units", "pcs", "pieces"],
  value: ["value_gbp", "total value", "amount", "line total", "total", "value", "price"],
  origin: ["origin", "country of origin", "coo", "country"],
};

function findColumns(header: string[]) {
  const h = header.map((x) => x.toLowerCase().trim());
  const pick = (names: string[]) => {
    for (const n of names) {
      const i = h.findIndex((x) => x === n || x.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };
  return { description: pick(COLUMNS.description), qty: pick(COLUMNS.qty), value: pick(COLUMNS.value), origin: pick(COLUMNS.origin) };
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[£$€,\s]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : undefined;
};

// Rows of strings → invoice lines. The header is the first row (of the first 15) with a description-like column.
function toLines(rows: string[][]): { lines: InvoiceLine[]; columns: Record<string, string | null> } {
  const headerIdx = rows.slice(0, 15).findIndex((r) => findColumns(r).description !== -1);
  if (headerIdx === -1) {
    // No header: treat the first non-empty column as the description.
    return { lines: rows.map((r) => ({ description: r.find((c) => c.trim()) ?? "" })).filter((l) => l.description), columns: {} };
  }
  const header = rows[headerIdx];
  const col = findColumns(header);
  const lines = rows
    .slice(headerIdx + 1)
    .map((r) => ({
      description: (r[col.description] ?? "").trim(),
      qty: col.qty === -1 ? undefined : num(r[col.qty]),
      value: col.value === -1 ? undefined : num(r[col.value]),
      origin: col.origin === -1 ? undefined : (r[col.origin] ?? "").trim() || undefined,
    }))
    // Skip blanks and the totals row most invoices end with.
    .filter((l) => l.description && !/^(sub)?total\b/i.test(l.description));
  const name = (i: number) => (i === -1 ? null : header[i]);
  return { lines, columns: { description: name(col.description), qty: name(col.qty), value: name(col.value), origin: name(col.origin) } };
}

export async function parseInvoiceFile(name: string, data: ArrayBuffer) {
  if (/\.xlsx$/i.test(name)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data);
    const sheet = wb.worksheets[0];
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, i) => {
        const v = cell.value;
        cells[i - 1] =
          v == null ? "" : typeof v === "object" && "result" in v ? String(v.result ?? "") : typeof v === "object" && "richText" in v ? v.richText.map((t) => t.text).join("") : String(v);
      });
      rows.push(Array.from(cells, (c) => c ?? ""));
    });
    return { sheet: sheet.name, ...toLines(rows) };
  }
  const text = new TextDecoder().decode(data);
  return { sheet: null, ...toLines(text.trim().split(/\r?\n/).map(parseCsvLine)) };
}
