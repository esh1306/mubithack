import { db } from "@/lib/db";

const STOP = new Set(["and", "or", "of", "the", "for", "with", "not", "other", "a", "an", "in", "to"]);

function words(text: string) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

// Search by words (scored against the full "heading > ... > leaf" path) or by a 2/4/6-digit number.
export async function searchTariff({ query, number }: { query?: string; number?: string }) {
  if (number) {
    const rows = await db.tariff.findMany({ where: { code: { startsWith: number } }, take: 40 });
    return rows.map(({ code, path, dutyRate }) => ({ code, path, dutyRate }));
  }
  const q = words(query ?? "");
  if (q.length === 0) return [];
  const rows = await db.tariff.findMany();
  return rows
    .map((r) => {
      const w = new Set(words(r.path));
      return { r, score: q.filter((x) => w.has(x) || [...w].some((y) => y.startsWith(x))).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ r }) => ({ code: r.code, path: r.path, dutyRate: r.dutyRate }));
}

export async function getCommodity(code: string) {
  const row = await db.tariff.findUnique({ where: { code } });
  if (!row) return { error: `${code} is not a declarable code in the tariff` };
  const chapter = await db.chapter.findUnique({ where: { id: row.chapter } });
  return {
    code: row.code,
    path: row.path,
    dutyRate: row.dutyRate,
    chapter: chapter?.description,
    chapterNotes: chapter?.notes,
  };
}
