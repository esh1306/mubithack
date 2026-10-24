import { db } from "@/lib/db";

// Live UK Trade Tariff (public, no key). Anything fetched is saved to the local Tariff table,
// so the seed grows as the agent and brokers use headings it didn't have.
const API = "https://www.trade-tariff.service.gov.uk/uk/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inc = { id: string; type: string; attributes: Record<string, any>; relationships?: any };

async function get(path: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    // 429: the API rate-limits bursts.
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return null;
}

const clean = (t: string) => t.replace(/<br\s*\/?>/g, " ").replace(/\s+/g, " ").trim();

async function ensureChapter(chapter: string) {
  if (await db.chapter.findUnique({ where: { id: chapter } })) return;
  const c = await get(`/chapters/${chapter}`);
  if (!c) return;
  await db.chapter.upsert({
    where: { id: chapter },
    update: {},
    create: { id: chapter, description: c.data.attributes.description, notes: c.data.attributes.chapter_note ?? "" },
  });
}

const imported = new Set<string>();

// Saves every declarable code under a 4-digit heading. Returns how many codes it has.
export async function importHeading(heading: string) {
  if (!/^\d{4}$/.test(heading)) return 0;
  const existing = await db.tariff.count({ where: { heading } });
  if (existing > 0 || imported.has(heading)) return existing;
  imported.add(heading);

  const d = await get(`/headings/${heading}`);
  if (!d) return 0;
  const chapter = heading.slice(0, 2);
  await ensureChapter(chapter);
  const headingText = clean(d.data.attributes.description_plain ?? d.data.attributes.description);
  const items: Inc[] = (d.included ?? []).filter((i: Inc) => i.type === "commodity");
  const rows: { code: string; description: string; path: string; heading: string; chapter: string }[] = [];
  if (items.length === 0) rows.push({ code: `${heading}000000`, description: headingText, path: headingText, heading, chapter });

  const stack: string[] = [];
  for (const it of items) {
    const a = it.attributes;
    const text = clean(a.description_plain ?? a.description);
    stack.length = a.number_indents - 1;
    stack[a.number_indents - 1] = text;
    if (a.leaf && a.producline_suffix === "80")
      rows.push({ code: a.goods_nomenclature_item_id, description: text, path: [headingText, ...stack].join(" > "), heading, chapter });
  }
  for (const r of rows) await db.tariff.upsert({ where: { code: r.code }, update: {}, create: { ...r, dutyRate: null } });
  return rows.length;
}

function ergaOmnesDuty(d: { included?: Inc[] } | null, asOf?: string): string | null {
  if (!d) return null;
  const inc: Inc[] = d.included ?? [];
  const exprs = new Map(inc.filter((i) => i.type === "duty_expression").map((i) => [i.id, i.attributes]));
  const onDate = (i: Inc) => {
    if (!asOf) return true;
    const start = String(i.attributes.effective_start_date ?? i.attributes.validity_start_date ?? "").slice(0, 10);
    const end = String(i.attributes.effective_end_date ?? i.attributes.validity_end_date ?? "").slice(0, 10);
    if (start && asOf < start) return false;
    if (end && asOf > end) return false;
    return true;
  };
  const measure = inc.find(
    (i) =>
      i.type === "measure" &&
      i.relationships?.measure_type?.data?.id === "103" &&
      i.relationships?.geographical_area?.data?.id === "1011" &&
      onDate(i),
  );
  const expr = measure && exprs.get(measure.relationships.duty_expression?.data?.id);
  return expr?.verbose_duty ?? null;
}

// Third-country (ERGA OMNES) duty for one code, e.g. "6.00%".
// Pass `asOf` (YYYY-MM-DD) to ask for the rate in force on that import date.
export async function liveDuty(code: string, asOf?: string): Promise<string | null> {
  const path = asOf ? `/commodities/${code}?as_of=${asOf}` : `/commodities/${code}`;
  return ergaOmnesDuty(await get(path), asOf);
}

export type DutyLookup = { rate: string | null; source: "import-date" | "current"; asOf: string };

const dutyMemo = new Map<string, DutyLookup>();

// Prefer the rate on the import date; fall back to today's rate and say so.
export async function dutyAsOf(code: string, asOf: string): Promise<DutyLookup> {
  const key = `${code}:${asOf}`;
  const hit = dutyMemo.get(key);
  if (hit) return hit;
  const dated = await liveDuty(code, asOf);
  if (dated) {
    const row = { rate: dated, source: "import-date" as const, asOf };
    dutyMemo.set(key, row);
    return row;
  }
  const now = (await liveDuty(code)) ?? (await db.tariff.findUnique({ where: { code } }))?.dutyRate ?? null;
  const row = { rate: now, source: "current" as const, asOf };
  dutyMemo.set(key, row);
  return row;
}

// Live keyword search: imports the headings it points at, and returns the codes it matched.
export async function liveSearch(query: string): Promise<string[]> {
  const d = await get(`/search?q=${encodeURIComponent(query)}`);
  const a = d?.data?.attributes;
  if (!a) return [];
  if (a.type === "exact_match" && a.entry?.id) {
    const id = String(a.entry.id);
    await importHeading(id.slice(0, 4));
    return [id.padEnd(10, "0")];
  }
  const m = a.goods_nomenclature_match ?? {};
  const ids: string[] = [
    ...(m.commodities ?? []).map((x: { _source: { goods_nomenclature_item_id: string } }) => x._source.goods_nomenclature_item_id),
    ...(m.headings ?? []).map((x: { _source: { goods_nomenclature_item_id: string } }) => x._source.goods_nomenclature_item_id),
  ].filter(Boolean);
  const headings = [...new Set(ids.map((id) => id.slice(0, 4)))].slice(0, 4);
  for (const h of headings) await importHeading(h);
  return ids;
}
