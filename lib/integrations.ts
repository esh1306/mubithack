import { db } from "@/lib/db";

// Saved sign-ins live in SQLite on this machine, one per outside system for the whole app,
// so connecting once works for every broker and survives restarts. Secrets never go to the browser.
export async function getConfig<T>(kind: string): Promise<T | null> {
  const row = await db.credential.findUnique({ where: { kind } });
  return row ? (JSON.parse(row.config) as T) : null;
}

export async function setConfig(kind: string, config: object) {
  await db.credential.upsert({
    where: { kind },
    update: { config: JSON.stringify(config) },
    create: { kind, config: JSON.stringify(config) },
  });
}

export async function clearConfig(kind: string) {
  await db.credential.deleteMany({ where: { kind } });
}

// "shpat_1234…abcd" style, for showing that a secret is set without showing it.
export const mask = (s?: string) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : null);
