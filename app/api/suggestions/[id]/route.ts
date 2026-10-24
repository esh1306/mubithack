import { db } from "@/lib/db";

// PATCH { status: "approved" } — the broker signs off a code.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = (await req.json()) as { status: string };
  const suggestion = await db.suggestion.update({ where: { id: Number(id) }, data: { status } });
  return Response.json(suggestion);
}
