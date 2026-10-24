// bun run script scripts/make-xlsx-invoice.mts — writes a realistic Excel commercial invoice for upload demos.
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Commercial Invoice");
ws.addRow(["COMMERCIAL INVOICE"]).font = { bold: true, size: 14 };
ws.addRow(["Seller: Pearl River Electronics Co., Ltd, Shenzhen, China"]);
ws.addRow(["Buyer: Gadget Hub Ltd, Manchester, UK", "", "", "Invoice no: PRE-2026-1043"]);
ws.addRow(["Incoterms: FOB Shenzhen", "", "", "Date: 2026-10-20"]);
ws.addRow([]);
const header = ws.addRow(["Item No.", "Item Description", "Qty (pcs)", "Unit Price (GBP)", "Total Value (GBP)", "Country of Origin"]);
header.font = { bold: true };
const items: [string, number, number][] = [
  ["Smartwatch with heart-rate sensor and bluetooth", 150, 45],
  ["Wireless earbuds with charging case", 400, 20],
  ["Bamboo fibre phone stand, foldable", 600, 3.5],
  ["Silicone watch strap, 22mm", 1000, 1.2],
  ["LED desk lamp, USB powered, plastic", 300, 9],
  ["Power bank, 10000mAh, lithium-ion", 800, 11],
  ["Tempered glass screen protector, iPhone 16", 2000, 0.8],
  ["Kids' bamboo fibre lunch box", 250, 4.4],
];
items.forEach(([d, q, p], i) => ws.addRow([`PRE-${101 + i}`, d, q, p, { formula: `C${7 + i}*D${7 + i}`, result: q * p }, "China"]));
ws.addRow(["", "TOTAL", "", "", { formula: `SUM(E7:E${6 + items.length})`, result: items.reduce((s, [, q, p]) => s + q * p, 0) }]);
ws.columns.forEach((c) => (c.width = 22));
await wb.xlsx.writeFile("data/samples/pearl-river-commercial-invoice.xlsx");
console.log("wrote data/samples/pearl-river-commercial-invoice.xlsx");
