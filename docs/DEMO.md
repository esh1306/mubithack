# Precedent: 3-minute live demo

Judges score Mubit use, usefulness, technical execution and the demo equally. This script matches the UI on the guided path (`Play the 3-minute demo`).

## Before you go on

1. On the live Mubit deploy (or `bun run demo` locally), open an incognito window.
2. Sidebar → **Reset demo** (click twice). You land on Home with a clean seeded desk. Never-seen “before” results stay; invoices, fixes and retro findings go.
3. Confirm Home shows the four tiles (zeros are fine) and the sidebar **Mubit learning** pill (`N/25`, last request id, Recording or Offline / no key). Do not claim an adapter is live.
4. Have this reason ready only if the house reason is not pre-filled:

   `This supplier's "bamboo" tableware is bamboo fibre bound with melamine resin, so it's kitchenware of plastics (ch. 39), not wood.`

## 0:00–0:20 · The problem (Home)

Click **Play the 3-minute demo**.

> “Every product into the UK needs a 10-digit code. Brokers pick them by hand, they get it wrong, and the bill arrives months later. Generic AI gets about half of them right. Precedent learns from the broker’s own fix — and we send that lesson through Mubit.”

## 0:20–0:50 · Classify (Inbox)

The guide says **Step 1 · Classify**. A progress bar ticks as the eight Ningbo lines land. The **bamboo kids’ dinner set** is pinned and highlighted — it is not hidden behind Needs review.

Open that receipt if you want a beat: precedents, tariff, chapter notes, Mubit request IDs.

> “It coded the dinner set as wood — 4419, zero duty. That is the expensive mistake.”

## 0:50–1:30 · The fix

Guide: **Step 2 · Fix the bamboo line**. Click the code (or F). The house code **3924 10 00 11** is already picked, with the house reason. **Save fix and teach.**

> “One correction, in their own words.”

## 1:30–2:15 · It remembers (Learning)

The panel slides in. Same screen, unmissable:

- **Before your fix: 4419… at 0%**
- **After: 3924 10 00 11 at 6% — because of Precedent #N**

Never-seen **bamboo cups / lunch box / baby bowl** flip to 3924 (`learned from #N`). Chopsticks and the chopping board stay wood. Northgate’s column does not move.

The **Teaching Mubit** rail lists ~20 paraphrases with request IDs and **N of 25 examples toward train**. If this machine has no key, it says so — do not invent IDs.

> “The next similar line this broker has never seen comes back right from the stored precedent — before any adapter trains. The paraphrases are real classify calls on Harbourline’s Mubit task.”

## 2:15–2:35 · Receipt, then retro-scan

Guide: **Step 4**. Click the fixed bamboo line. Time, the precedent in their words, Mubit IDs.

Guide: **Step 5 · Open retro-scan**. **Scan past entries**. Bamboo in the last 3 years is **disclose** (0% → 6%), not reclaim. £0 rows are not findings. Open the **Disclosure pack**.

> “The same fix finds duty already underpaid. Voluntary disclosure avoids the penalty.”

## 2:35–3:00 · Close

Integrations if you have ten seconds: live tariff, Excel, Shopify (setup message if no `SHOPIFY_CLIENT_ID`, else Off if none connected — never a green “0 connected”), HMRC sandbox. CSV product import works without a store (`docs/SHOPIFY.md`).

> “Teach it once. It remembers. Each broker has its own precedents and its own Mubit task. We count examples we sent. Mubit’s console is the source of truth for training. We’re looking for pilot brokers.”

## If something goes wrong

- **A line fails:** Retry. The screen keeps moving; the progress bar does not freeze.
- **Mubit is slow:** Talk through the receipt and the before/after. Lines and paraphrases stream in.
- **The flip is slow:** The stored precedent is applied as a follow-up suggestion (`model: precedent`) so the never-seen line still comes back right. The original model answer is what Mubit recorded.
- **No Mubit key:** Classify will error honestly. Reset, then talk retrieval + retro maths from a previous working run, or use the live deploy.
- **Asked about adapters:** “Mubit can train after about 25 kept examples. Tonight you are seeing the precedent in the prompt and the examples we sent. This app does not serve an adapter.”

## Be accurate on stage

- Model is Claude Haiku 4.5 through Mubit’s proxy.
- This app does not observe keep / train / test / live, and does not serve an adapter.
- Codes are suggestions. The broker approves every one.
- Duty uses the third-country rate on the import date when HMRC has it; otherwise today’s rate and we say so.
- Bamboo 0% → 6% is **disclose**, not reclaim.
- HMRC submit is the **sandbox**.
