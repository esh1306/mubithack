// bun run script scripts/train-adapter.mts [broker] — sends the varied lines in data/training/lines.csv
// through the broker's classify task, so Mubit has more kept examples to train that task's adapter on.
// Lines go to the "training" batch, which the desk hides. Re-running skips lines already coded.
import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { parseCsv } from "../lib/csv";
import { classifyWithRetry, pool, TRAINING_BATCH } from "../lib/run";

const broker = process.argv[2] ?? "harbourline";
const rows = parseCsv(readFileSync("data/training/lines.csv", "utf8"));

const coded = new Set(
  (await db.line.findMany({ where: { brokerId: broker, batchId: TRAINING_BATCH, suggestions: { some: { model: { not: "error" } } } }, select: { text: true } })).map((l) => l.text),
);
const todo = rows.filter((r) => !coded.has(r.description));
console.log(`${rows.length} training lines, ${coded.size} already coded, ${todo.length} to send for ${broker}.`);

let done = 0;
let failed = 0;
let mubitCalls = 0;
await pool(todo, 4, async (r) => {
  const existing = await db.line.findFirst({ where: { brokerId: broker, batchId: TRAINING_BATCH, text: r.description } });
  const line =
    existing ??
    (await db.line.create({
      data: { brokerId: broker, batchId: TRAINING_BATCH, text: r.description, qty: Number(r.qty), value: Number(r.value_gbp), origin: r.origin },
    }));
  try {
    // Await first: "total += await x" reads total before the await and loses concurrent updates.
    const res = await classifyWithRetry(broker, line);
    mubitCalls += res.mubitCalls;
  } catch {
    failed++;
  }
  done++;
  if (done % 10 === 0 || done === todo.length) console.log(`${done}/${todo.length} lines · ${mubitCalls} Mubit calls · ${failed} failed`);
});
console.log(`\nSent ${done - failed} lines for ${broker} through Mubit in ${mubitCalls} calls.`);
