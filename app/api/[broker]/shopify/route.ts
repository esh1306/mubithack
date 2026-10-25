import { db } from "@/lib/db";
import { getConfig } from "@/lib/integrations";
import { shopifyApp, shopifyKey, writeCode, type ShopifyConfig } from "@/lib/shopify";

type Params = { params: Promise<{ broker: string }> };

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const app = shopifyApp(origin);
  return Response.json({
    oauthReady: !!app,
    redirectUri: app?.redirectUri ?? `${origin}/api/shopify/callback`,
    scopes: "read_products,read_inventory,write_inventory",
    setup: app
      ? null
      : "Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env.local. You can still paste a custom-app token or import a Shopify product CSV. See docs/SHOPIFY.md.",
  });
}

// POST { action: "push", lineIds } → writes approved or fixed codes back to each line's client store.
// Connecting stores and importing products is per client: /api/[broker]/clients/[id]/shopify.
export async function POST(req: Request, { params }: Params) {
  const { broker } = await params;
  const body = await req.json();
  if (body.action !== "push") return Response.json({ error: "Unknown action" }, { status: 400 });

  const lines = await db.line.findMany({
    where: { id: { in: body.lineIds as number[] }, brokerId: broker, source: "shopify", externalRef: { not: null } },
    include: { suggestions: { orderBy: { id: "desc" }, take: 1 } },
  });
  const results = [];
  for (const l of lines) {
    const s = l.suggestions[0];
    const cfg = l.clientId ? await getConfig<ShopifyConfig>(shopifyKey(l.clientId)) : null;
    if (!cfg) {
      results.push({ lineId: l.id, ok: false, message: "This client's store isn't connected" });
      continue;
    }
    if (!s || !["approved", "corrected"].includes(s.status)) {
      results.push({ lineId: l.id, ok: false, message: "Approve or fix the code first" });
      continue;
    }
    try {
      await writeCode(cfg, l.externalRef!, s.code);
      await db.line.update({ where: { id: l.id }, data: { existingCode: s.code } });
      results.push({ lineId: l.id, ok: true });
    } catch (e) {
      results.push({ lineId: l.id, ok: false, message: (e as Error).message });
    }
  }
  return Response.json({ results });
}
