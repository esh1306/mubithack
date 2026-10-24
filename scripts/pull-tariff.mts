// bun run script scripts/pull-tariff.mts — pulls a small slice of the UK Trade Tariff into data/tariff-seed.json.
import { readFile, writeFile } from "node:fs/promises";
// Headings cover both the right and the "obvious wrong" codes for the items in ../tricky-items.md.
const API = "https://www.trade-tariff.service.gov.uk/uk/api";

const HEADINGS = [
  "0404", "1806", "2404", "2106", "3921", "3924", "3926", "4016", "4202", "4419",
  "6104", "6105", "6106", "6109", "6204", "6205", "6206", "6301", "6302",
  "6402", "6403", "6404", "6506", "6912", "7323", "8302", "8516", "8517",
  "8518", "8525", "8539", "8543", "8708", "8711", "8806", "9021", "9102",
  "9404", "9405", "9505", "9506",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inc = { id: string; type: string; attributes: Record<string, any>; relationships?: any };

async function get(path: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { Accept: "application/json" } });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    // 429: the API rate-limits; back off and try again.
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  console.warn("gave up on", path);
  return null;
}

async function thirdCountryDuty(code: string): Promise<string | null> {
  const d = await get(`/commodities/${code}`);
  if (!d) return null;
  const inc: Inc[] = d.included ?? [];
  const exprs = new Map(inc.filter((i) => i.type === "duty_expression").map((i) => [i.id, i.attributes]));
  const measure = inc.find(
    (i) =>
      i.type === "measure" &&
      i.relationships?.measure_type?.data?.id === "103" &&
      i.relationships?.geographical_area?.data?.id === "1011", // ERGA OMNES
  );
  const expr = measure && exprs.get(measure.relationships.duty_expression?.data?.id);
  return expr?.verbose_duty ?? null;
}

const chapters: Record<string, { description: string; notes: string }> = {};
const commodities: { code: string; description: string; path: string; heading: string; chapter: string; dutyRate: string | null }[] = [];

for (const heading of HEADINGS) {
  const d = await get(`/headings/${heading}`);
  if (!d) { console.warn("no heading", heading); continue; }
  const chapter = heading.slice(0, 2);
  if (!chapters[chapter]) {
    const c = await get(`/chapters/${chapter}`);
    chapters[chapter] = { description: c.data.attributes.description, notes: c.data.attributes.chapter_note ?? "" };
  }
  const headingText = d.data.attributes.description_plain ?? d.data.attributes.description;
  const items: Inc[] = (d.included ?? []).filter((i: Inc) => i.type === "commodity");
  const stack: string[] = [];

  // Heading with no subdivisions is itself declarable.
  if (items.length === 0 && d.data.attributes.declarable) {
    commodities.push({ code: `${heading}000000`, description: headingText, path: headingText, heading, chapter, dutyRate: null });
  }

  for (const it of items) {
    const a = it.attributes;
    const indent: number = a.number_indents;
    const text: string = a.description_plain ?? a.description;
    stack.length = indent - 1;
    stack[indent - 1] = text;
    if (a.leaf && a.producline_suffix === "80") {
      commodities.push({
        code: a.goods_nomenclature_item_id,
        description: text,
        path: [headingText, ...stack].join(" > "),
        heading,
        chapter,
        dutyRate: null,
      });
    }
  }
  console.log(heading, "done", commodities.length);
}

// Duty rates, one at a time: the API rate-limits bursts. Reuse rates from a previous pull.
const previous = new Map<string, string | null>();
try {
  for (const c of JSON.parse(await readFile("data/tariff-seed.json", "utf8")).commodities) previous.set(c.code, c.dutyRate);
} catch {}
for (const [i, c] of commodities.entries()) {
  if (previous.get(c.code)) { c.dutyRate = previous.get(c.code)!; continue; }
  c.dutyRate = await thirdCountryDuty(c.code);
  await new Promise((r) => setTimeout(r, 250));
  if (i % 50 === 0) console.log("duty", i, "/", commodities.length);
}

await writeFile("data/tariff-seed.json", JSON.stringify({ pulledAt: new Date().toISOString(), chapters, commodities }, null, 1));
console.log("wrote", commodities.length, "commodities,", Object.keys(chapters).length, "chapters");
