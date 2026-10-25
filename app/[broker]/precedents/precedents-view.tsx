"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { ConnectorLogo } from "@/components/connector-logos";
import { PageHeader } from "@/components/page";
import { cn } from "@/lib/utils";

type Correction = {
  id: number;
  lineText: string;
  oldCode: string;
  newCode: string;
  reason: string;
  createdAt: string;
  uses: number;
  variantCount: number;
  variantsMatched: number;
  variantsRecorded: boolean;
  pastMatches: number;
};

type Learning = {
  mubit: { status: "ok" | "rejected" | "missing"; examples: number; trainAfter: number };
  pastEntries: number;
  precedents: Correction[];
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function PrecedentsView({ broker }: { broker: string }) {
  const [d, setD] = useState<Learning | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setD(await (await fetch(`/api/${broker}/learning`)).json());
  }, [broker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves
    load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  async function remove(id: number) {
    if (timer.current) clearTimeout(timer.current);
    if (confirmId !== id) {
      setConfirmId(id);
      timer.current = setTimeout(() => setConfirmId(null), 4000);
      return;
    }
    setConfirmId(null);
    await fetch(`/api/${broker}/precedents?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Corrections"
        info="precedents"
        description="Every code your team corrected, and why. Precedent applies each one to similar products automatically, and teaches it to your firm's own Mubit model."
        actions={
          d && d.precedents.length > 0 ? (
            <Button asChild variant="outline">
              <Link href={`/${broker}/classify`}>Correct a code on an invoice</Link>
            </Button>
          ) : undefined
        }
      />

      {d === null ? (
        <p className="text-sm text-muted-foreground">Loading corrections…</p>
      ) : (
        <>
          <HowUsed broker={broker} d={d} />
          {d.precedents.length === 0 ? (
            <Empty broker={broker} />
          ) : (
            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="desk-kicker">{plural(d.precedents.length, "correction")}</h2>
                <p className="text-sm text-muted-foreground">Newest first. Each one is for your firm only.</p>
              </div>
              <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {d.precedents.map((p) => (
                  <Row
                    key={p.id}
                    p={p}
                    mubit={d.mubit.status}
                    confirming={confirmId === p.id}
                    onRemove={() => remove(p.id)}
                  />
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function HowUsed({ broker, d }: { broker: string; d: Learning }) {
  const applied = d.precedents.reduce((n, p) => n + p.uses, 0);
  const { examples, trainAfter, status } = d.mubit;
  const sent = Math.min(examples, trainAfter);
  const pct = trainAfter ? Math.min(100, (examples / trainAfter) * 100) : 0;
  const pastHits = d.precedents.reduce((n, p) => n + p.pastMatches, 0);

  return (
    <section aria-labelledby="how-used" className="rounded-lg border border-border bg-card">
      <h2 id="how-used" className="desk-kicker px-5 pt-5 sm:px-6">
        How your corrections are used
      </h2>
      <div className="grid gap-0 lg:grid-cols-[1fr_1fr_1.35fr]">
        <Step n={1} title="Applied to similar products">
          <p className="font-serif text-4xl font-semibold tabular-nums leading-none">{applied}</p>
          <p className="text-sm text-muted-foreground">
            {applied === 1 ? "line" : "lines"} on later invoices came back with your corrected code, without asking the model again.
          </p>
        </Step>

        <Step n={2} title="Used by the 3-year duty check" className="border-t border-border lg:border-l lg:border-t-0">
          <p className="font-serif text-4xl font-semibold tabular-nums leading-none">{d.pastEntries}</p>
          <p className="text-sm text-muted-foreground">
            past {d.pastEntries === 1 ? "entry" : "entries"} from the last three years are re-checked against your corrections
            {pastHits > 0 ? <>; {plural(pastHits, "entry", "entries")} match one.</> : "."}{" "}
            <Link href={`/${broker}/retro-scan`} className="text-primary underline-offset-4 hover:underline">
              Open the duty check
            </Link>
          </p>
        </Step>

        <Step
          n={3}
          title={
            <span className="flex items-center gap-2">
              Taught to Mubit <ConnectorLogo id="mubit" size={22} />
            </span>
          }
          className="border-t border-border bg-primary/[0.03] lg:border-l lg:border-t-0"
        >
          <p className="flex items-baseline gap-2">
            <span className="font-serif text-4xl font-semibold tabular-nums leading-none">{sent}</span>
            <span className="text-sm text-muted-foreground">of {trainAfter} examples sent</span>
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-foreground/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={trainAfter}
            aria-valuenow={sent}
            aria-label="Examples sent toward Mubit's first training"
          >
            <div className={cn("h-full rounded-full", status === "ok" ? "bg-primary" : "bg-warn")} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            Every classify call is an example on your firm&apos;s own Mubit task, and each correction adds about 20 paraphrased ones.
            Mubit can train a model that classifies the way your firm does; first training at {trainAfter}.
          </p>
          {status === "rejected" && (
            <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-sm">
              The Mubit key on this server was rejected, so new calls fall back to HMRC&apos;s search and are not recorded by Mubit.
              Corrections still work locally.
            </p>
          )}
          {status === "missing" && (
            <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-sm">
              There is no Mubit key on this server, so nothing is sent to Mubit. Corrections still work locally.
            </p>
          )}
          <p className="text-sm">
            <Link href={`/${broker}/mubit`} className="font-medium text-primary underline-offset-4 hover:underline">
              See every example sent to Mubit
            </Link>
          </p>
        </Step>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground sm:px-6">
        These are the examples this app sent. Only Mubit&apos;s console can show whether it kept them or has trained a model.
      </p>
    </section>
  );
}

function Step({
  n,
  title,
  className,
  children,
}: {
  n: number;
  title: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-3 px-5 py-5 sm:px-6", className)}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/30 font-serif text-sm font-semibold text-primary">
          {n}
        </span>
        <h3 className="font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({
  p,
  mubit,
  confirming,
  onRemove,
}: {
  p: Correction;
  mubit: Learning["mubit"]["status"];
  confirming: boolean;
  onRemove: () => void;
}) {
  const unrecorded = mubit === "missing" ? "no Mubit key" : "Mubit key rejected";
  return (
    <li className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_17rem] lg:gap-8">
      <div className="min-w-0 space-y-2.5">
        <p className="text-[16px] font-medium leading-snug [overflow-wrap:anywhere]">{p.lineText}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
          <span className="sr-only">Changed from</span>
          <Code code={p.oldCode} className="text-muted-foreground line-through decoration-bad/70" />
          <ArrowRight className="size-3.5 text-primary" aria-hidden />
          <span className="sr-only">to</span>
          <Code code={p.newCode} className="text-primary" />
        </div>
        <p className="text-xs text-muted-foreground">
          Correction #{p.id} · {when(p.createdAt)}
        </p>
      </div>

      <blockquote className="self-start border-l-2 border-primary/25 pl-4 font-serif text-[17px] italic leading-snug text-foreground/85 [overflow-wrap:anywhere]">
        “{p.reason}”
      </blockquote>

      <div className="flex flex-col items-start gap-3 text-sm lg:border-l lg:border-border lg:pl-6">
        <ul className="space-y-1.5 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Applied to {plural(p.uses, "similar line")}</span>
          </li>
          {p.pastMatches > 0 && <li>Matches {plural(p.pastMatches, "past entry", "past entries")} in the duty check</li>}
          <li className="flex items-start gap-1.5">
            <ConnectorLogo id="mubit" size={16} className="mt-0.5" />
            <span>
              {p.variantCount === 0 ? (
                "No paraphrases sent to Mubit yet"
              ) : p.variantsRecorded ? (
                <>
                  {plural(p.variantCount, "paraphrase")} sent to Mubit{" "}
                  <span className={p.variantsMatched > 0 ? "text-good" : undefined}>({p.variantsMatched} came back right)</span>
                </>
              ) : (
                <>
                  {plural(p.variantCount, "paraphrase")} written, not recorded by Mubit ({unrecorded})
                </>
              )}
            </span>
          </li>
        </ul>
        <Button
          size="sm"
          variant={confirming ? "destructive" : "ghost"}
          className={cn("-ml-2", !confirming && "text-muted-foreground")}
          onClick={onRemove}
        >
          <Trash2 />
          {confirming ? "Click again to remove" : "Remove"}
        </Button>
      </div>
    </li>
  );
}

function Empty({ broker }: { broker: string }) {
  return (
    <section className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <h2 className="desk-kicker">No corrections yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-[15px] text-muted-foreground">
        When a code is wrong, correct it on an invoice and say why. It&apos;s remembered for every similar product and taught to Mubit.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={`/${broker}/classify`}>Correct a code on an invoice</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${broker}/tour`}>Take the tour</Link>
        </Button>
      </div>
    </section>
  );
}
