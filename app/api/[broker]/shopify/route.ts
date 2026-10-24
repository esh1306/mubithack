import { db } from "@/lib/db";
import { clearConfig, getConfig, mask, setConfig } from "@/lib/integrations";
import {
  listProducts,
  normaliseShop,
  shopInfo,
  shopifyApp,
  shopifyAuthorizeLink,
  validShop,
  writeCode,
  type ShopifyConfig,
} from "@/lib/shopify";

type Params = { params: Promise<{ broker: string }> };

// GET → connection status (never the token itself).
export async function GET(req: Request) {
  const cfg = await getConfig<ShopifyConfig & { name?: string }>("shopify");
  const oauthReady = !!shopifyApp(new URL(req.url).origin);
  return Response.json(
    cfg ? { connected: true, oauthReady, shop: cfg.shop, name: cfg.name, token: mask(cfg.token) } : { connected: false, oauthReady },
  );
}

// POST { action: "oauth", shop } → Shopify approval link | { action: "connect", shop, token } (custom-app token) | { action: "disconnect" } | { action: "import", first? } | { action: "push", lineIds }
export async function POST(req: Request, { params }: Params) {
  const { broker } = await params;
  const body = await req.json();

  try {
    if (body.action === "oauth") {
      // "Connect with Shopify": send the broker to their store to approve Precedent's app.
      const app = shopifyApp(new URL(req.url).origin);
      if (!app) return Response.json({ error: "Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env.local" }, { status: 500 });
      const shop = normaliseShop(body.shop);
      if (!validShop(shop)) return Response.json({ error: "Enter your store's myshopify.com address" }, { status: 400 });
      const state = crypto.randomUUID();
      await setConfig("shopify-oauth", { state, broker });
      return Response.json({ authorizeUrl: shopifyAuthorizeLink(app, shop, state) });
    }
    if (body.action === "connect") {
      const cfg = { shop: normaliseShop(body.shop), token: String(body.token).trim() };
      const shop = await shopInfo(cfg);
      await setConfig("shopify", { ...cfg, name: shop.name });
      return Response.json({ connected: true, shop: cfg.shop, name: shop.name, token: mask(cfg.token) });
    }
    if (body.action === "disconnect") {
      await clearConfig("shopify");
      return Response.json({ connected: false });
    }

    const cfg = await getConfig<ShopifyConfig>("shopify");
    if (!cfg) return Response.json({ error: "Connect a Shopify store first" }, { status: 400 });

    if (body.action === "import") {
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
      });
    }

    if (body.action === "push") {
      // Write approved or fixed codes back to the store's products.
      const lines = await db.line.findMany({
        where: { id: { in: body.lineIds as number[] }, brokerId: broker, source: "shopify", externalRef: { not: null } },
        include: { suggestions: { orderBy: { id: "desc" }, take: 1 } },
      });
      const results = [];
      for (const l of lines) {
        const s = l.suggestions[0];
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
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
