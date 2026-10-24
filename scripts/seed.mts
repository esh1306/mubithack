// bun run script scripts/seed.mts — loads brokers and the tariff seed into SQLite. Safe to re-run.
import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { parseCsvLine } from "../lib/csv";

const seed = JSON.parse(readFileSync("data/tariff-seed.json", "utf8"));

await db.broker.upsert({ where: { id: "harbourline" }, update: {}, create: { id: "harbourline", name: "Harbourline Customs" } });
await db.broker.upsert({ where: { id: "northgate" }, update: {}, create: { id: "northgate", name: "Northgate Freight" } });

await db.tariff.deleteMany();
await db.chapter.deleteMany();
for (const [id, c] of Object.entries<{ description: string; notes: string }>(seed.chapters)) {
  await db.chapter.create({ data: { id, description: c.description, notes: c.notes } });
}
// Codes can repeat across headings' listings; keep the first.
const seen = new Set<string>();
for (const c of seed.commodities) {
  if (seen.has(c.code)) continue;
  seen.add(c.code);
  await db.tariff.create({ data: c });
}

// Past entries for the retro-scan (Harbourline only).
await db.retroFinding.deleteMany();
await db.pastEntry.deleteMany();
const [, ...rows] = readFileSync("data/harbourline-past-entries.csv", "utf8").trim().split("\n");
for (const row of rows) {
  const [entryDate, text, declaredCode, value, duty] = parseCsvLine(row);
  await db.pastEntry.create({
    data: { brokerId: "harbourline", entryDate, text, declaredCode, customsValue: Number(value), dutyPaid: Number(duty) },
  });
}

console.log("seeded", seen.size, "codes,", Object.keys(seed.chapters).length, "chapters, 2 brokers,", rows.length, "past entries");
