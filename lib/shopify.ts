// Shopify Admin GraphQL API, with a custom-app access token (scopes: read_products, read_inventory, write_inventory).
export const SHOPIFY_API_VERSION = "2026-10";

export type ShopifyConfig = { shop: string; token: string };

export function normaliseShop(input: string) {
  const host = input.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return host.includes(".") ? host : `${host}.myshopify.com`;
}

async function gql<T>(cfg: ShopifyConfig, query: string, variables?: object): Promise<T> {
  const res = await fetch(`https://${cfg.shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": cfg.token },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${body?.errors ?? res.statusText}`);
  if (body?.errors?.length) throw new Error(`Shopify: ${body.errors.map((e: { message: string }) => e.message).join("; ")}`);
  return body.data as T;
}

export async function shopInfo(cfg: ShopifyConfig) {
  const d = await gql<{ shop: { name: string; currencyCode: string } }>(cfg, `{ shop { name currencyCode } }`);
  return d.shop;
}

export type ShopifyProduct = {
  title: string;
  productType: string;
  vendor: string;
  description: string;
  inventoryItemId: string | null;
  hsCode: string | null;
  origin: string | null;
  price: number | null;
};

// One line per product (first variant): title + type + a short description, which is what classification needs.
export async function listProducts(cfg: ShopifyConfig, first = 50): Promise<ShopifyProduct[]> {
  const d = await gql<{
    products: {
      nodes: {
        title: string;
        productType: string;
        vendor: string;
        description: string;
        variants: { nodes: { price: string; inventoryItem: { id: string; harmonizedSystemCode: string | null; countryCodeOfOrigin: string | null } | null }[] };
      }[];
    };
  }>(
    cfg,
    `query Products($first: Int!) {
      products(first: $first, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          title productType vendor description(truncateAt: 200)
          variants(first: 1) { nodes { price inventoryItem { id harmonizedSystemCode countryCodeOfOrigin } } }
        }
      }
    }`,
    { first },
  );
  return d.products.nodes.map((p) => {
    const v = p.variants.nodes[0];
    return {
      title: p.title,
      productType: p.productType,
      vendor: p.vendor,
      description: p.description,
      inventoryItemId: v?.inventoryItem?.id ?? null,
      hsCode: v?.inventoryItem?.harmonizedSystemCode ?? null,
      origin: v?.inventoryItem?.countryCodeOfOrigin ?? null,
      price: v ? Number(v.price) : null,
    };
  });
}

// Writes the code back: 6-digit HS code for everywhere, plus the full 10-digit UK code.
export async function writeCode(cfg: ShopifyConfig, inventoryItemId: string, code: string) {
  const d = await gql<{ inventoryItemUpdate: { inventoryItem: { id: string } | null; userErrors: { field: string[]; message: string }[] } }>(
    cfg,
    `mutation SetCode($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id }
        userErrors { field message }
      }
    }`,
    { id: inventoryItemId, input: { harmonizedSystemCode: code.slice(0, 6), countryHarmonizedSystemCodes: [{ countryCode: "GB", harmonizedSystemCode: code }] } },
  );
  const errors = d.inventoryItemUpdate.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
}

// OAuth (authorization code grant) for Precedent's own Shopify app, from the server environment.
export const SHOPIFY_SCOPES = "read_products,read_inventory,write_inventory";

export function shopifyApp(origin: string) {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret, redirectUri: `${origin}/api/shopify/callback` } : null;
}

export const validShop = (shop: string) => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);

export function shopifyAuthorizeLink(app: NonNullable<ReturnType<typeof shopifyApp>>, shop: string, state: string) {
  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", app.clientId);
  u.searchParams.set("scope", SHOPIFY_SCOPES);
  u.searchParams.set("redirect_uri", app.redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

// Shopify signs the callback's query string with the app secret; reject anything that doesn't match.
export async function verifyShopifyHmac(params: URLSearchParams, secret: string) {
  const hmac = params.get("hmac") ?? "";
  const message = [...params.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const digest = createHmac("sha256", secret).update(message).digest("hex");
  return hmac.length === digest.length && timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
}

export async function exchangeShopifyCode(app: NonNullable<ReturnType<typeof shopifyApp>>, shop: string, code: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: app.clientId, client_secret: app.clientSecret, code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Shopify token ${res.status}: ${body.error_description ?? body.error ?? res.statusText}`);
  return body.access_token as string;
}

// Each client's store is saved as its own Credential.
export const shopifyKey = (clientId: number) => `shopify:${clientId}`;
