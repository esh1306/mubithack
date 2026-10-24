import { db } from "@/lib/db";
import { classifyAndSave, neverSeenItems, neverSeenLine, neverSeenState, pool } from "@/lib/run";

async function brokerIds() {
  return (await db.broker.findMany({ orderBy: { name: "asc" } })).map((b) => b.id);
}

// Current before/now results for every never-seen item and every broker.
export async function GET() {
  return Response.json(await neverSeenState(await brokerIds()));
}

// Baseline: classify any never-seen item that has no result yet, for every broker.
export async function POST() {
  const ids = await brokerIds();
  const jobs: { broker: string; text: string }[] = [];
  for (const broker of ids)
    for (const { text } of neverSeenItems()) {
      const line = await neverSeenLine(broker, text);
      if ((await db.suggestion.count({ where: { lineId: line.id } })) === 0) jobs.push({ broker, text });
    }
  await pool(jobs, 8, async ({ broker, text }) => {
    await classifyAndSave(broker, await neverSeenLine(broker, text));
  });
  return Response.json(await neverSeenState(ids));
}
