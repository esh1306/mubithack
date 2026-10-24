// bun run smoke — no-key checks for search, duty maths, variants and error wording.
import assert from "node:assert/strict";
import { isDemoBambooLine, prettyRate } from "../lib/demo";
import { classifyErrorMessage } from "../lib/mubit";
import { digitsOnly, isUk10, uk10 } from "../lib/codes";
import { compareDuty, formatDutyTrail, isMoneyFinding, withinThreeYears } from "../lib/duty";
import { buildIndex, diversifyByHs6, isSimilar, rankLeaves } from "../lib/retrieve";
import { searchTariff } from "../lib/tariff";
import { templateVariants } from "../lib/variants";

function dutyCase() {
  const under = compareDuty({
    entryDate: "2024-03-28",
    customsValue: 2349.78,
    dutyPaid: 0,
    declaredCode: "4419190000",
    declaredRate: "0.00%",
    suggestedCode: "3924100019",
    suggestedRate: "6.00%",
    rateAsOf: "2024-03-28",
    rateSource: "import-date",
  });
  assert.equal(under.direction, "under");
  assert.equal(under.delta, 140.99);
  assert.equal(isMoneyFinding(under), true);
  assert.match(formatDutyTrail(under), /disclose/);

  const reclaim = compareDuty({
    entryDate: "2025-01-13",
    customsValue: 1000,
    dutyPaid: 120,
    declaredCode: "6109100010",
    declaredRate: "12.00%",
    suggestedCode: "6110200000",
    suggestedRate: "0.00%",
    rateAsOf: "2025-01-13",
    rateSource: "current",
  });
  assert.equal(reclaim.direction, "over");
  assert.equal(reclaim.delta, -120);
  assert.equal(isMoneyFinding(reclaim), true);
  assert.match(reclaim.assumption ?? "", /today/);

  const zero = compareDuty({
    entryDate: "2025-01-13",
    customsValue: 1000,
    dutyPaid: 60,
    declaredCode: "3924100090",
    declaredRate: "6.00%",
    suggestedCode: "3924100019",
    suggestedRate: "6.00%",
    rateAsOf: "2025-01-13",
    rateSource: "import-date",
  });
  assert.equal(zero.direction, "same");
  assert.equal(isMoneyFinding(zero), false);
}

function windowCase() {
  assert.equal(withinThreeYears("2024-02-27", new Date("2026-10-24T12:00:00Z")), true);
  assert.equal(withinThreeYears("2020-01-01", new Date("2026-10-24T12:00:00Z")), false);
  assert.equal(withinThreeYears("not-a-date"), false);
}

function codeCase() {
  assert.equal(uk10("3924 10 00 19"), "3924100019");
  assert.equal(uk10("3924"), null);
  assert.equal(isUk10("3924100019"), true);
  assert.equal(digitsOnly("3924-10"), "392410");
}

function variantCase() {
  const v = templateVariants("Bamboo kids' dinner set, plate bowl cup", 20);
  assert.equal(v.length, 20);
  assert.ok(v.some((t) => /fibre|melamine|tableware|children/i.test(t)));
}

function errorCase() {
  const prev = process.env.MUBIT_API_KEY;
  delete process.env.MUBIT_API_KEY;
  const msg = classifyErrorMessage(new Error("Anthropic API key is missing. Pass it using the 'apiKey' parameter or the ANTHROPIC_API_KEY environment variable."));
  assert.match(msg, /Mubit/);
  assert.doesNotMatch(msg, /Anthropic/);
  if (prev !== undefined) process.env.MUBIT_API_KEY = prev;
}

function retrieveCase() {
  const leaves = [
    { code: "4419190000", path: "Tableware and kitchenware, of wood > Of bamboo > Other", description: "Other", dutyRate: "0.00%" },
    { code: "3924100019", path: "Tableware, kitchenware, other household articles and hygienic or toilet articles, of plastics > Tableware and kitchenware > Kitchenware containing polyamide or melamine > Other", description: "Other", dutyRate: "6.00%" },
    { code: "3924100090", path: "Tableware, kitchenware, of plastics > Tableware and kitchenware > Other", description: "Other", dutyRate: "6.00%" },
    { code: "6109100010", path: "T-shirts, knitted > Of cotton", description: "Of cotton", dutyRate: "12.00%" },
  ];
  const ranked = rankLeaves(buildIndex(leaves), "bamboo");
  const short = diversifyByHs6(ranked, 10, 3);
  assert.ok(short.some((c) => c.code === "3924100019"), `bamboo shortlist missing 3924100019: ${short.map((c) => c.code).join(",")}`);
  assert.ok(short.some((c) => c.code.startsWith("4419")), "bamboo shortlist should still include wood 4419");
}

async function liveSearchCase() {
  const bamboo = await searchTariff({ query: "bamboo", limit: 24 });
  assert.ok(
    bamboo.some((r) => r.code === "3924100019"),
    `searchTariff('bamboo') missing 3924100019; got ${bamboo.map((r) => r.code).join(",")}`,
  );
  const phrase = await searchTariff({ query: "bamboo-melamine tableware", limit: 24 });
  assert.ok(
    phrase.some((r) => r.code === "3924100019"),
    `searchTariff('bamboo-melamine tableware') missing 3924100019; got ${phrase.map((r) => r.code).join(",")}`,
  );
}

function demoCase() {
  assert.equal(isDemoBambooLine("Bamboo kids' dinner set, plate bowl cup"), true);
  assert.equal(isDemoBambooLine("Bamboo cups set, 4 pack, kids"), true);
  assert.equal(isDemoBambooLine("Bamboo chopsticks, 10 pairs"), false);
  assert.equal(isDemoBambooLine("Bamboo chopping board, large"), false);
  assert.equal(prettyRate("0.00%"), "0%");
  assert.equal(prettyRate("6.00%"), "6%");
  assert.equal(prettyRate(null), "rate unknown");
  assert.ok(isSimilar("Bamboo kids' dinner set, plate bowl cup", "Bamboo cups set, 4 pack, kids"));
}

dutyCase();
windowCase();
codeCase();
variantCase();
errorCase();
retrieveCase();
demoCase();
await liveSearchCase();
console.log("smoke ok: duty, window, codes, variants, Mubit error wording, demo bamboo pin, bamboo → 3924100019");
