import ExcelJS from "exceljs";
import { generateText, Output } from "ai";
import { z } from "zod";
import { parseCsvLine } from "@/lib/csv";
import { hasMubitKey, mubit, MODEL_ID, NO_RECORD } from "@/lib/mubit";

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

// Files with no columns to find: PDFs, photos/scans of invoices and plain text.
export const READ_BY_MODEL = /\.(pdf|png|jpe?g|webp|gif|txt)$/i;
export const INVOICE_FILE = /\.(xlsx|csv|pdf|png|jpe?g|webp|gif|txt)$/i;

const MEDIA: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

const linesSchema = z.object({
  lines: z.array(z.object({ description: z.string(), qty: z.number().optional(), value: z.number().optional(), origin: z.string().optional() })),
});

// The model reads the goods lines off the document (no-record: not a classify example).
async function readWithModel(name: string, data: ArrayBuffer) {
  const ext = name.split(".").pop()!.toLowerCase();
  const text = ext === "txt" ? new TextDecoder().decode(data) : null;
  if (!hasMubitKey()) {
    if (text === null) throw new Error("reading PDFs and images needs MUBIT_API_KEY");
    // No model: one product per line, like the paste box.
    return { sheet: null, lines: text.split(/\r?\n/).map((l) => ({ description: l.trim() })).filter((l) => l.description), columns: {} };
  }
  const ask =
    "List every goods line on this invoice or product list: the product description as written, and qty, value (number, in the invoice currency) " +
    "and origin (2-letter country) when shown. Skip headers, totals, freight, addresses and other non-goods text. No lines? Return an empty list.";
  const res = await generateText({
    model: mubit(MODEL_ID),
    output: Output.object({ schema: linesSchema }),
    messages: [
      {
        role: "user",
        content: text !== null ? `${ask}\n\n${text.slice(0, 20000)}` : [{ type: "file", data: new Uint8Array(data), mediaType: MEDIA[ext] }, { type: "text", text: ask }],
      },
    ],
    maxOutputTokens: 3000,
    headers: NO_RECORD,
    timeout: 60000,
  });
  return { sheet: null, lines: res.output.lines.filter((l) => l.description.trim()), columns: {} };
}

export async function parseInvoiceFile(name: string, data: ArrayBuffer) {
  if (READ_BY_MODEL.test(name)) return readWithModel(name, data);
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
