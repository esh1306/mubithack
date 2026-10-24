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

  const audit = new URL(req.url).searchParams.get("audit") === "1";
  const precedents = audit ? await db.precedent.findMany({ where: { brokerId: broker } }) : [];

  // ?audit=1 adds the receipt: precedent and its reason, model, agent steps and Mubit request IDs.
  const header = audit
    ? ["item", "description", "commodity_code", "status", "confidence", "reason", "precedent_id", "precedent_text", "precedent_reason", "model", "agent_steps", "mubit_request_ids", "decided_at"]
    : ["item", "description", "commodity_code", "de_6_14", "de_6_15", "quantity", "value_gbp", "origin", "status", "reason"];
  const rows = lines.map((l, i) => {
    const s = l.suggestions[0];
    const code = s?.code ?? "";
    if (!audit) return [i + 1, l.text, code, code.slice(0, 8), code.slice(8, 10), l.qty, l.value, l.origin, s?.status ?? "missing", s?.reason];
    const p = precedents.find((x) => x.id === s?.precedentId);
    const steps = s ? (JSON.parse(s.toolCalls) as { tool: string }[]).map((c) => c.tool).join(" > ") : "";
    const mreqs = s?.mubitRequestId ? (JSON.parse(s.mubitRequestId) as string[]).join(" ") : "";
    return [i + 1, l.text, code, s?.status ?? "missing", s?.confidence, s?.reason, p?.id, p?.lineText, p?.reason, s?.model, steps, mreqs, s?.createdAt.toISOString()];
  });
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="precedent-${broker}-${batchId.slice(0, 8)}${audit ? "-audit" : ""}.csv"`,
    },
  });
}
