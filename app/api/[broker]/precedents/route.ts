import { db } from "@/lib/db";

// GET → this broker's precedents, newest first, with how many suggestions followed each.
export async function GET(_req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const precedents = await db.precedent.findMany({ where: { brokerId: broker }, orderBy: { id: "desc" } });
  const uses = await db.suggestion.groupBy({
    by: ["precedentId"],
    where: { precedentId: { in: precedents.map((p) => p.id) }, model: { not: "broker" } },
    _count: true,
  });
  return Response.json(
    precedents.map((p) => ({ ...p, uses: uses.find((u) => u.precedentId === p.id)?._count ?? 0 })),
  );
}

// DELETE ?id= → remove one precedent.
export async function DELETE(req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const id = Number(new URL(req.url).searchParams.get("id"));
  await db.precedent.deleteMany({ where: { id, brokerId: broker } });
  return Response.json({ ok: true });
}
