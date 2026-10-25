"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, MessageCircleQuestion, PlayCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { Panel } from "@/components/page";
import { Info } from "@/components/info";
import { ConnectorLogo, type ConnectorId } from "@/components/connector-logos";
import { DeclareButton } from "@/components/declare-button";
import { cn } from "@/lib/utils";
import { BROKER_GBP_PER_HOUR, MANUAL_MIN_PER_LINE, REVIEW_MIN_PER_LINE, savings, TOUR_LINES_PER_WEEK } from "@/lib/savings";

type Home = {
  sampleHistory?: boolean;
  learning?: { examples: number; trainAfter: number };
  aiOffline: boolean;
  pastEntries: number;
  saved: { linesCoded: number; auto: number; hours: number; gbp: number };
  desk: { open: number; done: number; today: number };
  totals: { classified: number; signedOff: number; review: number; precedents: number; followed: number; invoices: number };
  invoices: { batchId: string; client: string | null; createdAt: string; lines: number; classified: number; review: number; signedOff: number }[];
  needsYou: { lineId: number; batchId: string; text: string; client: string | null; code: string; confidence: number; question: string | null }[];
  learned: { id: number; lineText: string; oldCode: string; newCode: string; reason: string; followed: number }[];
  money: { reclaim: number; owe: number; scanned: boolean };
  connected: { hmrc: boolean; eori: string | null; stores: number; clients: number; tariffCodes: number; mubit: boolean };
};

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card";

// ---------------------------------------------------------------------------------------------
// Header: the firm and the one thing to do next, in a single line.

function primaryAction(d: Home | null, broker: string) {
  if (!d || d.totals.invoices === 0) return { label: "Take the product tour", href: `/${broker}/tour`, icon: "play" as const };
  if (d.totals.review > 0) {
    const pending = d.invoices.find((i) => i.review > 0) ?? d.invoices[0];
    return { label: "Continue reviewing", href: `/${broker}/classify?batch=${pending.batchId}`, icon: "arrow" as const };
  }
  return { label: "File the declaration", href: `/${broker}/integrations`, icon: "arrow" as const };
}

