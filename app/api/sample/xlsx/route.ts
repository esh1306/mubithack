import { readFileSync } from "node:fs";

// The sample Excel commercial invoice, for trying the upload.
export function GET() {
  return new Response(readFileSync("data/samples/pearl-river-commercial-invoice.xlsx"), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pearl-river-commercial-invoice.xlsx"',
    },
  });
}
