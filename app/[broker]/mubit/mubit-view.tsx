"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ChevronRight, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { ConnectorLogo } from "@/components/connector-logos";
import { PageHeader, Status } from "@/components/page";
import { cn } from "@/lib/utils";

type MubitStatus = "ok" | "rejected" | "missing";

type Precedent = {
  id: number;
  lineText: string;
  oldCode: string;
  newCode: string;
  reason: string;
  createdAt: string;
  uses: number;
  variantCount: number;
  variantsMatched: number;
  requestIds: string[];
};

type Data = {
  broker: string;
  model: string;
  prompt: string;
  hasKey: boolean;
  status: MubitStatus;
  corrections: number;
  applied: number;
  paraphrases: number;
  trainAfter: number;
  examples: number;
  progress: number;
  precedents: Precedent[];
  lastRequestId: string | null;
  recent: { text: string; code: string; at: string; source: string; requestIds: string[] }[];
};

const CONSOLE = "https://app.mubit.ai/console/";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const SOURCE: Record<string, string> = {
  invoices: "Invoice",
  variants: "Paraphrase",
  "retro-scan": "3-year check",
  "never-seen": "Unseen test",
};

export function MubitView({ broker }: { broker: string }) {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    fetch(`/api/${broker}/mubit`)
      .then((r) => r.json())
      .then(setD);
  }, [broker]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Learning"
        prue="mubit"
        description="How Precedent learns your firm's way of classifying: every correction is applied straight away, and sent to your firm's own Mubit task to train a model."
        actions={
          <Button variant="outline" asChild>
            <a href={CONSOLE} target="_blank" rel="noreferrer">
              Open Mubit console <ExternalLink />
            </a>
          </Button>
        }
      />

      {d === null ? (
        <p className="text-sm text-muted-foreground">Loading what your firm has taught Precedent…</p>
      ) : (
        <>
          {d.status !== "ok" && <KeyNotice status={d.status} />}
          <Loop d={d} />
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Learned broker={broker} d={d} />
            <Task d={d} />
          </div>
          <Examples broker={broker} d={d} />
        </>
      )}
    </div>
  );
}

function KeyNotice({ status }: { status: Exclude<MubitStatus, "ok"> }) {
  return (
    <p className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-[15px]">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-warn" aria-hidden />
      {status === "rejected" ? (
        <span>
          The Mubit key on this server was rejected, so new checks aren&apos;t being recorded. Corrections still work locally; add a
          working key to resume.
        </span>
      ) : (
        <span>
          There is no Mubit key on this server, so nothing is sent to Mubit. Corrections still work locally; add{" "}
          <span className="font-mono text-sm">MUBIT_API_KEY</span> to resume.
        </span>
      )}
    </p>
  );
}

