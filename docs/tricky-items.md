# Tricky items: candidates for the demo

Every code here is from general tariff knowledge, at 4–6 digits. **Each one must be checked against the UK Trade Tariff API** before it goes in the seed file, and run through Sonnet 5.5 to see which ones it actually gets wrong.

Two kinds of trap:
- **House knowledge:** the invoice leaves out the deciding fact, and the broker knows it from this client. No model can know it, so it's the best "learns from *my* fixes" story, and Broker B shouldn't learn it.
- **Rule trap:** the facts are on the invoice, but the tariff's notes or interpretation rules send it somewhere unexpected. Models often follow the obvious word instead.

| # | Invoice text | Obvious (wrong) | Correct | What decides it | Kind |
|---|---|---|---|---|---|
| 1 | Silicone baking mat, non-stick | 4016 rubber | 3924 plastic kitchenware | Ch. 39 note: silicones are plastics | Rule |
| 2 | Silicone spatula / lunch box / ice tray | 4016 | 3924 | Same rule (the never-seen set) | Rule |
| 3 | Men's cotton shirt | 6205 woven | 6105 knitted | Knit vs woven is never on the invoice. The broker knows this client's shirts are knitted. | House |
| 4 | Women's top, 60% cotton 40% poly | 6106/6206 by fibre guess | Depends on knit and the dominant fibre by weight | Composition by weight | House |
| 5 | Smartwatch with heart-rate sensor | 9102 wristwatch | 8517 62 data device | Classed as a communication device, not a watch | Rule |
| 6 | Running shoes | 6402 rubber/plastic | 6404 textile upper | Upper material and outer sole decide it | House |
| 7 | Gift set: mug + chocolates | Split into two codes | One code by essential character (GRI 3(b)) | Retail set rule | Rule |
| 8 | Mattress overlay, foam, pressure-relief | 9021 orthopaedic (0%) | 3926 other plastic articles (6%) | Real UK tribunal case; a post-clearance demand of over £100k | Rule |
| 9 | LED bulb, E27 | 9405 lamp | 8539 52 LED lamps | A bulb is not a luminaire | Rule |
| 10 | Christmas tree LED string lights | 9505 festive articles | 9405 31 lighting strings | HS2022 moved them to lighting | Rule |
| 11 | Camera drone, 249g | 8525 camera | 8806 unmanned aircraft | HS2022 heading for drones | Rule |
| 12 | Disposable vape device | 8543 70 other electrical | 8543 40 e-cigarettes | HS2022 subheading | Rule |
| 13 | Electric blanket | 8516 electric heating | 6301 10 electric blankets | Named in chapter 63 | Rule |
| 14 | Bicycle helmet | 9506 sports equipment | 6506 10 safety headgear | Headgear heading wins | Rule |
| 15 | "Bamboo" kids' tableware set | 4419 wooden tableware | 3924 plastics (melamine with bamboo filler) | The material is really melamine resin | House |
| 16 | Vegan leather handbag (PU) | 4202 21 leather surface | 4202 22 plastic sheeting surface | Material of the outer surface | Rule |
| 17 | Children's dress-up costume | 9505 festive articles | Ch. 61/62 garments | EU case law: wearable costumes are garments | Rule |
| 18 | Whey protein powder, flavoured | 0404 whey | 2106 food preparations | Added flavourings and other ingredients | Rule |
| 19 | Yoga mat | 4016 rubber | 3921 plastic foam (or 4016 if real rubber) | Material: PVC/TPE vs natural rubber | House |
| 20 | Wireless earbuds | 8517 62 | 8518 30 headphones | Headphone heading vs comms device; check the UK tariff | Rule |
| 21 | Phone case | 4202 cases | 3926 plastics / by material | Protective covers vs carrying cases; check the UK tariff | Rule |
| 22 | Air fryer | 8516 79 other | 8516 60 ovens/cookers | Check UK and EU classification guidance | Rule |
| 23 | Neoprene laptop sleeve | 4016 rubber | 4202 cases, by outer surface | Container heading beats material | Rule |
| 24 | Car phone holder, plastic | 8708 vehicle parts | 3926 / 8302 | Not a vehicle part under section notes | Rule |

## The demo mix I'd suggest testing first
- **Hero fix (house knowledge):** #3. "This client's shirts are knitted" is a fact only the broker has, and it shows Broker B *not* learning it.
- **Hero fix (rule):** #1 or #15, if Sonnet gets them wrong.
- **Never-seen set:** items like the hero, plus 1–2 that shouldn't change.
- **Retro-scan:** #8 is the most persuasive because of the real £ demand.

## Why precedents should work (evidence)
HSCodeComp (arXiv 2510.19631): the best agents score 46.8% against 95% for human experts on 10-digit codes. Few-shot precedent cases improved every model tested. That backs the core claim that a broker's own fixes make the AI better.
