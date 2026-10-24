import { db } from "@/lib/db";
import { clearConfig, getConfig, mask, setConfig } from "@/lib/integrations";
import {
  listProducts,
  normaliseShop,
  shopInfo,
  shopifyApp,
  shopifyAuthorizeLink,
  shopifyKey,
  validShop,
  type ShopifyConfig,
} from "@/lib/shopify";

type Params = { params: Promise<{ broker: string; id: string }> };

async function client(broker: string, id: string) {
  return db.client.findFirst({ where: { id: Number(id), brokerId: broker } });
}

// GET → whether this client's store is connected (never the token itself).
export async function GET(req: Request, { params }: Params) {
  const { broker, id } = await params;
  const c = await client(broker, id);
  if (!c) return Response.json({ error: "No such client" }, { status: 404 });
  const cfg = await getConfig<ShopifyConfig & { name?: string }>(shopifyKey(c.id));
  const oauthReady = !!shopifyApp(new URL(req.url).origin);
  return Response.json(cfg ? { connected: true, oauthReady, shop: cfg.shop, name: cfg.name, token: mask(cfg.token) } : { connected: false, oauthReady });
}

// POST { action: "oauth", shop } → Shopify approval link
//      { action: "connect", shop, token } → connect with a custom-app access token
//      { action: "disconnect" }
//      { action: "import", first? } → the store's products as invoice lines for this client
export async function POST(req: Request, { params }: Params) {
  const { broker, id } = await params;
  const c = await client(broker, id);
  if (!c) return Response.json({ error: "No such client" }, { status: 404 });
  const key = shopifyKey(c.id);
  const body = await req.json();

  try {
    if (body.action === "oauth") {
      const app = shopifyApp(new URL(req.url).origin);
      if (!app) return Response.json({ error: "Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env.local" }, { status: 500 });
      const shop = normaliseShop(body.shop);
      if (!validShop(shop)) return Response.json({ error: "Enter the store's myshopify.com address" }, { status: 400 });
      const state = crypto.randomUUID();
      await setConfig("shopify-oauth", { state, broker, clientId: c.id });
      return Response.json({ authorizeUrl: shopifyAuthorizeLink(app, shop, state) });
    }
    if (body.action === "connect") {
      const cfg = { shop: normaliseShop(body.shop), token: String(body.token).trim() };
      const info = await shopInfo(cfg);
      await setConfig(key, { ...cfg, name: info.name, via: "token" });
      return Response.json({ connected: true, shop: cfg.shop, name: info.name, token: mask(cfg.token) });
    }
    if (body.action === "disconnect") {
      await clearConfig(key);
      return Response.json({ connected: false });
    }
    if (body.action === "import") {
      const cfg = await getConfig<ShopifyConfig>(key);
      if (!cfg) return Response.json({ error: "Connect this client's store first" }, { status: 400 });
      // Products become invoice lines; the store's existing HS code is kept to compare against.
      const products = await listProducts(cfg, Math.min(Number(body.first) || 50, 100));
      return Response.json({
        lines: products.map((p) => ({
          description: [p.title, p.productType, p.description].filter(Boolean).join(" · ").slice(0, 300),
          value: p.price ?? undefined,
          origin: p.origin ?? undefined,
          source: "shopify",
          externalRef: p.inventoryItemId ?? undefined,
          existingCode: p.hsCode ?? undefined,
        })),
        clientId: c.id,
      });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
