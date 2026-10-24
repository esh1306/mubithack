# Precedent

**Teach the AI once. It never makes that mistake again.**

Customs-code suggestions for UK brokers. An agent picks a 10-digit UK Trade Tariff code for each invoice line and shows its reasoning and a receipt. When a broker corrects a code and gives a reason, the fix becomes a precedent and ~20 paraphrases are sent through [Mubit](https://docs.mubit.ai) on that broker's task. Similar products the AI has never seen come back right, and other brokers are unaffected. Mubit can train an adapter after enough kept examples (default 25); this app counts what it sent and does not serve an adapter.

Built for the Mubit × Night Shift hackathon, London.

## What's in it

- **Classify:** upload a CSV, paste lines or load the sample invoice. Results stream in line by line, each with a code, reason, confidence and receipt (tool steps, duty rate, Mubit request IDs).
- **Fix → learn:** correct a code with a reason. The learning panel re-runs similar lines and never-seen products for this broker and for the other broker.
- **Precedents:** every fix, with its reason and how often it has been followed.
- **Retro-scan:** re-check 3 years of past entries with today's precedents. It shows duty to reclaim or to disclose, and drafts a claim or disclosure pack.
- **Export:** a CSV with the code split into DE 6/14 and DE 6/15, ready for declaration software.

## Integrations

All on the **Integrations** page:

- **UK Trade Tariff (live):** HMRC's public API. Headings missing from the local seed are fetched live (codes, chapter notes, duty) and kept.
- **Shopify (Admin GraphQL API 2026-10):** connect with a custom-app token (`read_products`, `read_inventory`, `write_inventory`), import products as invoice lines along with their existing HS code, and push approved codes back (6-digit HS code plus the 10-digit GB code).
- **Excel / CSV invoices:** upload a supplier's `.xlsx` commercial invoice. Header and column detection is automatic, and totals rows are skipped.
- **HMRC Customs Declarations API (sandbox):** OAuth 2.0 sign-in (`write:customs-declaration`), then submit a classified invoice as a WCO DEC-DMS H1 import declaration. Register an app on the HMRC Developer Hub, subscribe it to Customs Declarations, add the redirect URI shown in the app, and sign in with a test user that has `customs-services`.
- **Declaration software:** a CSV export with DE 6/14 and DE 6/15, plus an audit log.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma 7 + SQLite · Vercel AI SDK with `claude-haiku-4-5` through Mubit's Anthropic proxy.

The agent's tools are `search_precedents`, `search_tariff`, `get_commodity` and `ask_client`. The tariff comes from a seed pulled from the UK Trade Tariff API: 970 codes with duty rates and chapter notes.

## Run it

```bash
bun install
cp .env.example .env          # DATABASE_URL
cp .env.example .env.local    # MUBIT_API_KEY (from app.mubit.ai)
bunx prisma migrate dev       # creates dev.db
bun run seed                  # brokers, tariff, past entries
bun run dev                   # http://localhost:3000 (development)
bun run demo                  # production build + start, for demos
```

Scripts run on Node through `bun run script scripts/<name>.mts`, because better-sqlite3 doesn't load under Bun:

- `ping-mubit.mts`: one test call through Mubit
- `pull-tariff.mts`: re-pull the tariff seed from the UK Trade Tariff API
- `test-tricky.mts`: run the 24 tricky items in `docs/tricky-items.md` through the agent
- `warm-up.mts [broker]`: send all 60 sample lines through a broker's Mubit task
- `smoke.mts`: no-key checks for search (bamboo → 3924100019), duty maths, variants and the Mubit missing-key wording

Sample invoices live in `data/samples/`: 6 suppliers, 10 lines each, all selectable from **Load sample invoice ▾** in the app.

## Mubit notes

- Calls go to `https://api.mubit.ai/anthropic/v1` with a Mubit key, from the server only.
- A task is *system prompt + model + tools + output format*. Only the broker's name varies in the system prompt, so each broker gets its own task and adapter. Changing the prompt, the tools or the model starts a new task.
- Haiku 4.5 runs on Mubit's starter credit only when no Anthropic key is saved under Provider keys.

See `docs/PLAN.md` for the decisions behind the build.