function Header({ d, broker, brokerName }: { d: Home | null; broker: string; brokerName: string }) {
  const primary = primaryAction(d, broker);
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 id="home-title" className="desk-kicker text-[22px]">
          {brokerName} desk
        </h1>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className={cn("size-2 rounded-full", d?.aiOffline ? "bg-warn" : "bg-good")} />
          {d?.aiOffline ? "Prue’s AI check is offline, using HMRC’s shortlist" : "Prue is coding against HMRC’s live UK Trade Tariff"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href={`/${broker}/classify?new=1`}>
            <Upload /> Upload an invoice
          </Link>
        </Button>
        <Button asChild>
          <Link href={primary.href}>
            {primary.icon === "play" && <PlayCircle />}
            {primary.label}
            {primary.icon === "arrow" && <ArrowRight />}
          </Link>
        </Button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------------------------
// What's happening: four linked tiles you can read in two seconds.

type Tone = "good" | "warn" | "idle";
const dot: Record<Tone, string> = { good: "bg-good", warn: "bg-warn", idle: "bg-muted-foreground/40" };

function Pulse({ d, broker }: { d: Home; broker: string }) {
  const t = d.totals;
  const pending = d.invoices.find((i) => i.review > 0);
  const last = d.learned[0];
  const tiles: { label: string; tone: Tone; value: React.ReactNode; note: string; href: string }[] = [
    {
      label: "Waiting for you",
      tone: t.review > 0 ? "warn" : "good",
      value: t.review > 0 ? plural(t.review, "line") : "All clear",
      note: t.review > 0 ? "Prue has a code and a reason ready" : `${t.signedOff} of ${t.classified} signed off`,
      href: `/${broker}/classify${pending ? `?batch=${pending.batchId}` : ""}`,
    },
    {
      label: "Invoices",
      tone: d.desk.open > 0 ? "warn" : t.invoices > 0 ? "good" : "idle",
      value: `${d.desk.open} open · ${d.desk.done} done`,
      note: d.desk.today > 0 ? `${plural(d.desk.today, "invoice")} added today` : "None added today",
      href: `/${broker}/classify`,
    },
    {
      label: "Prue learned",
      tone: last ? "good" : "idle",
      value: last ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{last.lineText}</span>
          <ArrowRight className="size-3.5 shrink-0 text-primary" />
          <Code code={last.newCode} className="shrink-0 text-[13px]" />
        </span>
      ) : (
        "No corrections yet"
      ),
      note: last ? `Latest correction, used ${last.followed}× since` : "Correct a code once and it carries forward",
      href: `/${broker}/precedents`,
    },
    {
      label: "Filing",
      tone: d.connected.hmrc ? "good" : "idle",
      value: d.connected.hmrc ? "Signed in to HMRC" : "HMRC not connected",
      note: d.connected.hmrc && d.connected.eori ? `EORI ${d.connected.eori}` : "CSV export always works",
      href: `/${broker}/integrations`,
    },
  ];
  return (
    <ul aria-label="What’s happening" className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((x) => (
        <li key={x.label} className="bg-card">
          <Link href={x.href} className={cn("block h-full space-y-1 px-4 py-3 transition-colors hover:bg-accent/40", focusRing, "focus-visible:ring-inset")}>
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span aria-hidden className={cn("size-2 rounded-full", dot[x.tone])} />
              {x.label}
            </p>
            <div className="truncate font-medium">{x.value}</div>
            <p className="truncate text-[13px] text-muted-foreground">{x.note}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// What Prue saved the firm, from its own lines. Assumptions sit behind the ⓘ (lib/savings.ts).

type Figure = { value: string; label: string; note: React.ReactNode };

function figures(d: Home, broker: string): { tour: boolean; items: Figure[] } {
  if (d.saved.linesCoded === 0) {
    const s = savings(TOUR_LINES_PER_WEEK);
    return {
      tour: true,
      items: [
        { value: `${s.hours} h`, label: "Time saved a week", note: `At ${TOUR_LINES_PER_WEEK} invoice lines a week.` },
        { value: gbp(s.gbp), label: "Broker cost saved a week", note: `At £${BROKER_GBP_PER_HOUR} an hour.` },
        { value: gbp(384), label: "Overpaid duty to reclaim", note: "LED bulbs declared at 4% that HMRC codes at 0%." },
        { value: gbp(766), label: "Underpayment caught", note: "Melamine “bamboo” tableware is 6%, not 0%." },
      ],
    };
  }
  const s = d.saved;
  const m = d.money;
  return {
    tour: false,
    items: [
      { value: `${s.hours} h`, label: "Time saved", note: `${plural(s.linesCoded, "line")} Prue coded for you.` },
      { value: gbp(s.gbp), label: "Broker cost saved", note: `At £${BROKER_GBP_PER_HOUR} an hour.` },
      {
        value: `${s.auto} of ${s.linesCoded}`,
        label: "Coded with no questions",
        note: d.totals.followed > 0 ? `${plural(d.totals.followed, "line")} answered by your corrections.` : "Confident enough to just sign off.",
      },
      m.scanned
        ? { value: gbp(m.reclaim), label: "Overpaid duty to reclaim", note: m.owe > 0 ? `Plus ${gbp(m.owe)} underpaid to put right.` : "From the 3-year duty check." }
        : {
            value: String(d.pastEntries),
            label: "Past imports to check for overpaid duty",
            note: (
              <Link href={`/${broker}/retro-scan`} className={cn("text-link underline-offset-4 hover:underline", focusRing)}>
                Run the 3-year duty check
              </Link>
            ),
          },
    ],
  };
}

function Savings({ d, broker, brokerName }: { d: Home; broker: string; brokerName: string }) {
  const fig = figures(d, broker);
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-1">
          What Prue saved {fig.tour ? "a firm like yours" : brokerName} <Info id="savings" />
        </span>
      }
      actions={fig.tour && <span className="text-sm text-muted-foreground">Tour example, not your firm’s figures</span>}
    >
      <dl className="grid gap-px border-t border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
        {fig.items.map((f) => (
          <div key={f.label} className="bg-card px-6 py-4">
            <dt className="text-sm text-muted-foreground">{f.label}</dt>
            <dd className="mt-1 font-serif text-[32px] font-semibold leading-none tabular-nums tracking-[-0.02em]">{f.value}</dd>
            <dd className="mt-1.5 text-[13px] text-foreground/70">{f.note}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-border/70 px-6 py-2 text-xs text-muted-foreground">
        Assumes {MANUAL_MIN_PER_LINE} min to code a line by hand vs {REVIEW_MIN_PER_LINE} min to review Prue’s, at £{BROKER_GBP_PER_HOUR}/hour.
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------
// The job, as one flow. Each step ticks itself off from what this firm has actually done.

// `declare` is the invoice the step can file right here.
type Step = { title: string; body: string; done: boolean; doneText: string; action: string; href: string; logos: ConnectorId[]; declare?: string };

function steps(d: Home, broker: string): Step[] {
  const t = d.totals;
  // The newest invoice with every line signed off is the one to declare; else the one to finish.
  const ready = d.invoices.find((i) => i.lines > 0 && i.signedOff === i.lines);
  const unsigned = d.invoices.find((i) => i.signedOff < i.lines);
  return [
    {
      title: "Bring in the invoice",
      body: "Upload the supplier’s Excel or CSV, or import a client’s Shopify catalogue.",
      done: t.invoices > 0,
      doneText: `${plural(t.invoices, "invoice")} in`,
      action: "Add an invoice",
      href: `/${broker}/classify?new=1`,
      logos: ["excel", "csv", "shopify"],
    },
    {
      title: "Check and sign off",
      body: "Each line gets a code from HMRC’s tariff, the reason, and the sources it checked.",
      done: t.signedOff > 0,
      doneText: `${t.signedOff} of ${t.classified} signed`,
      action: "Open invoices",
      href: `/${broker}/classify`,
      logos: ["tariff"],
    },
    {
      title: "Correct it once",
      body: "Say why a code is wrong. It applies to similar products and trains your firm’s Mubit model.",
      done: t.precedents > 0,
      doneText: `${plural(t.precedents, "correction")}, used ${t.followed}×`,
      action: t.precedents > 0 ? "See corrections" : "Correct a code",
      href: `/${broker}/${t.precedents > 0 ? "precedents" : "classify"}`,
      logos: ["mubit"],
    },
    {
      title: "File the declaration",
      body: ready
        ? `${ready.client ?? "Invoice"} #${ready.batchId.slice(0, 8)} is signed off: file it to HMRC’s CDS, or as a CSV for your declaration software.`
        : "Signed codes go to your declaration software as a CSV, or to HMRC’s CDS.",
      done: d.connected.hmrc,
      doneText: "Signed in to HMRC",
      action: ready ? "Declare" : unsigned ? "Sign off an invoice first" : "Choose how to file",
      href: ready ? `/${broker}/export` : unsigned ? `/${broker}/classify?batch=${unsigned.batchId}` : `/${broker}/integrations`,
      logos: ["software", "cds"],
      declare: ready?.batchId,
    },
    {
      title: "Check 3 years back",
      body: `Re-rate ${d.pastEntries} past imports at the duty in force on each date. Overpayments become a claim.`,
      done: d.money.scanned,
      doneText: `${gbp(d.money.reclaim)} to reclaim`,
      action: "Run the duty check",
      href: `/${broker}/retro-scan`,
      logos: ["tariff"],
    },
  ];
}

function Flow({ d, broker }: { d: Home; broker: string }) {
  const list = steps(d, broker);
  const done = list.filter((s) => s.done).length;
  const next = list.findIndex((s) => !s.done);
  return (
    <section aria-labelledby="flow-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="flow-title" className="desk-kicker">
            From invoice to declaration
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">The whole job in five steps. Each one ticks off as you do it.</p>
        </div>
        <div className="flex items-center gap-3" aria-label={`${done} of ${list.length} steps done`}>
          <span className="text-sm tabular-nums text-muted-foreground">
            {done} of {list.length} done
          </span>
          <span className="flex gap-1" aria-hidden>
            {list.map((s, i) => (
              <span key={i} className={cn("h-1.5 w-5 rounded-full", s.done ? "bg-good" : i === next ? "bg-primary" : "bg-border")} />
            ))}
          </span>
        </div>
      </div>

      <ol className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-5">
        {list.map((s, i) => {
          const isNext = i === next;
          return (
            <li
              key={s.title}
              className={cn(
                "relative flex flex-col gap-2.5 border-border px-4 py-4 max-lg:border-b max-lg:last:border-b-0 lg:border-r lg:last:border-r-0",
                isNext && "bg-primary/[0.04]",
              )}
            >
              {isNext && <span aria-hidden className="absolute inset-x-0 top-0 hidden h-[3px] bg-primary lg:block" />}
              {isNext && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-primary lg:hidden" />}
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-[13px] font-medium tabular-nums",
                    s.done ? "border-good bg-good text-white" : isNext ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {s.done ? <Check className="size-3.5" aria-label="Done" /> : i + 1}
                </span>
                <span className="flex -space-x-1.5">
                  {s.logos.map((id) => (
                    <ConnectorLogo key={id} id={id} size={24} className="ring-2 ring-card" />
                  ))}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-medium leading-snug">{s.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
              <div className="mt-auto space-y-2 pt-1">
                {s.done && <p className="text-sm font-medium text-good">{s.doneText}</p>}
                {s.declare ? (
                  <DeclareButton key={s.declare} broker={broker} batchId={s.declare} size="sm" inline />
                ) : s.done ? null : isNext ? (
                  <Button size="sm" asChild>
                    <Link href={s.href}>{s.action}</Link>
                  </Button>
                ) : (
                  <Link href={s.href} className={cn("text-sm text-link underline-offset-4 hover:underline", focusRing)}>
                    {s.action}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Today's work: lines waiting, and the latest invoices.

function Work({ d, broker }: { d: Home; broker: string }) {
  const link = cn("text-sm text-link underline-offset-4 hover:underline", focusRing);
  const rowLink = cn("flex items-start gap-4 px-6 py-2.5 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40", "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60");
  return (
    <div className="grid items-start gap-4 lg:grid-cols-5">
      <Panel
        className="lg:col-span-3"
        title="Waiting for you"
        description={d.totals.review ? `${plural(d.totals.review, "line")} to check, lowest confidence first.` : "Nothing waiting."}
        actions={
          <Link href={`/${broker}/classify`} className={link}>
            Open invoices
          </Link>
        }
      >
        {d.needsYou.length === 0 ? (
          <p className="border-t border-border/70 px-6 py-4 text-muted-foreground">Every line is signed off or confident.</p>
        ) : (
          <ul className="divide-y divide-border/70 border-t border-border/70">
            {d.needsYou.slice(0, 5).map((n) => (
              <li key={n.lineId}>
                <Link href={`/${broker}/classify?batch=${n.batchId}`} className={rowLink}>
                  <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-warn" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-medium">{n.text}</p>
                    {n.question ? (
                      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MessageCircleQuestion className="mt-0.5 size-3.5 shrink-0" />
                        <span className="line-clamp-1">{n.question}</span>
                      </p>
                    ) : (
                      n.client && <p className="text-sm text-muted-foreground">{n.client}</p>
                    )}
                  </div>
                  <Code code={n.code} className="hidden shrink-0 pt-0.5 text-sm sm:inline" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="lg:col-span-2" title="Recent invoices">
        <ul className="divide-y divide-border/70 border-t border-border/70">
          {d.invoices.slice(0, 5).map((inv) => {
            const pct = inv.lines ? Math.round((inv.signedOff / inv.lines) * 100) : 0;
            return (
              <li key={inv.batchId}>
                <Link href={`/${broker}/classify?batch=${inv.batchId}`} className={cn(rowLink, "items-center")}>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium">{inv.client ?? "Pasted lines"}</p>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {inv.signedOff} of {inv.lines} signed
                      </span>
                    </div>
                    <span className="block h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="block h-full rounded-full bg-good" style={{ width: `${pct}%` }} />
                    </span>
                    <p className="text-sm text-muted-foreground">Added {when(inv.createdAt)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The learning layer: every correction is applied at once and sent to this firm's own Mubit task.

function Learning({ d, broker }: { d: Home; broker: string }) {
  const ex = d.learning?.examples ?? 0;
  const of = d.learning?.trainAfter ?? 25;
  const offline = d.aiOffline || !d.connected.mubit;
  const last = d.learned[0];
  const steps = [
    { n: d.totals.precedents, label: d.totals.precedents === 1 ? "correction made" : "corrections made", note: "by your team, each with its reason" },
    { n: d.totals.followed, label: d.totals.followed === 1 ? "line answered by a correction" : "lines answered by a correction", note: "on later invoices, without asking again" },
    { n: ex, label: `of ${of} examples on your Mubit task`, note: offline ? "the Mubit key was rejected, so nothing is being recorded" : `first training possible at ${of}` },
  ];
  return (
    <section className="overflow-hidden rounded-lg border border-primary/20 bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 bg-primary/[0.04] px-6 py-3.5">
        <div>
          <h2 className="desk-kicker">How Prue is learning your firm</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Correct a code once. It&apos;s applied to every similar product, and taught to a model that only your firm uses.</p>
        </div>
        <Link href={`/${broker}/mubit`} className={cn("inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline", focusRing)}>
          See what it learned <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <ol className="grid gap-px bg-border/70 md:grid-cols-3">
        {steps.map((st, i) => (
          <li key={st.label} className="relative bg-card px-6 py-4">
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-[32px] leading-none tabular-nums">{st.n}</span>
              <span className="text-[14.5px] font-medium">{st.label}</span>
            </p>
            <p className={cn("mt-2 text-[13.5px]", i === 2 && offline ? "text-warn" : "text-muted-foreground")}>{st.note}</p>
            {i === 2 && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", offline ? "bg-warn" : "bg-primary")} style={{ width: `${Math.max(2, Math.min(100, (ex / of) * 100))}%` }} />
              </div>
            )}
            {i < 2 && <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-card p-0.5 text-primary md:block" aria-hidden />}
          </li>
        ))}
      </ol>
      {last && (
        <p className="flex flex-wrap items-center gap-2 border-t border-border/70 px-6 py-2.5 text-[14px]">
          <span className="text-muted-foreground">Latest:</span>
          <span className="font-medium">{last.lineText}</span>
          <Code code={last.oldCode} className="text-[13px] line-through opacity-50" />
          <ArrowRight className="size-3.5 text-primary" />
          <Code code={last.newCode} className="text-[13px]" />
        </p>
      )}
    </section>
  );
}

export function HomeView({ broker, brokerName }: { broker: string; brokerName: string }) {
  const [d, setD] = useState<Home | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/${broker}/home`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(setD)
      .catch(() => setLoadError("Couldn't load your desk. Check the connection and refresh."));
  }, [broker]);

  const hasWork = !!d && d.totals.invoices > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Header d={d} broker={broker} brokerName={brokerName} />

      {loadError && <p className="rounded-md border border-bad/30 bg-bad/5 px-4 py-3 text-sm">{loadError}</p>}

      {d?.aiOffline && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-warn/40 bg-[#fdf3e3] px-4 py-2.5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>
            <span className="font-medium">The AI check is offline.</span> New lines get HMRC&apos;s own shortlist and are marked Unconfirmed until
            you check them. It switches back on when a working Mubit key is added to the server.
          </p>
        </div>
      )}

      {d && hasWork && <Pulse d={d} broker={broker} />}
      {d && <Savings d={d} broker={broker} brokerName={brokerName} />}
      {d && hasWork && <Work d={d} broker={broker} />}
      {d && <Learning d={d} broker={broker} />}
      {d && <Flow d={d} broker={broker} />}
    </div>
  );
}
