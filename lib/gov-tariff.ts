// UK Trade Tariff, the same public endpoints HMRC's official MCP server (github.com/trade-tariff/mcp)
// wraps. Free, no key, Open Government Licence v3. Data changes daily, so responses are cached for a day.
//   classification_search  → ranked candidate codes for a plain product description (undocumented, may change)
//   chapters/{ch}          → the chapter's legal notes (exclusions and definitions)
//   commodities/{code}     → hierarchy, duty, VAT and other measures, optionally as of a past date

const HOST = "https://www.trade-tariff.service.gov.uk";
const DAY = 24 * 60 * 60 * 1000;

export const tariffUrl = (code: string) => `${HOST}/commodities/${code}`;
export const headingUrl = (heading: string) => `${HOST}/headings/${heading}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
type Inc = { id: string; type: string; attributes: Record<string, Json>; relationships?: Json };

const cache = new Map<string, { at: number; value: Json }>();

async function call(path: string, init?: { body?: unknown }): Promise<Json | null> {
  const key = init?.body ? `${path}#${JSON.stringify(init.body)}` : path;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return hit.value;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${HOST}${path}`, {
        method: init?.body ? "POST" : "GET",
        headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
        body: init?.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const value = await res.json();
        cache.set(key, { at: Date.now(), value });
        return value;
      }
      if (res.status === 404 || res.status === 422) return null;
    } catch {
      // network hiccup or timeout: retry
    }
    // 429: the API rate-limits bursts.
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return null;
}

