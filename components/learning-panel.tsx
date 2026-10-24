"use client";

import { Check, Loader2, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Code } from "@/components/code";
import { Info } from "@/components/info";
import { prettyRate } from "@/lib/demo";
import { cn, possessive } from "@/lib/utils";

export type RailStep = { id: string; state: "waiting" | "running" | "done"; detail: string };

export type NeverSeenItem = {
  text: string;
  shouldChange: boolean;
  brokers: Record<string, { before: { code: string } | null; now: { code: string; precedentId: number | null } | null }>;
};

export type Lesson = {
  precedentId: number;
  lineText: string;
  reason: string;
  oldCode: string;
  newCode: string;
  oldRate: string | null;
  newRate: string | null;
};

export type VariantRow = {
  done: number;
  total: number;
  text: string;
  requestIds: string[];
  code: string | null;
  matched: boolean;
  skipped: string | null;
  examples: number;
  trainAfter: number;
};

export type TeachState = { examples: number; trainAfter: number };

export const RAIL_TEMPLATE: RailStep[] = [
  { id: "saved", state: "waiting", detail: "Save the fix as a precedent" },
  { id: "batch", state: "waiting", detail: "Re-check similar lines in this invoice" },
  { id: "never-seen", state: "waiting", detail: "Try products it has never seen" },
  { id: "others", state: "waiting", detail: "Check other brokers are unaffected" },
  { id: "variants", state: "waiting", detail: "Send paraphrased examples through Mubit" },
  { id: "mubit", state: "waiting", detail: "Record the calls in Mubit" },
];

function StepIcon({ state }: { state: RailStep["state"] }) {
  if (state === "done") return <Check className="size-3.5" />;
  if (state === "running") return <Loader2 className="size-3.5 animate-spin" />;
  return null;
}

