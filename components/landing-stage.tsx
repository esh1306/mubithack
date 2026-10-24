"use client";

import { DEMO_BAMBOO_CODE } from "@/lib/demo";
import { uk10 } from "@/lib/codes";

const SAMPLE = "Bamboo kids' dinner set, plate bowl cup";
const OLD = "4419190000";
const NEW = DEMO_BAMBOO_CODE;

function pretty(code: string) {
  const d = uk10(code) ?? code;
  return `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** Static scripted sample. The live classify endpoint writes invoices — not safe from the public landing. */
export function LandingStage() {
  return (
    <div className="landing-stage flex h-full min-h-[22rem] flex-col justify-between rounded-md border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="landing-kicker text-primary">Scripted sample</p>
        <p className="text-[11px] font-medium text-muted-foreground">Bamboo line from the 3-minute demo</p>
      </div>

      <p className="landing-lede mt-4 text-[1.35rem] sm:text-[1.6rem]">{SAMPLE}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border/80 bg-background px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Suggested</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-tight line-through opacity-45">{pretty(OLD)}</p>
          <p className="text-sm text-muted-foreground">72% sure · 0% duty</p>
        </div>
        <div className="rounded-md border border-primary/35 bg-primary/[0.04] px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">Corrected</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-primary">{pretty(NEW)}</p>
          <p className="text-sm text-muted-foreground">6% · plastics, not wood</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border/70 pt-3">
        <p className="max-w-[34ch] text-[13px] leading-snug text-muted-foreground">
          Receipt: decided just now · tariff notes read · no precedent yet · Mubit request not sent from this page.
        </p>
        <span className="inline-flex rotate-[-6deg] items-center rounded-sm border-2 border-primary px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">
          Precedent saved
        </span>
      </div>
    </div>
  );
}
