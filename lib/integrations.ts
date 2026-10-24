import { db } from "@/lib/db";

// Integration settings live in SQLite on the broker's own machine; secrets never go to the browser.
export async function getConfig<T>(brokerId: string, kind: string): Promise<T | null> {
  const row = await db.integration.findUnique({ where: { brokerId_kind: { brokerId, kind } } });
  return row ? (JSON.parse(row.config) as T) : null;
}

export async function setConfig(brokerId: string, kind: string, config: object) {
  await db.integration.upsert({
    where: { brokerId_kind: { brokerId, kind } },
    update: { config: JSON.stringify(config) },
    create: { brokerId, kind, config: JSON.stringify(config) },
  });
}

export async function clearConfig(brokerId: string, kind: string) {
  await db.integration.deleteMany({ where: { brokerId, kind } });
}

// "shpat_1234…abcd" style, for showing that a secret is set without showing it.
export const mask = (s?: string) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : null);
