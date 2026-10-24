import { db } from "@/lib/db";
import { uk10 } from "@/lib/codes";
import { possessive } from "@/lib/utils";
import {
  bindingPrecedent,
  classifyWithRetry,
  isSimilar,
  mubitExampleCount,
  neverSeenItems,
  neverSeenLine,
  neverSeenState,
  pool,
  sseResponse,
  teachVariants,
} from "@/lib/run";
import { TRAIN_AFTER } from "@/lib/mubit";

// POST { suggestionId, code, reason } → SSE stream of rail steps, re-classified lines and never-seen results.
export async function POST(req: Request, { params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const { suggestionId, code, reason } = (await req.json()) as { suggestionId: number; code: string; reason: string };
  const newCode = uk10(code);
  if (!newCode) {
    return Response.json({ error: "Corrected code must be 10 digits" }, { status: 400 });
  }

  const original = await db.suggestion.findUniqueOrThrow({ where: { id: suggestionId }, include: { line: true } });
  const line = original.line;
  const brokers = await db.broker.findMany({ orderBy: { name: "asc" } });
  const me = brokers.find((b) => b.id === broker)!;
  const others = brokers.filter((b) => b.id !== broker);

  return sseResponse(async (send) => {
    const step = (id: "saved" | "batch" | "never-seen" | "others" | "variants" | "mubit", state: "running" | "done", detail: string) =>
      send("step", { id, state, detail });

    // Never-seen items that look like the fixed line. Their "before" must exist before the
    // precedent does, so run any missing baseline first.
    const items = neverSeenItems().filter((i) => isSimilar(line.text, i.text));
    const baseline: { broker: string; text: string }[] = [];
    for (const b of brokers)
      for (const i of items) {
        const l = await neverSeenLine(b.id, i.text);
        if ((await db.suggestion.count({ where: { lineId: l.id } })) === 0) baseline.push({ broker: b.id, text: i.text });
      }
    if (baseline.length) {
      step("saved", "running", `Recording how ${baseline.length} unseen items look before the fix`);
      await pool(baseline, 8, async (j) => {
        try {
          await classifyWithRetry(j.broker, await neverSeenLine(j.broker, j.text));
        } catch {
          // Baseline failure is persisted as model:error; the rail still continues.
        }
      });
    }

    const precedent = await db.precedent.create({
      data: { brokerId: broker, lineText: line.text, oldCode: original.code, newCode, reason },
    });
    const [oldTariff, newTariff] = await Promise.all([
      db.tariff.findUnique({ where: { code: original.code } }),
      db.tariff.findUnique({ where: { code: newCode } }),
    ]);
    const corrected = await db.suggestion.create({
      data: {
        lineId: line.id,
        code: newCode,
        reason: `Corrected by ${me.name}: ${reason}`,
        confidence: 1,
        flagged: false,
        status: "corrected",
        precedentId: precedent.id,
        model: "broker",
        mubitRequestId: original.mubitRequestId,
        toolCalls: "[]",
      },
    });
    send("line", { lineId: line.id, suggestion: corrected });
    send("lesson", {
      precedentId: precedent.id,
      lineText: line.text,
      reason,
      oldCode: original.code,
      newCode,
      oldRate: oldTariff?.dutyRate ?? null,
      newRate: newTariff?.dutyRate ?? null,
    });
    step("saved", "done", `Precedent #${precedent.id} saved with your reason`);

    const batchLines = (
      await db.line.findMany({
        where: { brokerId: broker, batchId: line.batchId, id: { not: line.id } },
        include: { suggestions: { orderBy: { id: "desc" }, take: 1 } },
      })
    ).filter((l) => isSimilar(line.text, l.text) && !["approved", "corrected"].includes(l.suggestions[0]?.status ?? ""));

    step("batch", "running", batchLines.length ? `Re-checking ${batchLines.length} similar lines in this invoice` : "No similar lines in this invoice");
    step("never-seen", "running", `Trying ${items.length} products ${me.name} has never classified`);
    step("others", "running", `Checking ${others.map((o) => o.name).join(", ")} is unaffected`);
    step("variants", "running", "Sending paraphrased examples through Mubit");

    let mubitCalls = 0;
    let batchDone = 0;
    let mineDone = 0;
    let othersDone = 0;
    const jobs = [
      ...batchLines.map((l) => ({ kind: "batch" as const, broker, line: l })),
      ...items.map((i) => ({ kind: "mine" as const, broker, text: i.text })),
      ...others.flatMap((o) => items.map((i) => ({ kind: "others" as const, broker: o.id, text: i.text }))),
    ];

    const taughtP = teachVariants(broker, { id: precedent.id, lineText: line.text, newCode }, (p) => {
      send("variant", p);
      step("variants", "running", p.skipped === "no-key"
        ? `Prepared ${p.done} of ${p.total} paraphrases (not sent — no Mubit key)`
        : `Sent ${p.done} of ${p.total} paraphrases through Mubit`);
    });

    await pool(jobs, 8, async (job) => {
      try {
        const target = "line" in job ? job.line : await neverSeenLine(job.broker, job.text);
        const r = await classifyWithRetry(job.broker, target);
        if (job.broker === broker) mubitCalls += r.mubitCalls;
        if (job.kind === "batch") {
          send("line", { lineId: target.id, suggestion: r.suggestion });
          if (++batchDone === batchLines.length) step("batch", "done", `${batchLines.length} similar lines re-checked`);
        } else {
          send("never-seen", await neverSeenState(brokers.map((b) => b.id)));
          if (job.kind === "mine" && ++mineDone === items.length) step("never-seen", "done", `${items.length} unseen products re-run with precedent #${precedent.id}`);
          if (job.kind === "others" && ++othersDone === items.length * others.length) step("others", "done", `${others.map((o) => o.name).join(", ")} re-run without it`);
        }
      } catch (e) {
        send("job-error", { message: (e as Error).message });
        // If the model call failed but a house precedent covers this line, still
        // apply it so the flip is visible (model:"precedent" — not a Mubit example).
        if (job.kind === "others") return;
        const text = "line" in job ? job.line.text : job.text;
        const hit = await bindingPrecedent(job.broker, text);
        if (!hit) return;
        const target = "line" in job ? job.line : await neverSeenLine(job.broker, job.text);
        const suggestion = await db.suggestion.create({
          data: {
            lineId: target.id,
            code: hit.newCode,
            reason: `Applied precedent #${hit.id}: ${hit.reason}`,
            confidence: 1,
            flagged: false,
            precedentId: hit.id,
            model: "precedent",
            toolCalls: "[]",
          },
        });
        if (job.kind === "batch") {
          send("line", { lineId: target.id, suggestion });
          if (++batchDone === batchLines.length) step("batch", "done", `${batchLines.length} similar lines re-checked`);
        } else {
          send("never-seen", await neverSeenState(brokers.map((b) => b.id)));
          if (job.kind === "mine" && ++mineDone === items.length) {
            step("never-seen", "done", `${items.length} unseen products re-run with precedent #${precedent.id}`);
          }
        }
      }
    });
    step("batch", "done", batchLines.length ? `${batchDone} of ${batchLines.length} similar lines re-checked` : "No similar lines in this invoice");
    step("never-seen", "done", items.length ? `${mineDone} unseen products re-run with precedent #${precedent.id}` : "No similar unseen products to try");
    step("others", "done", items.length ? `${others.map((o) => o.name).join(", ")} re-run without it` : "Nothing to compare");

    const taught = await taughtP;
    mubitCalls += taught.requestIds.length;
    step(
      "variants",
      "done",
      taught.skipped === "no-key"
        ? "Precedent saved. Paraphrases were prepared but not sent (no Mubit key)."
        : `Sent ${taught.sent} paraphrases through Mubit; ${taught.matched} came back as ${newCode}`,
    );

    const examples = await mubitExampleCount(broker);
    send("teach", { examples, trainAfter: TRAIN_AFTER, variants: taught });
    step("mubit", "done", `${mubitCalls} calls recorded by Mubit in ${possessive(me.name)} task · ${examples} of ${TRAIN_AFTER} examples sent`);
    send("summary", {
      precedentId: precedent.id,
      items: items.map((i) => i.text),
      variants: taught,
      examples,
      trainAfter: TRAIN_AFTER,
    });
  });
}
