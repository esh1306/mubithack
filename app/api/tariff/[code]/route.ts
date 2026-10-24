import { db } from "@/lib/db";

// Code details for receipts (no chapter notes; those are for the agent).
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await db.tariff.findUnique({ where: { code } });
  if (!row) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ code: row.code, path: row.path, dutyRate: row.dutyRate });
}