/* The centrepiece: correct → apply → send → train, with what has actually happened at each step. */
function Loop({ d }: { d: Data }) {
  const towards = Math.min(d.examples, d.trainAfter);
  const reached = d.examples >= d.trainAfter;
  return (
    <section aria-labelledby="loop" className="overflow-hidden rounded-xl bg-primary text-primary-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 pt-5 sm:px-7 sm:pt-6">
        <h2 id="loop" className="desk-kicker text-[1.35rem]">
          The learning loop
        </h2>
        <p className="text-sm text-primary-foreground/70">Live counts for {d.broker}</p>
      </div>

      <ol className="grid gap-0 px-5 pb-2 pt-4 sm:px-7 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.3fr] lg:items-stretch">
        <LoopStep n={1} title="You correct a code" value={d.corrections} unit={d.corrections === 1 ? "correction" : "corrections"}>
          A broker changes a wrong code on an invoice and says why.
          <span className="mt-2 flex items-center gap-1.5 text-xs text-primary-foreground/70">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden /> Saved as a precedent for your firm only
          </span>
        </LoopStep>
        <Arrow />
        <LoopStep n={2} title="Applied to similar products" value={d.applied} unit={d.applied === 1 ? "line answered" : "lines answered"}>
          by a correction straight away, on later invoices and the 3-year check. No retraining needed.
        </LoopStep>
        <Arrow />
        <LoopStep
          n={3}
          title={
            <span className="inline-flex items-center gap-2">
              Sent to Mubit <ConnectorLogo id="mubit" size={18} className="rounded-sm ring-1 ring-white/30" />
            </span>
          }
          value={d.examples}
          unit={d.examples === 1 ? "example" : "examples"}
        >
          on this firm&apos;s task, including {plural(d.paraphrases, "paraphrase")} of corrected lines. Every completed check counts.
        </LoopStep>
        <Arrow />
        <li className="space-y-3 rounded-lg bg-white/[0.07] px-4 py-4 ring-1 ring-white/15 lg:my-1">
          <p className="flex items-center gap-2 text-sm text-primary-foreground/70">
            <StepNo n={4} /> Trained model
          </p>
          <div className="flex items-center gap-4">
            <Ring value={towards} max={d.trainAfter} />
            <div className="min-w-0 space-y-1.5">
              <p className="font-serif text-xl leading-snug">
                {reached ? "Enough examples for a first training" : <>at {d.trainAfter} examples</>}
              </p>
              <p className="text-xs leading-relaxed text-primary-foreground/65">
                first training possible at {d.trainAfter} · we can&apos;t see Mubit&apos;s training state
              </p>
            </div>
          </div>
        </li>
      </ol>

      <p className="flex items-start gap-2.5 border-t border-white/10 px-5 py-3.5 text-sm text-primary-foreground/75 sm:px-7">
        <RotateCcw aria-hidden className="mt-0.5 size-4 shrink-0 text-primary-foreground" />
        <span>
          Once Mubit trains a model on these examples, it answers new lines the way your firm does, and every new correction feeds it
        again. Mubit&apos;s console is the source of truth for what it kept.
        </span>
      </p>
    </section>
  );
}

function StepNo({ n }: { n: number }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/35 font-serif text-xs font-semibold">
      {n}
    </span>
  );
}

function LoopStep({
  n,
  title,
  value,
  unit,
  children,
}: {
  n: number;
  title: React.ReactNode;
  value: number;
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <li className="space-y-2 py-4 lg:py-5">
      <p className="flex items-center gap-2 text-sm text-primary-foreground/70">
        <StepNo n={n} /> {title}
      </p>
      <p className="flex items-baseline gap-2">
        <span className="font-serif text-5xl font-semibold leading-none tabular-nums">{value}</span>
        <span className="text-sm text-primary-foreground/80">{unit}</span>
      </p>
      <p className="text-sm leading-relaxed text-primary-foreground/70">{children}</p>
    </li>
  );
}

function Arrow() {
  return (
    <li aria-hidden className="flex items-center justify-start py-0 pl-1 text-primary-foreground/45 lg:justify-center lg:px-4">
      <ArrowRight className="hidden size-5 lg:block" />
      <ArrowDown className="size-4 lg:hidden" />
    </li>
  );
}

