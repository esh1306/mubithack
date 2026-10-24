import { db } from "@/lib/db";

const STOP = new Set(["and", "or", "of", "the", "for", "with", "not", "other", "a", "an", "in", "to"]);

// Lower-case words with simple plural stripping, so "plates" matches "plate".
function words(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (/(ss|x|ch|sh)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

// Search by words (scored against the full "heading > ... > leaf" path) or by a 2/4/6-digit number.
export async function searchTariff({ query, number, limit = 10 }: { query?: string; number?: string; limit?: number }) {
  if (number) {
    const rows = await db.tariff.findMany({ where: { code: { startsWith: number } }, take: 40, orderBy: { code: "asc" } });
    return rows.map(({ code, path, dutyRate }) => ({ code, path, dutyRate }));
  }
  const q = words(query ?? "");
  if (q.length === 0) return [];
  const rows = await db.tariff.findMany();
  return rows
    .map((r) => {
      const w = words(r.path);
      const leaf = new Set(words(r.description));
      const hit = (x: string) => w.some((y) => y === x || y.startsWith(x));
      // Every query word found counts; one found in the leaf's own text counts a little more.
      const score = q.filter(hit).length * 2 + q.filter((x) => leaf.has(x)).length;
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.code.localeCompare(b.r.code))
    .slice(0, limit)
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
