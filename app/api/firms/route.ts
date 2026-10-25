import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { parseCsvLine } from "@/lib/csv";
import { setConfig } from "@/lib/integrations";

// GET → every customs firm (broker workspace) on this server.
export async function GET() {
  const firms = await db.broker.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { clients: true, lines: true, pastEntries: true } } } });
  return Response.json(firms.map((f) => ({ id: f.id, name: f.name, clients: f._count.clients, lines: f._count.lines, pastEntries: f._count.pastEntries })));
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "firm";

// POST { name, sampleHistory? } → a new, empty firm. With sampleHistory, it gets the demo's 3 years of
// past imports so the duty check has something to look at; the Duty reclaim page says they are sample data.
export async function POST(req: Request) {
  const { name, sampleHistory } = (await req.json()) as { name?: string; sampleHistory?: boolean };
  if (!name?.trim()) return Response.json({ error: "Enter your firm's name" }, { status: 400 });
  let id = slug(name);
  for (let n = 2; await db.broker.findUnique({ where: { id } }); n++) id = `${slug(name)}-${n}`;
  const firm = await db.broker.create({ data: { id, name: name.trim() } });
  if (sampleHistory) {
    const [, ...rows] = readFileSync("data/harbourline-past-entries.csv", "utf8").trim().split("\n");
    await db.pastEntry.createMany({
      data: rows.map((row) => {
        const [entryDate, text, declaredCode, value, duty] = parseCsvLine(row);
        return { brokerId: id, entryDate, text, declaredCode, customsValue: Number(value), dutyPaid: Number(duty) };
      }),
    });
    await setConfig(`sample-history:${id}`, { at: new Date().toISOString() });
  }
  return Response.json(firm);
}
