import { hs6 } from "@/lib/codes";

const STOP = new Set(
  "a an the and or of for with to in on by from not other others set pcs pc piece pieces kids child children new".split(
    " ",
  ),
);

const US_UK: Record<string, string> = {
  jewelry: "jewellery",
  color: "colour",
  aluminum: "aluminium",
  fiber: "fibre",
  fibers: "fibres",
  gray: "grey",
  plastic: "plastics",
  silicone: "plastics",
  acrylic: "plastics",
  pvc: "plastics",
};

// Ambiguous marketplace words that otherwise collapse onto one chapter.
const EXPAND: Record<string, string[]> = {
  bamboo: ["bamboo", "wood", "plastics", "melamine", "tableware", "kitchenware"],
  silicone: ["silicone", "plastics", "kitchenware"],
  shirt: ["shirt", "knitted", "woven", "cotton"],
  shirts: ["shirt", "knitted", "woven", "cotton"],
};

export type TariffLeaf = { code: string; path: string; description: string; dutyRate: string | null };
export type Candidate = TariffLeaf & { hs6: string; score: number };

export type RewriteHint = {
  goods?: string;
  keywords?: string[];
  hs6?: string[];
};

function stem(t: string) {
  if (/(ss|x|ch|sh)es$/.test(t)) return t.slice(0, -2);
  if (t.endsWith("ies") && t.length > 5) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);
}

export function expandTokens(query: string) {
  const out: string[] = [];
  const raw = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of raw) {
    const extras = EXPAND[w];
    if (extras) out.push(...extras.map(stem));
    else out.push(stem(w));
    if (US_UK[w]) out.push(stem(US_UK[w]));
  }
  return out.filter((w) => w.length > 2 && !STOP.has(w));
}

type Doc = Map<string, number>;

export type LeafIndex = {
  leaves: TariffLeaf[];
  docs: Doc[];
  idf: Map<string, number>;
  post: Map<string, number[]>;
  avg: number;
};

export function buildIndex(leaves: TariffLeaf[]): LeafIndex {
  const docs = leaves.map((l) => {
    const bag = new Map<string, number>();
    for (const t of tokens(`${l.path} ${l.description}`)) bag.set(t, (bag.get(t) ?? 0) + 1);
    return bag;
  });
  const n = docs.length || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, c] of df) idf.set(t, Math.log(1 + (n - c + 0.5) / (c + 0.5)));
  const post = new Map<string, number[]>();
  docs.forEach((d, i) => {
    for (const t of d.keys()) {
      const list = post.get(t) ?? [];
      list.push(i);
      post.set(t, list);
    }
  });
  const avg = docs.reduce((s, d) => s + [...d.values()].reduce((a, b) => a + b, 0), 0) / n;
  return { leaves, docs, idf, post, avg };
}

export function bm25(index: LeafIndex, queryTokens: string[], k1 = 1.2, b = 0.75) {
  const weights = new Map<string, number>();
  for (const t of queryTokens) weights.set(t, (weights.get(t) ?? 0) + 1);
  const scores = new Map<number, number>();
  for (const [t, w] of weights) {
    const idf = index.idf.get(t);
    if (!idf) continue;
    for (const i of index.post.get(t) ?? []) {
      const tf = index.docs[i].get(t) ?? 0;
      const len = [...index.docs[i].values()].reduce((a, c) => a + c, 0);
      const part = (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (len / (index.avg || 1))));
      scores.set(i, (scores.get(i) ?? 0) + w * part);
    }
  }
  return scores;
}

export function diversifyByHs6(scored: Candidate[], groups = 10, perHs6 = 3) {
  const by6 = new Map<string, Candidate[]>();
  for (const c of scored) {
    const g = by6.get(c.hs6) ?? [];
    g.push(c);
    by6.set(c.hs6, g);
  }
  const order = [...by6.entries()].sort((a, b) => (b[1][0]?.score ?? 0) - (a[1][0]?.score ?? 0)).slice(0, groups);
  const out: Candidate[] = [];
  for (const [, leaves] of order) {
    leaves.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
    out.push(...leaves.slice(0, perHs6));
  }
  return out;
}

export function rankLeaves(index: LeafIndex, query: string, hint?: RewriteHint | null): Candidate[] {
  const q = expandTokens(query);
  if (hint?.goods) q.push(...tokens(hint.goods));
  for (const kw of hint?.keywords ?? []) q.push(...tokens(kw));
  const scores = bm25(index, q);
  const hs6Boost = new Map<string, number>();
  (hint?.hs6 ?? []).forEach((h, i) => {
    const six = h.replace(/\D/g, "").slice(0, 6);
    if (six.length >= 4) hs6Boost.set(six.slice(0, 6).padEnd(6, "0").slice(0, 6), 1 / (1 + i));
  });
  // If the rewrite guessed an HS6 that has no BM25 hit, still surface a leaf from that group.
  index.leaves.forEach((l, i) => {
    const six = hs6(l.code);
    if (hs6Boost.has(six)) scores.set(i, scores.get(i) ?? 0.01);
  });
  const mx = Math.max(1, ...scores.values());
  const ranked: Candidate[] = [];
  for (const [i, s] of scores) {
    const l = index.leaves[i];
    const six = hs6(l.code);
    const boost = 0.5 * (hs6Boost.get(six) ?? 0);
    ranked.push({ ...l, hs6: six, score: s / mx + boost });
  }
  ranked.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  return ranked;
}

// Shared keyword overlap used to re-check similar invoice lines and to find a precedent for a paraphrase.
export function isSimilar(a: string, b: string) {
  const wa = new Set(tokens(a));
  return tokens(b).some((w) => wa.has(w));
}
