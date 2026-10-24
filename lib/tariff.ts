import { db } from "@/lib/db";
import { heading4, uk10 } from "@/lib/codes";
import { buildIndex, diversifyByHs6, rankLeaves, type LeafIndex } from "@/lib/retrieve";
import { rewriteQuery } from "@/lib/rewrite";
import { dutyAsOf, importHeading, liveDuty, liveSearch } from "@/lib/tariff-live";

export { dutyAsOf };

let cached: { count: number; index: LeafIndex } | null = null;

async function leafIndex(): Promise<LeafIndex> {
  const count = await db.tariff.count();
  if (!cached || cached.count !== count) {
    cached = { count, index: buildIndex(await db.tariff.findMany()) };
  }
  return cached.index;
}

async function ensureHeadings(codes: string[]) {
  const headings = [...new Set(codes.map((c) => heading4(c)).filter((h) => h.length === 4))];
  for (const h of headings.slice(0, 6)) await importHeading(h);
}

// Search by words (BM25 + HS6 diversity, optional tariff-language rewrite) or by a 2/4/6-digit number.
// Without a Mubit key or embeddings this is keyword-only, with query expansion so "bamboo" still
// surfaces plastics/melamine tableware as well as wood. Falls back to the live UK Trade Tariff
// when the local copy is thin, and keeps what it finds.
export async function searchTariff({ query, number, limit = 24 }: { query?: string; number?: string; limit?: number }) {
  if (number) {
    let rows = await db.tariff.findMany({ where: { code: { startsWith: number } }, take: 40, orderBy: { code: "asc" } });
    if (rows.length === 0 && number.length >= 4) {
      await importHeading(number.slice(0, 4));
      rows = await db.tariff.findMany({ where: { code: { startsWith: number } }, take: 40, orderBy: { code: "asc" } });
    }
    return rows.map(({ code, path, dutyRate }) => ({ code, path, dutyRate }));
  }
  const q = (query ?? "").trim();
  if (!q) return [];

  const hint = await rewriteQuery(q);
  if (hint?.hs6?.length) await ensureHeadings(hint.hs6);

  let index = await leafIndex();
  let ranked = rankLeaves(index, q, hint);
  const groups = new Set(diversifyByHs6(ranked, 10, 3).map((c) => c.hs6));
  const guessed = (hint?.hs6 ?? []).map((h) => h.slice(0, 6));
  const missingGuess = guessed.some((g) => g.length >= 6 && ![...groups].some((h) => h.startsWith(g.slice(0, 4))));

  if (groups.size < 3 || missingGuess) {
    await liveSearch(hint?.goods || q);
    if (guessed.length) await ensureHeadings(guessed);
    cached = null;
    index = await leafIndex();
    ranked = rankLeaves(index, q, hint);
  }

  return diversifyByHs6(ranked, 10, 3)
    .slice(0, limit)
    .map(({ code, path, dutyRate }) => ({ code, path, dutyRate }));
}

export async function getCommodity(code: string) {
  const id = uk10(code) ?? code.replace(/\D/g, "");
  let row = await db.tariff.findUnique({ where: { code: id } });
  if (!row && id.length >= 4) {
    await importHeading(id.slice(0, 4));
    row = await db.tariff.findUnique({ where: { code: id } });
  }
  if (!row) return { error: `${code} is not a declarable code in the tariff` };
  if (!row.dutyRate) {
    const dutyRate = await liveDuty(id);
    if (dutyRate) row = await db.tariff.update({ where: { code: id }, data: { dutyRate } });
  }
  const chapter = await db.chapter.findUnique({ where: { id: row.chapter } });
  return {
    code: row.code,
    path: row.path,
    dutyRate: row.dutyRate,
    chapter: chapter?.description,
    chapterNotes: chapter?.notes,
  };
}
