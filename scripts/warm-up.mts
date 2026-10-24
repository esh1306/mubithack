// bun run script scripts/warm-up.mts [broker] — sends every sample invoice line through the
// broker's classify task, so Mubit has plenty of varied, kept examples to train an adapter on.
// Results are saved as invoices, so they also show up in the app.
import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { parseCsv } from "../lib/csv";
import { classifyWithRetry, pool } from "../lib/run";

const broker = process.argv[2] ?? "harbourline";
const index: { id: string; name: string }[] = JSON.parse(readFileSync("data/samples/index.json", "utf8"));

let done = 0;
let failed = 0;
let mubitCalls = 0;
const total = index.reduce((n, s) => n + parseCsv(readFileSync(`data/samples/${s.id}.csv`, "utf8")).length, 0);

for (const sample of index) {
  const batchId = crypto.randomUUID();
  const lines = [];
  for (const r of parseCsv(readFileSync(`data/samples/${sample.id}.csv`, "utf8"))) {
    lines.push(
      await db.line.create({
        data: { brokerId: broker, batchId, text: r.description, qty: Number(r.qty), value: Number(r.value_gbp), origin: r.origin },
      }),
    );
  }
  await pool(lines, 6, async (line) => {
    try {
      // Await first: "total += await x" reads total before the await and loses concurrent updates.
      const r = await classifyWithRetry(broker, line);
      mubitCalls += r.mubitCalls;
    } catch {
      failed++;
    }
    done++;
  });
  console.log(`${sample.name}: done (${done}/${total} lines, ${mubitCalls} Mubit calls, ${failed} failed)`);
}
console.log(`\nSent ${done - failed} lines for ${broker} through Mubit in ${mubitCalls} calls.`);
