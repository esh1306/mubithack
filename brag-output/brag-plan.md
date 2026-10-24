# /brag plan: Precedent (polished, 1920×1080, 30fps, ~20.2s)

## What it is
An AI that picks UK customs commodity codes for customs brokers and learns from the broker's own corrections: one fix, and products it has never seen come back right. Each broker gets its own model through Mubit, and every code has a receipt.

- **Who:** classification teams at small UK customs brokers.
- **Different:** it learns from *your* fixes in minutes. The fix stays private to the broker. It also finds duty already overpaid or underpaid.
- **Most impressive claim (from the project's own deck):** £418m in surprise duty bills from HMRC in a year.
- **Visual hook:** the £418m figure, set huge in Instrument Serif on warm paper.
- **Real flow:** Inbox → the bamboo set is coded as real bamboo, 4419 → the broker fixes it to plastic, 3924 10 00 19, with a reason → never-seen bamboo cups and baby bowl flip, chopsticks stay, the other broker is unchanged → retro-scan finds money.
- **Share caption:** "Teach it once. It remembers."

## Angle
Calm confidence. One costly mistake, fixed once, never made again. Polished: long holds, soft fades, nothing extra on screen.

## Visual identity (from the app)
- **Colours:** paper `oklch(0.972 0.008 85)`, card `oklch(0.993 0.004 85)`, ink `oklch(0.22 0.012 65)`, muted `oklch(0.47 0.014 65)`, deep blue `oklch(0.43 0.14 258)`, status dots good / warn / bad.
- **Fonts:** Instrument Serif (headlines), Instrument Sans (UI), JetBrains Mono (codes, first 4 digits bold).
- **UI:** soft shadow cards, review queue rows, the learning panel's before → after column, retro-scan totals.

## Music
"Happy Beats / Business Moves Vol. 12", Sascha Ende (CC BY 4.0), ~110 BPM, beat ≈ 0.5457s, grid from 0.56s. It plays from the top, every cut lands on a beat, and it fades out over the last ~1.1s. Two soft interface clicks (on the simulated click and the flip) sit on beats, mixed low.

## Storyboard (cuts on beats b(n) = 0.56 + 0.5457n)

| # | Time | Beat | Scene | On screen |
|---|---|---|---|---|
| 1 | 0.00–3.29 | → b5 | **Hook** | "£418m" rises in huge serif, then "in surprise duty bills from HMRC last year." Small source line: "Menzies FOI to HMRC, year to March 2026". |
| 2 | 3.29–6.56 | b5→b11 | **Reveal** | The "Precedent" wordmark, then "Customs codes that learn from your own corrections." |
| 3 | 6.56–10.93 | b11→b19 | **Fix it once** | Inbox card for Sunrise Homeware Ltd. Rows land one by one. The bamboo dinner set row shows **4419 19 00 00**, flagged. A cursor clicks it and a fix chip appears: **3924 10 00 19**, "Bamboo fibre in melamine resin: plastic, not wood." Caption: "Fix it once. Say why." |
| 4 | 10.93–15.29 | b19→b27 | **It remembers** | Learning panel, "Never-seen products": bamboo cups 4419 → 3924, baby bowl 4419 → 3924 ("learned from #1"), chopsticks stay 4419 12. Northgate column unchanged. Caption: "Products it has never seen come back right." |
| 5 | 15.29–17.48 | b27→b31 | **Money** | Retro-scan totals count up: "£384 to reclaim" and "£1,130 to disclose". Caption: "It finds the money already lost." |
| 6 | 17.48–20.21 | b31→b36 | **Outro** | "Precedent." Then "Teach it once. It remembers." and a small line: "Each broker's own model, built on Mubit." |

Transitions: old content fades and lifts out, then the new content fades in; no crossfades between busy layouts.

## Data note
The broker, client and product names are the app's fictional demo data. The codes are real UK Trade Tariff codes. The retro-scan totals are the app's current demo figures. No secrets, keys or personal data appear.
