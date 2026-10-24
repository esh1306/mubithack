// bun run script scripts/test-tricky.mts — runs the tricky items through the agent (no precedents) and
// reports which ones it gets wrong. Those are the candidates for the demo.
// Expected codes are 4-digit headings from ../tricky-items.md (to be confirmed against the tariff).
import { classifyLine } from "../lib/agent";

const ITEMS: { text: string; expect: string; obvious: string }[] = [
  { text: "Silicone baking mat, non-stick, 40x30cm", expect: "3924", obvious: "4016" },
  { text: "Silicone spatula set, heat resistant", expect: "3924", obvious: "4016" },
  { text: "Men's cotton shirt, long sleeve", expect: "6105", obvious: "6205" },
  { text: "Women's top, 60% cotton 40% polyester", expect: "6106", obvious: "6206" },
  { text: "Smartwatch with heart-rate sensor and bluetooth", expect: "8517", obvious: "9102" },
  { text: "Running shoes, men's, size 9", expect: "6404", obvious: "6402" },
  { text: "Gift set: ceramic mug with milk chocolates", expect: "6912", obvious: "1806" },
  { text: "Mattress overlay, foam, pressure relief", expect: "3926", obvious: "9021" },
  { text: "LED bulb, E27, 9W", expect: "8539", obvious: "9405" },
  { text: "Christmas tree LED string lights, 100 bulbs", expect: "9405", obvious: "9505" },
  { text: "Camera drone, 249g, 4K", expect: "8806", obvious: "8525" },
  { text: "Disposable vape device, 600 puffs", expect: "8543", obvious: "8543" },
  { text: "Electric blanket, double", expect: "6301", obvious: "8516" },
  { text: "Bicycle helmet, adult", expect: "6506", obvious: "9506" },
  { text: "Bamboo kids' dinner set, plate bowl cup", expect: "3924", obvious: "4419" },
  { text: "Vegan leather handbag, PU", expect: "4202", obvious: "4202" },
  { text: "Children's dinosaur dress-up costume", expect: "6104", obvious: "9505" },
  { text: "Whey protein powder, chocolate flavour, 1kg", expect: "2106", obvious: "0404" },
  { text: "Yoga mat, 6mm, non-slip", expect: "3921", obvious: "4016" },
  { text: "Wireless earbuds with charging case", expect: "8518", obvious: "8517" },
  { text: "Phone case, iPhone 16, clear", expect: "3926", obvious: "4202" },
  { text: "Air fryer, 5.5L, digital", expect: "8516", obvious: "8516" },
  { text: "Neoprene laptop sleeve, 14 inch", expect: "4202", obvious: "4016" },
  { text: "Car phone holder, dashboard mount, plastic", expect: "3926", obvious: "8708" },
];

const broker = process.argv[2] ?? "harbourline";
let wrong = 0;
for (const item of ITEMS) {
  try {
    const r = await classifyLine(broker, item.text);
    const ok = r.code.startsWith(item.expect);
    if (!ok) wrong++;
    console.log(
      `${ok ? "ok   " : "WRONG"} ${r.code} (want ${item.expect}) conf=${r.confidence.toFixed(2)} ${r.flagged ? "flagged" : ""} | ${item.text}\n      ${r.reason}${r.question ? `\n      Q: ${r.question}` : ""}`,
    );
  } catch (e) {
    console.log("ERROR", item.text, (e as Error).message);
  }
}
console.log(`\n${wrong} / ${ITEMS.length} not matching the expected heading`);
