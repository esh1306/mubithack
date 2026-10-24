import { readFileSync } from "node:fs";
import { parseCsv } from "@/lib/csv";

type Sample = { id: string; name: string; supplier: string; about: string };

function samples(): Sample[] {
  return JSON.parse(readFileSync("data/samples/index.json", "utf8"));
}

// GET → the list of sample invoices. GET ?id= → that invoice as lines for /api/[broker]/classify.
export function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const list = samples();
  if (!id) return Response.json(list);
  const sample = list.find((s) => s.id === id);
  if (!sample) return Response.json({ error: "unknown sample" }, { status: 404 });
  const rows = parseCsv(readFileSync(`data/samples/${sample.id}.csv`, "utf8"));
  return Response.json(
    rows.map((r) => ({ description: r.description, qty: Number(r.qty), value: Number(r.value_gbp), origin: r.origin })),
  );
}