const clean = (t: string | null | undefined) =>
  (t ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* ── Candidate shortlist ── */

export type Candidate = {
  code: string;
  description: string;
  heading: string;
  rank: number;
  // Relative to the best hit for this one query. Not a probability, not comparable between queries.
  relative: number;
};

export type Shortlist = { query: string; candidates: Candidate[]; headings: { heading: string; count: number; bestRank: number }[] };

export async function classificationSearch(query: string, limit = 10): Promise<Shortlist | null> {
  const d = await call(`/api/v2/classification_search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!d?.data) return null;
  const max = Number(d.meta?.max_score) || 1;
  const candidates: Candidate[] = d.data
    .map((r: Inc, i: number) => ({
      code: String(r.attributes.goods_nomenclature_item_id),
      description: clean(r.attributes.self_text ?? r.attributes.description),
      heading: String(r.attributes.goods_nomenclature_item_id).slice(0, 4),
      rank: i + 1,
      relative: Math.round(((Number(r.attributes.score) || 0) / max) * 100) / 100,
    }))
    .filter((c: Candidate) => /^\d{10}$/.test(c.code));

  const groups = new Map<string, { heading: string; count: number; bestRank: number }>();
  for (const c of candidates) {
    const g = groups.get(c.heading) ?? { heading: c.heading, count: 0, bestRank: c.rank };
    g.count++;
    groups.set(c.heading, g);
  }
  return { query: d.meta?.expanded_query ?? query, candidates, headings: [...groups.values()].sort((a, b) => a.bestRank - b.bestRank) };
}

/* ── Legal notes ── */

export type NoteFragment = { id: string; ref: string; text: string };
export type NoteSet = { chapter: string; title: string; notes: NoteFragment[]; url: string };

const unlink = (t: string) => t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*/g, "");

// A chapter's legal notes, split into self-contained fragments: a lettered item keeps
// the numbered clause it belongs to ("1. This chapter does not cover: … o. articles of Chapter 94").
export async function chapterNotes(chapter: string): Promise<NoteSet | null> {
  const ch = chapter.padStart(2, "0").slice(0, 2);
  const d = await call(`/uk/api/v2/chapters/${ch}`);
  const a = d?.data?.attributes;
  if (!a) return null;
  const blocks = unlink(String(a.chapter_note ?? ""))
    .split(/\n\s*\n/)
    .map((b) => clean(b))
    .filter(Boolean);
  const notes: NoteFragment[] = [];
  let clause = "";
  let clauseNo = "";
  for (const b of blocks) {
    const num = b.match(/^(\d+)\.\s/);
    const sub = b.match(/^\(?([a-z]{1,2})[.)]\s/);
    if (num) {
      clauseNo = num[1];
      clause = b;
      if (!/:\s*$/.test(b)) notes.push({ id: `${ch}-${clauseNo}`, ref: `Chapter ${Number(ch)} note ${clauseNo}`, text: b });
    } else if (sub && clause) {
      notes.push({ id: `${ch}-${clauseNo}${sub[1]}`, ref: `Chapter ${Number(ch)} note ${clauseNo}(${sub[1]})`, text: `${clause} ${b}` });
    } else {
      notes.push({ id: `${ch}-x${notes.length}`, ref: `Chapter ${Number(ch)} notes`, text: b });
    }
  }
  return { chapter: ch, title: clean(a.description_plain ?? a.description), notes, url: `${HOST}/chapters/${ch}` };
}

// Fragments worth showing for one product: exclusions and definitions that share words with it.
export function relevantNotes(set: NoteSet, product: string, max = 6) {
  const words = new Set(
    product
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3),
  );
  const score = (n: NoteFragment) => {
    const t = n.text.toLowerCase();
    let s = 0;
    for (const w of words) if (t.includes(w)) s += 2;
    if (/does not cover|excluding|other than|not classified/.test(t)) s += 1;
    if (/heading \d{2}\.?\d{2}/.test(t)) s += 1;
    return s;
  };
  return set.notes
    .map((n) => ({ n, s: score(n) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map((x) => x.n);
}

/* ── One commodity ── */

export type Commodity = {
  code: string;
  declarable: boolean;
  description: string;
  path: string[];
  duty: string | null;
  vat: string | null;
  flags: string[];
  asOf: string | null;
  url: string;
};

// Measure type ids from the tariff: 103 third-country duty, 305 VAT; trade remedies and quotas flagged.
const ANTI_DUMPING = new Set(["551", "552", "553", "554", "555", "561", "562", "564", "565", "566", "570"]);
const QUOTA = new Set(["122", "123", "143", "146", "147", "653", "654"]);

export async function lookupCommodity(code: string, asOf?: string): Promise<Commodity | null> {
  const d = await call(`/uk/api/v2/commodities/${code}${asOf ? `?as_of=${asOf}` : ""}`);
  if (!d?.data) return null;
  const inc: Inc[] = d.included ?? [];
  const a = d.data.attributes;
  const byId = new Map(inc.map((i) => [`${i.type}:${i.id}`, i]));
  const exprOf = (m: Inc) => byId.get(`duty_expression:${m.relationships?.duty_expression?.data?.id}`)?.attributes;
  const measures = inc.filter((i) => i.type === "measure" && i.attributes.import);
  const typeOf = (m: Inc) => String(m.relationships?.measure_type?.data?.id ?? "");
  const areaOf = (m: Inc) => String(m.relationships?.geographical_area?.data?.id ?? "");

  const third = measures.find((m) => typeOf(m) === "103" && areaOf(m) === "1011");
  // Several VAT measures can apply (standard, plus zero or reduced rates for e.g. children's clothing):
  // show the standard rate, and flag the reliefs for the broker to check.
  const vats = measures.filter((m) => typeOf(m) === "305");
  const vatPct = (m: Inc) => Number.parseFloat(String(exprOf(m)?.base ?? "")) || 0;
  const vat = vats.reduce<Inc | undefined>((best, m) => (!best || vatPct(m) > vatPct(best) ? m : best), undefined);
  const ancestors = (d.data.relationships?.ancestors?.data ?? []) as { id: string; type: string }[];
  const path = [
    ...ancestors.map((r) => clean(byId.get(`${r.type}:${r.id}`)?.attributes?.description)),
    clean(a.description_plain ?? a.description),
  ].filter(Boolean);
  const heading = inc.find((i) => i.type === "heading");
  if (heading && !path.includes(clean(heading.attributes.description))) path.unshift(clean(heading.attributes.description));

  const flags: string[] = [];
  if (measures.some((m) => ANTI_DUMPING.has(typeOf(m)))) flags.push("Anti-dumping or countervailing duty applies to some origins");
  if (measures.some((m) => QUOTA.has(typeOf(m)))) flags.push("Tariff quota available");
  // Import controls that apply to every origin (e.g. melamine kitchenware checks): documents or checks needed at the border.
  const kind = (m: Inc) => String(byId.get(`measure_type:${typeOf(m)}`)?.attributes?.description ?? "");
  if (measures.some((m) => areaOf(m) === "1011" && /restriction|prohibition|control/i.test(kind(m))))
    flags.push("Import restriction: documents or border checks are needed for these goods");
  if (vats.some((m) => vatPct(m) < vatPct(vat!))) flags.push("A zero or reduced VAT rate applies to some goods under this code");

  const summary = inc.find((i) => i.type === "import_trade_summary")?.attributes;
  return {
    code,
    declarable: Boolean(a.declarable),
    description: clean(a.formatted_description ?? a.description),
    path,
    duty: clean(third ? exprOf(third)?.verbose_duty ?? exprOf(third)?.base : summary?.basic_third_country_duty) || null,
    vat: vat ? clean(exprOf(vat)?.verbose_duty ?? exprOf(vat)?.base) || null : null,
    flags,
    asOf: asOf ?? null,
    url: tariffUrl(code),
  };
}

/* ── Origin: preferential rate and the product-specific rule ── */

export type Preference = { rate: string; scheme: string };

// The preferential rate (measure types 142/145) for goods originating in `country`, if any.
export async function preferenceFor(code: string, country: string, asOf?: string): Promise<Preference | null> {
  const iso = country.toUpperCase();
  const d = await call(`/uk/api/v2/commodities/${code}${asOf ? `?as_of=${asOf}` : ""}`);
  if (!d?.data) return null;
  const inc: Inc[] = d.included ?? [];
  const byId = new Map(inc.map((i) => [`${i.type}:${i.id}`, i]));
  for (const m of inc) {
    if (m.type !== "measure" || !m.attributes.import) continue;
    if (!["142", "145"].includes(String(m.relationships?.measure_type?.data?.id))) continue;
    const areaId = String(m.relationships?.geographical_area?.data?.id ?? "");
    const area = byId.get(`geographical_area:${areaId}`);
    const members = (area?.relationships?.children_geographical_areas?.data ?? []).map((c: { id: string }) => c.id);
    if (areaId !== iso && !members.includes(iso)) continue;
    const expr = byId.get(`duty_expression:${m.relationships?.duty_expression?.data?.id}`)?.attributes;
    return { rate: clean(expr?.verbose_duty ?? expr?.base) || "0.00%", scheme: clean(area?.attributes?.description) || areaId };
  }
  return null;
}

export type OriginRule = { scheme: string; rule: string; proofs: string[] };

// Product-specific rules of origin for this code's heading under each scheme covering `country`.
export async function rulesOfOrigin(code: string, country: string): Promise<OriginRule[]> {
  const d = await call(`/uk/api/v2/rules_of_origin_schemes/${code.slice(0, 6)}/${country.toUpperCase()}`);
  if (!d?.data) return [];
  const inc: Inc[] = d.included ?? [];
  const byId = new Map(inc.map((i) => [`${i.type}:${i.id}`, i]));
  return (d.data as Inc[]).map((scheme) => {
    const rel = scheme.relationships ?? {};
    const ruleSets = (rel.rule_sets?.data ?? []) as { id: string; type: string }[];
    const v2 = ruleSets.flatMap((rs) => (byId.get(`${rs.type}:${rs.id}`)?.relationships?.rules?.data ?? []) as { id: string; type: string }[]);
    const legacy = (rel.rules?.data ?? []) as { id: string; type: string }[];
    const text =
      v2.map((r) => clean(unlink(byId.get(`${r.type}:${r.id}`)?.attributes?.rule ?? ""))).find(Boolean) ||
      legacy.map((r) => clean(unlink(byId.get(`${r.type}:${r.id}`)?.attributes?.rule ?? ""))).find(Boolean) ||
      "";
    const proofs = ((rel.proofs?.data ?? []) as { id: string; type: string }[])
      .map((p) => clean(byId.get(`${p.type}:${p.id}`)?.attributes?.summary ?? ""))
      .filter(Boolean);
    return { scheme: clean(scheme.attributes.title), rule: text, proofs };
  });
}
