import { db } from "@/lib/db";
import { getConfig, mask } from "@/lib/integrations";
import { shopifyKey, type ShopifyConfig } from "@/lib/shopify";

type Params = { params: Promise<{ broker: string }> };

// GET → this broker's clients, with their store connection and how much has been classified for them.
export async function GET(_req: Request, { params }: Params) {
  const { broker } = await params;
  const clients = await db.client.findMany({ where: { brokerId: broker }, orderBy: { name: "asc" } });
  const rows = await Promise.all(
    clients.map(async (c) => {
      const [lines, batches, store] = await Promise.all([
        db.line.count({ where: { clientId: c.id } }),
        db.line.groupBy({ by: ["batchId"], where: { clientId: c.id } }),
        getConfig<ShopifyConfig & { name?: string }>(shopifyKey(c.id)),
      ]);
      return {
        ...c,
        lines,
        invoices: batches.length,
        store: store ? { shop: store.shop, name: store.name ?? null, token: mask(store.token) } : null,
      };
    }),
  );
  return Response.json(rows);
}

// POST { name, eori? } → the client with that name, created if it doesn't exist yet.
export async function POST(req: Request, { params }: Params) {
  const { broker } = await params;
  const { name, eori } = (await req.json()) as { name?: string; eori?: string };
  if (!name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });
  const existing = await db.client.findFirst({ where: { brokerId: broker, name: name.trim() } });
  if (existing) return Response.json(existing);
  const client = await db.client.create({
    data: { brokerId: broker, name: name.trim(), eori: eori?.trim().toUpperCase() || null },
  });
  return Response.json(client);
}