function Ring({ value, max }: { value: number; max: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const p = max ? Math.min(1, value / max) : 0;
  return (
    <div
      className="relative size-24 shrink-0"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Examples sent toward Mubit's first training"
    >
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#4cc97f"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-[stroke-dashoffset] duration-700"
          opacity={p === 0 ? 0 : 1}
        />
      </svg>
      <p className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-serif text-2xl font-semibold tabular-nums">{value}</span>
        <span className="mt-0.5 text-[11px] text-primary-foreground/65">of {max}</span>
      </p>
    </div>
  );
}

function Task({ d }: { d: Data }) {
  const status = {
    ok: d.lastRequestId ? <Status tone="good">Recording</Status> : <Status tone="idle">Key set</Status>,
    rejected: <Status tone="warn">Key rejected</Status>,
    missing: <Status tone="warn">No key</Status>,
  }[d.status];
  return (
    <section aria-labelledby="task" className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 id="task" className="desk-kicker flex items-center gap-2">
          <ConnectorLogo id="mubit" size={22} /> Your firm&apos;s task
        </h2>
        {status}
      </div>
      <p className="px-5 pt-2 text-sm text-muted-foreground">
        Private to {d.broker}: other firms on Precedent have their own task, so one firm&apos;s corrections never train another&apos;s model.
      </p>
      <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
        <Row k="Model">
          <span className="font-mono text-[13px]">{d.model}</span>
        </Row>
        <Row k="Examples sent">
          <span className="tabular-nums">{d.examples}</span>
        </Row>
        <Row k="Last request">
          {d.lastRequestId ? (
            <span className="block truncate font-mono text-[13px]" title={d.lastRequestId}>
              {d.lastRequestId}
            </span>
          ) : (
            <span className="text-muted-foreground">none recorded</span>
          )}
        </Row>
      </dl>
      <details className="group px-5 py-3.5">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          Instructions the model follows
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Mubit groups calls by model, instructions, tools and output format. Only your firm&apos;s name differs here, which is what makes
          this task yours.
        </p>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3.5 font-mono text-xs leading-relaxed">
          {d.prompt}
        </pre>
      </details>
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 px-5 py-2.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Learned({ broker, d }: { broker: string; d: Data }) {
  return (
    <section aria-labelledby="learned" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="learned" className="desk-kicker">
          What it learned
        </h2>
        {d.corrections > 0 && (
          <Link href={`/${broker}/precedents`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            All corrections{d.corrections > d.precedents.length ? ` (${d.corrections})` : ""}
          </Link>
        )}
      </div>
      {d.precedents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-8 text-[15px] text-muted-foreground">
          Nothing yet. When a broker corrects a code on an invoice, the correction and its reason appear here, with how far it has
          spread.{" "}
          <Link href={`/${broker}/classify`} className="font-medium text-primary underline-offset-4 hover:underline">
            Open an invoice
          </Link>
        </div>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {d.precedents.slice(0, 5).map((p) => (
            <li key={p.id} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
                <p className="min-w-0 font-medium leading-snug [overflow-wrap:anywhere]">{p.lineText}</p>
                <p className="flex shrink-0 items-center gap-1.5 text-[14px]">
                  <span className="sr-only">Changed from</span>
                  <Code code={p.oldCode} className="text-muted-foreground line-through decoration-brand/70" />
                  <ArrowRight className="size-3.5 text-primary" aria-hidden />
                  <span className="sr-only">to</span>
                  <Code code={p.newCode} className="text-primary" />
                </p>
              </div>
              <p className="border-l-2 border-primary/20 pl-3 font-serif text-[15px] italic leading-snug text-foreground/80 [overflow-wrap:anywhere]">
                “{p.reason}”
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                <span>
                  Applied to <span className="font-medium text-foreground">{plural(p.uses, "line")}</span>
                </span>
                <span>
                  {p.variantCount === 0 ? (
                    "No paraphrases sent yet"
                  ) : p.requestIds.length === 0 && d.status !== "ok" ? (
                    <>{plural(p.variantCount, "paraphrase")} written, not recorded by Mubit ({d.status === "missing" ? "no key" : "key rejected"})</>
                  ) : (
                    <>
                      {plural(p.variantCount, "paraphrase")} sent{" "}
                      <span className={cn(p.requestIds.length > 0 && "text-good")}>({p.requestIds.length} recorded)</span>
                    </>
                  )}
                </span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Examples({ broker, d }: { broker: string; d: Data }) {
  return (
    <section aria-labelledby="examples" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="examples" className="desk-kicker">
          Examples sent
        </h2>
        <p className="text-sm text-muted-foreground">Latest {Math.min(d.recent.length, 15) || ""} first. What this app sent, not what Mubit kept.</p>
      </div>
      {d.recent.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-[15px] text-muted-foreground">No examples sent yet. Correct a code on an invoice, or take the product tour.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link href={`/${broker}/classify`}>Open invoices</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${broker}/tour`}>Take the tour</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-normal">Product line</th>
                <th className="px-3 py-2.5 font-normal">Code</th>
                <th className="px-3 py-2.5 font-normal">Source</th>
                <th className="px-5 py-2.5 font-normal">Mubit request</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.recent.map((r, i) => (
                <tr key={i} className="align-top">
                  <td className="max-w-[26rem] px-5 py-2.5 [overflow-wrap:anywhere]">{r.text}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Code code={r.code} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{SOURCE[r.source] ?? r.source}</td>
                  <td className="px-5 py-2.5">
                    {r.requestIds.length > 0 ? (
                      <span className="font-mono text-xs" title={r.requestIds.join("\n")}>
                        {r.requestIds[0].slice(0, 18)}
                        {r.requestIds[0].length > 18 ? "…" : ""}
                        {r.requestIds.length > 1 && <span className="text-muted-foreground"> +{r.requestIds.length - 1}</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">not recorded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
