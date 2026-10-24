# Precedent

**Teach the AI once. It never makes that mistake again.**

Customs-code suggestions for UK brokers. An agent picks a 10-digit UK Trade Tariff code for each invoice line and shows its reasoning and a receipt. When a broker corrects a code and gives a reason, the fix becomes a precedent: similar products the AI has never seen come back right, and other brokers are unaffected. Every model call goes through [Mubit](https://docs.mubit.ai), which groups each broker's calls into its own task and trains a small adapter on them.

Built for the Mubit × Night Shift hackathon, London.

## What's in it

- **Classify:** upload a CSV, paste lines or load the sample invoice. Results stream in line by line, each with a code, reason, confidence and receipt (tool steps, duty rate, Mubit request IDs).
- **Fix → learn:** correct a code with a reason. The learning panel re-runs similar lines and never-seen products for this broker and for the other broker.
- **Precedents:** every fix, with its reason and how often it has been followed.
- **Retro-scan:** re-check 3 years of past entries with today's precedents. It shows duty to reclaim or to disclose, and drafts a claim or disclosure pack.
- **Export:** a CSV with the code split into DE 6/14 and DE 6/15, ready for declaration software.

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
bun run dev                   # http://localhost:3000
```

Scripts run on Node through `bun run script scripts/<name>.mts`, because better-sqlite3 doesn't load under Bun:

- `ping-mubit.mts`: one test call through Mubit
- `pull-tariff.mts`: re-pull the tariff seed from the UK Trade Tariff API
- `test-tricky.mts`: run the 24 tricky items in `docs/tricky-items.md` through the agent

## Mubit notes

- Calls go to `https://api.mubit.ai/anthropic/v1` with a Mubit key, from the server only.
- A task is *system prompt + model + tools + output format*. Only the broker's name varies in the system prompt, so each broker gets its own task and adapter. Changing the prompt, the tools or the model starts a new task.
- Haiku 4.5 runs on Mubit's starter credit only when no Anthropic key is saved under Provider keys.

See `docs/PLAN.md` for the decisions behind the build.
