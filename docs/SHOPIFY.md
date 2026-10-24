# Shopify: live store and CSV fallback

Precedent can pull a client catalogue and write approved 10-digit UK codes back. Two ways in:

1. **OAuth** — Precedent's Partner app, client clicks Connect.
2. **Custom-app token** — a store Admin API token pasted by the broker.
3. **CSV export** — no credentials. Import a Shopify **Products** CSV so the demo still runs.

Writing codes back needs a connected store (OAuth or token). CSV import is classify-only.

## What the app does

- **Read:** Admin GraphQL `products` (title, type, vendor, description, first variant price, inventory item id, existing HS code, origin).
- **Write:** `inventoryItemUpdate` — 6-digit `harmonizedSystemCode` plus `countryHarmonizedSystemCodes` for **GB** with the full 10-digit code.
- **Scopes:** `read_products`, `read_inventory`, `write_inventory`.
- **API version:** `2026-10`.

## Env

In `.env.local` (never commit):

```
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
```

If either is empty, the UI says so and offers the token field plus CSV import. It will not pretend the app is connected.

## Partner dashboard (dev store on localhost)

1. [partners.shopify.com](https://partners.shopify.com) → **Apps** → **Create app** → create an app (custom / Dev Dashboard).
2. App setup → **Client ID** and **Client secret** → paste into `.env.local`.
3. **Allowed redirection URL(s)** — exactly:

   ```
   http://localhost:3000/api/shopify/callback
   ```

   For a deployed origin, add `https://<host>/api/shopify/callback` too.
4. App URL can be `http://localhost:3000`.
5. Request the three scopes above (`read_products`, `read_inventory`, `write_inventory`).
6. Create a **development store** (or use an existing one).
7. Restart `bun run dev`. Open **Clients**, add a client, enter `your-store.myshopify.com`, **Connect with Shopify**, approve the app on the store.

Callback HMAC is checked against the app secret. State is one-shot; if you see “Sign-in expired”, click Connect again.

## Custom-app token (no Partner app)

On the store: **Settings → Apps and sales channels → Develop apps → Create an app**. Configure Admin API scopes as above, install, copy the Admin API access token (`shpat_…`). Paste shop + token on the client card.

## CSV fallback (no store)

On the client card or Integrations: **Import Shopify product CSV**. Export from Admin → Products → Export (CSV). Precedent uses the first variant row per product (`Title` present). Columns it looks for: Title, Type, Vendor, Body (HTML), Variant Price, Harmonized System Code / HS Code, Country of Origin.

A sample file is at `data/samples/shopify-products.csv` and `/api/sample/shopify-csv`.

CSV lines are tagged `shopify-csv`. They will not be pushed back to a store.

## Honesty

- Missing env is a setup message, not a green “connected”.
- Push failures surface the Shopify error (scope, invalid inventory id, HMAC, etc.).
- We do not claim Shopify endorses Precedent.
