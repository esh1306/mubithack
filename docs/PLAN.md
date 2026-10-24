# Precedent: hackathon plan

Solo, overnight (~12h), running on a laptop. Built to demo, not to scale.

## Decisions made

| Area | Decision |
|---|---|
| Stack | Next.js (TypeScript), in `precedent/` |
| Storage | SQLite (one local file) |
| AI | An agent on `claude-haiku-4-5` (Mubit starter credit) with tool calls, sent through Mubit's Anthropic proxy (`https://api.mubit.ai/anthropic`) |
| Agent tools | `search_precedents`, `search_tariff`, `get_commodity`, `ask_client` |
| Tariff data | A seed file pulled from the UK Trade Tariff API first. The live API gets hooked up later. |
| Codes in UI | All 10 digits, first 4 in bold |
| Brokers | Two made-up firms: Harbourline Customs and Northgate Freight |
| Demo items | Picked from `tricky-items.md` after testing them through Sonnet |
| Retro-scan data | A generated sample CSV of past entries |
| Look | Minimal, YC-style UI |
| DB access | Prisma |
| UI kit | Tailwind + shadcn/ui |
| Agent loop | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`, baseURL `https://api.mubit.ai/anthropic/v1`) |
| Live updates | Stream results per line over SSE |
| Package manager | bun. Scripts run on Node via `bun run script scripts/<name>.mts`, because better-sqlite3 doesn't load in Bun. |
| Fonts / colours | Instrument Sans + JetBrains Mono, shadcn Stone base, blue accent |
| In scope | Classify + fix + flip, learning rail, retro-scan, CSV export |
| Parked | Serving a Mubit adapter (not addressable as a model ID) |

## How Mubit fits (from docs.mubit.ai)
- We change only the client: `baseURL` becomes Mubit's and `apiKey` becomes `MUBIT_API_KEY`. The Anthropic key is added in the Mubit console under Provider keys.
- Mubit groups calls into one task by **system prompt + model + tools + output format**. So the system prompt and the four tool definitions stay fixed. The firm's name in the system prompt makes each broker a separate task, and so a separate adapter.
- Anything that changes per call (the product line, the broker's fixes) goes in messages or comes back through tool results, never the system prompt.
- Calls go from the server only (Mubit doesn't allow browser calls). Each response's `x-middleware-request-id` is stored on the receipt.

## The flow
1. Upload a CSV or load the sample invoice → lines saved to SQLite.
2. For each line the agent runs: it looks at the broker's precedents, searches the tariff, checks the commodity, and returns `{code, reason, confidence, precedent_used, question}`.
3. A review table shows code, reason, confidence and a flag. Unflagged lines are approved in bulk.
4. To fix a line: pick a code from tariff search, add a reason → saved as a precedent for that broker.
5. The learning rail shows the fix saved, then the never-seen items re-run for both brokers.
6. The never-seen panel: items flip for the broker who made the fix and stay the same for the other.
7. Receipt per code: the precedent used, the broker's reason, the model and the Mubit request ID.
8. Retro-scan: past entries are re-checked, over- or underpaid duty is estimated, and the result is a short claim or disclosure summary.
9. Export: a CSV of the codes.

## SQLite tables
`brokers`, `lines`, `suggestions`, `precedents`, `receipts`, `tariff` (the seed), `past_entries`, `retro_findings`

## Order of work
1. Scaffold the app, SQLite, the Mubit client, and one test call visible in Mubit Requests
2. Tariff seed script, then test the tricky items through Sonnet → choose the demo items
3. The agent with its 4 tools + the classify endpoint
4. Upload + review table + receipts
5. Fix flow + precedents + never-seen panel + learning rail
6. Retro-scan + CSV export
7. UI polish, demo reset, a full run-through

## Still to decide (asked before building)
See the questions in chat.
