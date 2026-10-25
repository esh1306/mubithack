# Precedent

**Teach a commodity code once. Prue remembers it, for your firm only.**

UK customs brokers have to give every line on an importer's invoice a 10-digit UK Trade Tariff commodity code. The work is done by hand, and a wrong code is a legal problem for the broker: duty is overpaid or underpaid, HMRC can send a demand, and the broker shares liability as the importer's indirect representative. Precedent is a desk where an AI agent, Prue, codes each line against HMRC's live tariff and shows its working. A broker signs off each line or corrects it, and every correction becomes a precedent that the firm's later invoices follow.

It's for customs brokers and freight forwarders filing UK import declarations. Our working estimate is that coding a line by hand takes about 6 minutes and reviewing Prue's suggestion about 1 (`lib/savings.ts`). On a 40-line invoice that's roughly 4 hours down to 40 minutes. These are estimates, not measured figures.

Built for the Mubit × Night Shift hackathon, London.

## The demo video

`precedent-launch-A.mp4` (1:55). The video runs against the real app and makes a real HMRC sandbox submission. Waiting is sped up, at most 6×.

1. **Landing:** "One wrong code. Overpaid duty." This is Precedent.
2. **Desk home:** what Prue has saved the firm (time, £, lines coded), and how she's learning the firm.
3. **Ask Prue:** click the mascot, ask a question, and she answers with the tariff lookups she made.
4. **The tour:** Sunrise Homeware sends a six-line invoice, shipped from Ningbo and Dhaka.
5. **Checking every line with HMRC:** each line goes to the UK Trade Tariff (classification search, chapter notes, commodity lookup), and every code comes with a reason and a source.
6. **A correction:** the bamboo kids' dinner set is bound with melamine resin, so it's chapter 39 plastics at 6% duty, not bamboo at 0%. The broker corrects it and says why.
7. **Precedent and Mubit:** the fix becomes a precedent. About 20 paraphrases are sent through the firm's Mubit task, each with its own request ID. Products the firm has never coded now get the corrected code. Another firm on Precedent doesn't, because the correction belongs to the firm that made it.
8. **Declare:** the broker approves the other five lines and Precedent drafts an H1 import declaration. It's submitted straight to HMRC's CDS sandbox, which returns **HTTP 202 Accepted**.
9. **Look back 3 years:** past imports are re-checked at the duty rate in force on each date. That finds £655.27 of duty to disclose before HMRC finds it, and £597.39 to reclaim.
10. **Learning:** every agent call runs through the firm's own Mubit task. The app's counter showed 45 recorded examples at the time.

## How we use Mubit

**Every LLM call goes through Mubit.** The app has one model provider, `lib/mubit.ts`: the Vercel AI SDK's Anthropic client pointed at Mubit's proxy (`https://api.mubit.ai/anthropic/v1`) with `MUBIT_API_KEY`. The model is **`claude-haiku-4-5`**. Calls are made from the server only.

**One Mubit task per firm.** Mubit groups calls into a task by system prompt, model, tools and output format. The classifier's system prompt (`lib/agent.ts`) and its tool definitions are fixed, and only the firm's name changes. So each broker firm gets its own Mubit task, with its own examples and its own adapter. Harbourline's corrections never become Northgate's training data.

**Which calls Mubit records:**

| Call | Where | Recorded by Mubit? |
|---|---|---|
| Classify a line (agent using tools) | `lib/agent.ts` | Yes: this is the firm's task |
| Classify the paraphrases of a correction | `lib/run.ts` → `teachVariants` | Yes: same task |
| Write the paraphrases | `lib/variants.ts` | No (`x-middleware-record: off`) |
| Read a PDF or image invoice | `lib/invoice-file.ts` | No |
| Ask Prue chat | `app/api/prue-chat/route.ts` | No |
| Rewrite helper | `lib/rewrite.ts` | No |

Helper calls opt out of recording, so only real classification work ends up in a firm's training set.

**What happens when a broker corrects a code:**
1. The correction and its reason are saved **in our app** as a `Precedent` row in SQLite. The correction itself isn't sent to Mubit as a label.
2. **Straight away:** on every later line, the agent's first tool call is `search_precedents`. When a precedent applies, the agent follows it and names it. This is how the very next invoice changes, before any training.
3. **For Mubit:** Precedent writes about 20 paraphrases of the corrected line (`VARIANT_COUNT = 20`) and runs each one through the firm's normal classify task. The agent finds the precedent and answers with the corrected code. Mubit records each of those runs as an example, and we store their request IDs (`x-middleware-request-id`) on each suggestion.
4. Once a task has 25 kept examples (`TRAIN_AFTER`), Mubit trains a small adapter on it and tests it against Claude's answers. Mubit only routes traffic to an adapter after it passes those tests.

**Numbers from the Mubit console, last 7 days (25 October 2026):**
- **Requests:** 1,398 through Mubit, with 0 errors and a median response of 1.96 s.
- **Classifier tasks:** Mubit found five "Commodity-code classifier" tasks, all agents making tool calls. There's one task per firm, plus new ones whenever we changed the classifier's prompt or tools during the build. Each change starts a new task, as described above.

  | Task | Calls | Kept examples | Status |
  |---|---|---|---|
  | Commodity-code classifier 2 | 889 | 81 | Adapter testing, v1 |
  | Commodity-code classifier 4 | 255 | 20 of 25 | Reviewing examples |
  | Commodity-code classifier | 153 | 54 | Adapter testing, v2 |
  | Commodity-code classifier 3 | 66 | 36 | Adapter testing, v1 |
  | Commodity-code classifier 5 | 14 | 0 of 25 | Reviewing examples |

