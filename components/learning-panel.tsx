"use client";

import { Check, Loader2, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { Info } from "@/components/info";
import { cn, possessive } from "@/lib/utils";

export type RailStep = { id: string; state: "waiting" | "running" | "done"; detail: string };

export type NeverSeenItem = {
  text: string;
  shouldChange: boolean;
  brokers: Record<string, { before: { code: string } | null; now: { code: string; precedentId: number | null } | null }>;
};

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

// Right-hand panel: the learning rail for the last fix, and never-seen items per broker.
export function LearningPanel({
  broker,
  brokers,
  rail,
  items,
  preparing,
  onClose,
}: {
  broker: string;
  brokers: { id: string; name: string }[];
  rail: RailStep[] | null;
  items: NeverSeenItem[];
  preparing: boolean;
  onClose: () => void;
}) {
  const me = brokers.find((b) => b.id === broker);
  const others = brokers.filter((b) => b.id !== broker);

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

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="flex items-center gap-1.5 font-serif text-xl">Never-seen products <Info id="neverSeen" side="left" /></h3>
            {preparing && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Preparing baseline…
              </span>
            )}
          </div>
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
                          <span className="text-xs text-muted-foreground">—</span>
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
          <p className="text-xs text-muted-foreground">
            Struck-through codes are what the AI said before the fix. Other brokers never see {me ? possessive(me.name) : "this broker\u2019s"} precedents.
          </p>
        </section>
      </div>
    </aside>
  );
}
