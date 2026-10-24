# Precedent: demo script (about 4 minutes)

## Before you go on

1. `bun run dev` and open http://localhost:3000 in an **incognito** window, so no extensions interfere.
2. Sidebar → **Reset demo** (click twice). This clears invoices, fixes and findings, but keeps the never-seen "before" results.
3. Open **Classify → Learning** once and wait for "Preparing baseline…" to finish. The before/after panel is then instant.
4. Check the Mubit console → **Tasks**. Note the status of *Commodity-code classifier 2* (Harbourline). Mention it only if it has moved on from Reviewing.
5. Have these two reasons ready to paste:
   - Bamboo → **3924 10 00 19**: `This supplier's "bamboo" tableware is bamboo fibre bound with melamine resin, so it's kitchenware of plastics (ch. 39), not wood.`
   - Shirts → **6105 10 00 00**: `This client only ships knitted (jersey/pique) cotton shirts, so they go under 6105 knitted, not 6205 woven.`

## 1. The problem (20s)

> "Every product entering the UK needs a 10-digit code. Brokers pick them by hand, they get it wrong, and the bill arrives months later. £418m in surprise demands last year. Generic AI gets 47% right. We built an AI that learns from the broker's own fixes."

## 2. Classify (40s)

- **Load sample invoice** (Ningbo homeware). The rows stream in.
- Open a receipt: the agent searched precedents, searched the tariff, read the chapter notes, and every step went through Mubit (request IDs shown).
- Approve the easy ones: **Approve N unflagged**.

## 3. The fix (60s)

- The **bamboo kids' dinner set** came back as real bamboo, `4419 19 00 00`.
- Click the code ✎, pick **3924 10 00 19** from "the agent also considered" or search `3924`, paste the reason, and click **Save fix and teach**.
- The learning panel slides in:
  - The **cups and baby bowl** flip to 3924 ("learned from #N").
  - The **chopsticks and chopping board stay** wood. It didn't over-learn.
  - **Northgate's column doesn't change.** Each broker has its own model.

> "One fix, products it had never seen come back right, and it's private to this broker. In Mubit, that's this broker's own task, which trains a small, cheap adapter."

## 4. Retro-scan (40s)

- **Retro-scan → Scan past entries** takes about 25s.
- Show the totals: overpaid (reclaim) and underpaid (disclose). Bamboo entries are tagged **Precedent #N**, others **AI only · check**.
- Open the **Disclosure pack**.

> "The same fix finds the money already lost. Voluntary disclosure avoids the penalty."

## 5. Plugs into what brokers use (40s)

- **Integrations:**
  - **Live UK Trade Tariff**: look up `8471`. It's fetched live and saved.
  - **Excel invoice**: drop `data/samples/pearl-river-commercial-invoice.xlsx` on Classify.
  - **Shopify**, if a dev store is connected: import products, then **Push to Shopify** writes the codes back.
  - **HMRC sandbox**, if signed in: **Submit to HMRC sandbox** files it as an H1 import declaration and shows HMRC's response.
- **Export → Download CSV**, ready for ASM or CargoWise. **Audit log** is the answer when HMRC asks why.

## 6. Close (20s)

> "Teach it once. It remembers. Each broker gets its own cheap model, compiled from their own judgement through Mubit. We're looking for pilot brokers willing to let us scan their past shipments."

## If something goes wrong

- **A line fails:** click **Retry** (each line already retries up to 3 times).
- **Mubit is slow:** keep talking through the receipt, because the lines keep streaming in.
- **The flip doesn't happen:** the rule still applies the precedent when the agent repeats the corrected code. Re-run with **Learning** open.
- **Asked about adapters:** "Mubit groups each broker's calls into its own task and trains an adapter once it has enough reviewed examples. We hit their daily review limit tonight; they're raising it."

## Be accurate on stage

- The model is Claude Haiku 4.5 through Mubit's proxy. The adapter is trained by Mubit; we haven't served it in the app yet.
- Codes are suggestions: the broker approves every one. Duty figures use third-country rates from the live tariff.
- The HMRC submission goes to the **sandbox**, not live CDS.
