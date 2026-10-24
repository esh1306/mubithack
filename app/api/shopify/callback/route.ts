import { clearConfig, getConfig, setConfig } from "@/lib/integrations";
import { exchangeShopifyCode, shopInfo, shopifyApp, validShop, verifyShopifyHmac } from "@/lib/shopify";

// Shopify sends the broker back here after they approve the app: ?code&hmac&shop&state&timestamp.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pending = await getConfig<{ state: string; broker: string }>("shopify-oauth");
  const broker = pending?.broker ?? "harbourline";
  const back = (q: string) => Response.redirect(`${url.origin}/${broker}/integrations?${q}`, 302);

  const app = shopifyApp(url.origin);
  const shop = url.searchParams.get("shop") ?? "";
  const code = url.searchParams.get("code");
  if (!app || !code) return back("shopify=error&message=Missing%20code%20or%20Shopify%20app%20settings");
  if (!pending || url.searchParams.get("state") !== pending.state) return back("shopify=error&message=Sign-in%20expired%2C%20try%20again");
  if (!validShop(shop) || !(await verifyShopifyHmac(url.searchParams, app.clientSecret)))
    return back("shopify=error&message=Shopify%20signature%20didn%27t%20check%20out");

  try {
    const token = await exchangeShopifyCode(app, shop, code);
    const info = await shopInfo({ shop, token });
    await setConfig("shopify", { shop, token, name: info.name, via: "oauth" });
    await clearConfig("shopify-oauth");
    return back("shopify=connected");
  } catch (e) {
    return back(`shopify=error&message=${encodeURIComponent((e as Error).message)}`);
  }
}
