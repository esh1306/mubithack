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
