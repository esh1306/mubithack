import { db } from "@/lib/db";

function cell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET ?batch=<id> → CSV for import into declaration software.
// DE 6/14 is the 8-digit commodity code, DE 6/15 the 2 TARIC digits after it.
export async function GET(req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const batchId = new URL(req.url).searchParams.get("batch");
  if (!batchId) return new Response("batch is required", { status: 400 });

  const lines = await db.line.findMany({
    where: { brokerId: broker, batchId },
    include: { suggestions: { orderBy: { id: "desc" }, take: 1 } },
    orderBy: { id: "asc" },
  });

  const header = ["item", "description", "commodity_code", "de_6_14", "de_6_15", "quantity", "value_gbp", "origin", "status", "reason"];
  const rows = lines.map((l, i) => {
    const s = l.suggestions[0];
    const code = s?.code ?? "";
    return [i + 1, l.text, code, code.slice(0, 8), code.slice(8, 10), l.qty, l.value, l.origin, s?.status ?? "missing", s?.reason];
  });
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="precedent-${broker}-${batchId.slice(0, 8)}.csv"`,
    },
  });
}