function BeforeAfter({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-primary">What changed</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Before your fix</p>
          <p className="text-[15px]">
            <Code code={lesson.oldCode} className="line-through opacity-60" /> at {prettyRate(lesson.oldRate)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">After</p>
          <p className="text-[15px]">
            <Code code={lesson.newCode} className="text-primary" /> at {prettyRate(lesson.newRate)}
          </p>
          <p className="text-sm text-primary">because of Precedent #{lesson.precedentId}</p>
        </div>
      </div>
      <p className="font-serif text-[17px] italic leading-snug text-foreground/80">“{lesson.reason}”</p>
    </section>
  );
}

// Right-hand panel: the learning rail for the last fix, and never-seen items per broker.
export function LearningPanel({
  broker,
  brokers,
  rail,
  items,
  preparing,
  lesson,
  variants,
  teach,
  error,
  onClose,
}: {
  broker: string;
  brokers: { id: string; name: string }[];
  rail: RailStep[] | null;
  items: NeverSeenItem[];
  preparing: boolean;
  lesson: Lesson | null;
  variants: VariantRow[];
  teach: TeachState | null;
  error?: string | null;
  onClose: () => void;
}) {
  const me = brokers.find((b) => b.id === broker);
  const others = brokers.filter((b) => b.id !== broker);
  const latest = variants.at(-1);
  const examples = teach?.examples ?? latest?.examples ?? 0;
  const trainAfter = teach?.trainAfter ?? latest?.trainAfter ?? 25;
  const sent = variants.filter((v) => v.skipped !== "no-key").length;
  const prepared = variants.length;
  const noKey = latest?.skipped === "no-key";

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[34rem] max-w-full flex-col border-l border-border/70 bg-card shadow-2xl">
      <header className="flex items-start justify-between border-b border-border/70 px-6 py-5">
        <div>
          <h2 className="flex items-center gap-1.5 font-serif text-[28px] leading-none">Learning <Info id="learning" /></h2>
          <p className="mt-1.5 text-sm text-muted-foreground">One fix, applied to products {me?.name} has never seen.</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X />
        </Button>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
        {error && (
          <p className="rounded-md border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>
        )}

        {lesson ? <BeforeAfter lesson={lesson} /> : (
          <p className="text-sm text-muted-foreground">Save a fix on a line to see before and after on this screen.</p>
        )}

        <ol className="space-y-3">
          {(rail ?? RAIL_TEMPLATE).map((s, i) => (
            <li key={s.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums",
                  s.state === "done" && "border-primary bg-primary text-primary-foreground",
                  s.state === "running" && "border-primary text-primary",
                  s.state === "waiting" && "text-muted-foreground",
                )}
              >
                {s.state === "waiting" ? i + 1 : <StepIcon state={s.state} />}
              </span>
              <p className={cn("pt-0.5 text-[15px]", s.state === "waiting" && "text-muted-foreground")}>{s.detail}</p>
            </li>
          ))}
        </ol>

        {(prepared > 0 || preparing) && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-serif text-xl">Teaching Mubit</h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {examples} of {trainAfter} examples toward train
              </span>
            </div>
            <Progress value={Math.min(100, (examples / Math.max(trainAfter, 1)) * 100)} />
            <p className="text-sm text-muted-foreground">
              {noKey
                ? `Prepared ${prepared} paraphrases. Not sent — no Mubit key on this machine.`
                : latest
                  ? `Sent ${latest.done} of ${latest.total} paraphrases through this broker’s Mubit task.`
                  : preparing
                    ? "Preparing paraphrases…"
                    : null}
            </p>
            {variants.length === 0 && preparing && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Waiting for the first paraphrase…
              </p>
            )}
            {variants.length > 0 && (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border/70 p-3">
                {variants.map((v, i) => (
                  <li key={`${v.text}-${i}`} className="space-y-0.5 text-xs">
                    <p className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{v.text}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {v.skipped === "no-key" ? "not sent" : v.matched ? "matched" : v.code ? "sent" : "…"}
                      </span>
                    </p>
                    {v.requestIds.length > 0 && (
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{v.requestIds.join("  ")}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              {sent} sent · this app counts examples it sent. Mubit&apos;s console is the source of truth for keep/train.
            </p>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="flex items-center gap-1.5 font-serif text-xl">Never-seen products <Info id="neverSeen" side="left" /></h3>
            {preparing && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Working…
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Similar products this broker has never classified will appear here after a fix.
            </p>
          ) : (
          <div className="overflow-hidden rounded-xl border border-border/70">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-left font-medium">{me?.name}</th>
                  {others.map((o) => (
                    <th key={o.id} className="px-3 py-2 text-left font-medium">{o.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const mine = item.brokers[broker];
                  const changed = mine?.before && mine?.now && mine.before.code !== mine.now.code;
                  return (
                    <tr key={item.text} className="border-t align-top">
                      <td className="px-3 py-2.5">
                        <p className="font-medium leading-snug">{item.text}</p>
                        {!item.shouldChange && <p className="text-xs text-muted-foreground">Should stay the same</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        {!mine?.now ? (
                          <span className="text-xs text-muted-foreground">{preparing ? "Checking…" : "—"}</span>
                        ) : changed ? (
                          <div className="space-y-0.5">
                            <Code code={mine.before!.code} className="text-xs line-through opacity-50" />
                            <div className="flex items-center gap-1">
                              <ArrowRight className="size-3 text-primary" />
                              <Code code={mine.now.code} className="text-xs text-primary" />
                            </div>
                            {mine.now.precedentId && (
                              <p className="text-[11px] text-primary">learned from #{mine.now.precedentId}</p>
                            )}
                          </div>
                        ) : (
                          <Code code={mine.now.code} className="text-xs" />
                        )}
                      </td>
                      {others.map((o) => {
                        const theirs = item.brokers[o.id];
                        return (
                          <td key={o.id} className="px-3 py-2.5">
                            {theirs?.now ? <Code code={theirs.now.code} className="text-xs" /> : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
          <p className="text-xs text-muted-foreground">
            Struck-through codes are what the AI said before the fix. Other brokers never see {me ? possessive(me.name) : "this broker\u2019s"} precedents.
          </p>
        </section>
      </div>
    </aside>
  );
}