- **Adapters trained:** three, all on Qwen3-4B-Instruct-2507. **None has passed its tests yet**, so none is serving.

  | Adapter | Matched Claude's answers | Test cases | Target |
  |---|---|---|---|
  | Classifier 3, v1 | 64.3% | 14 | 85% |
  | Classifier 2, v1 | 57.1% | 14 | 77.9% |
  | Classifier, v2 | 27.8% | 18 | 95% |

- **Routing:** 0% of requests have been routed to an adapter. Every answer in the app and in the video comes from `claude-haiku-4-5` through Mubit's proxy. The learning you see in the demo comes from the precedent loop in steps 1–3, not from an adapter.

**Numbers inside the app:**
- **App database:** the app counts recorded classify calls in its own database: 142 for Harbourline and 14 for Northgate today. The video's "45 examples" is that counter at the time of recording. The Mubit console above is the source of truth.
- **The landing page's "20 of 25" counter** is a scripted animation that explains the idea. It doesn't show live data. The counters in the tour and on the Learning page come from the app's database.

## How it works

- **Classify:** upload an invoice (Excel, CSV, PDF or image), or use a sample. Prue runs per line with tools: `search_precedents`, `hmrc_classification_search`, `read_chapter_notes`, `lookup_commodity` and `ask_client`. She applies HMRC's General Interpretative Rules. Results stream line by line, each with a code, a reason, the rule applied, a confidence and the sources checked.
- **Fix → precedent:** correct a code with a reason, and it applies to similar products for that firm only.
- **Declare:** signed-off lines become an H1 import declaration (WCO DEC-DMS). Preview it, then submit it to HMRC's CDS sandbox or download a CSV.
- **Retro-scan:** re-check 3 years of past entries using today's codes, at historic duty rates. It drafts a reclaim or disclosure pack.
- **Prue:** a draggable mascot that opens a chat. She answers with the same read-only tariff tools and shows each step she took. Drop an invoice on the chat to get its codes back.

| Integration | Status |
|---|---|
| UK Trade Tariff API (HMRC, public) | **Working.** Live search, chapter notes, duty and VAT. A local cache of 1,044 codes is the fallback. |
| HMRC Customs Declarations API (sandbox) | **Working.** OAuth with an HMRC test user. Submitting an H1 declaration returned **202 Accepted** with a conversation ID. Sandbox only. |
| Mubit | **Working.** All model calls, with one task per firm and recorded examples. **Partial:** three adapters are trained but none has passed its tests, so none is serving. |
| Excel / CSV invoice import | **Working.** Columns are detected automatically and totals rows are skipped. |
| PDF / image / text invoices | **Working.** The model reads the lines (not recorded). |
| CSV export for declaration software | **Working.** The code is split into DE 6/14 and 6/15, with an audit log. Live push to ASM, CargoWise or Descartes is **not done**. |
| Shopify | **Partial.** Product CSV import works. Admin API OAuth (import the catalogue, write codes back) is built but wasn't shown in the demo. |

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind and shadcn/ui, Prisma 7 with SQLite, and the Vercel AI SDK.

## Run it

Needs [Bun](https://bun.sh) and Node 20+.

```bash
bun install
cp .env.example .env.local   # then fill in the keys below
cp .env.example .env         # DATABASE_URL for Prisma
bunx prisma migrate dev      # creates dev.db
bun run seed                 # firms, tariff cache, chapter notes, past entries
bun run dev                  # http://localhost:3000
```

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | SQLite, `file:./dev.db` |
| `MUBIT_API_KEY` | All model calls (from app.mubit.ai). Without it, Classify falls back to HMRC's search alone. |
| `HMRC_CLIENT_ID`, `HMRC_CLIENT_SECRET` | Optional. CDS sandbox submission; see `docs/HMRC.md`. Register the redirect URI for `http://localhost:3000`. |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | Optional. Shopify OAuth; see `docs/SHOPIFY.md`. |

**Demo data:**
- **Firms:** two seeded broker firms, `harbourline` and `northgate`.
- **Tour:** `/harbourline/tour` uses the Sunrise Homeware invoice, which includes the bamboo kids' dinner set.
- **Samples:** sample invoices are in `data/samples/`, including `pearl-river-commercial-invoice.xlsx` and a Shopify product CSV.
- **Retro-scan:** the 40 past entries it re-checks are seeded demo data.
- **HMRC test user:** you create one in the HMRC Developer Hub sandbox; none is checked in.

## Fresh code and open source

All code was written during the hackathon, starting 23 October 2026.

Main open-source libraries:
- **App:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui and Radix UI.
- **Model calls:** Vercel AI SDK (`ai`, `@ai-sdk/anthropic`).
- **Data:** Prisma with better-sqlite3, Zod and ExcelJS.
- **Landing page:** GSAP, three.js, globe.gl and react-globe.gl, d3-geo, topojson-client, world-atlas and Lenis.
- **UI extras:** lucide-react, cmdk and Sonner.
