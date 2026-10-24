import { db } from "@/lib/db";
import { clearConfig } from "@/lib/integrations";
import { shopifyKey } from "@/lib/shopify";

type Params = { params: Promise<{ broker: string; id: string }> };

// PATCH { name?, eori? }
export async function PATCH(req: Request, { params }: Params) {
  const { broker, id } = await params;
  const { name, eori } = (await req.json()) as { name?: string; eori?: string };
  const updated = await db.client.updateMany({
    where: { id: Number(id), brokerId: broker },
    data: { ...(name?.trim() ? { name: name.trim() } : {}), ...(eori !== undefined ? { eori: eori.trim().toUpperCase() || null } : {}) },
  });
  return Response.json({ ok: updated.count === 1 });
}

// DELETE → removes the client and its store connection; its invoices stay, untagged.
export async function DELETE(_req: Request, { params }: Params) {
  const { broker, id } = await params;
  const client = await db.client.findFirst({ where: { id: Number(id), brokerId: broker } });
  if (!client) return Response.json({ ok: false }, { status: 404 });
  await db.line.updateMany({ where: { clientId: client.id }, data: { clientId: null } });
  await db.client.delete({ where: { id: client.id } });
  await clearConfig(shopifyKey(client.id));
  return Response.json({ ok: true });
}
