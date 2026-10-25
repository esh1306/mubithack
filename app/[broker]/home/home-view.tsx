"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, MessageCircleQuestion, PlayCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { Panel } from "@/components/page";
import { ConnectorLogo, type ConnectorId } from "@/components/connector-logos";
import { cn } from "@/lib/utils";

type Home = {
  sampleHistory?: boolean;
  learning?: { examples: number; trainAfter: number };
  aiOffline: boolean;
  pastEntries: number;
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
// Hero: the one bold moment. Headline comes from the desk's state, not the clock.

type HeroCopy = {
  title: string;
  lead: string;
  primary: { label: string; href: string; icon: "play" | "arrow" };
  secondary: { label: string; href: string };
};

function heroCopy(d: Home | null, broker: string): HeroCopy {
  const tour = { label: "Take the product tour", href: `/${broker}/tour`, icon: "play" as const };
  const upload = { label: "Upload an invoice", href: `/${broker}/classify?new=1` };
  if (!d || d.totals.invoices === 0) {
    return {
      title: "Every product on an invoice, coded against HMRC’s tariff.",
      lead: "Precedent finds the 10-digit UK commodity code for each line, shows you why, and waits for your sign-off. Correct it once and the next invoice is right first time.",
      primary: tour,
      secondary: upload,
    };
  }
  const t = d.totals;
  const pending = d.invoices.find((i) => i.review > 0) ?? d.invoices[0];
  const clients = [...new Set(d.invoices.filter((i) => i.review > 0).map((i) => i.client).filter(Boolean))];
  if (t.review > 0) {
    const forWhom = clients.length === 1 ? ` for ${clients[0]}` : "";
    return {
      title: `${plural(t.review, "line")} ${t.review === 1 ? "is" : "are"} waiting for your sign-off.`,
      lead: `Across ${plural(d.invoices.filter((i) => i.review > 0).length, "invoice")}${forWhom}. Each one already has a code from HMRC’s live tariff and the reasoning behind it, so checking takes seconds, not a search.`,
      primary: { label: "Continue reviewing", href: `/${broker}/classify?batch=${pending.batchId}`, icon: "arrow" },
      secondary: upload,
    };
  }
  return {
    title: "Every line is signed off and ready to declare.",
    lead: `${plural(t.signedOff, "code")} signed off across ${plural(t.invoices, "invoice")}. Send them to your declaration software, or straight to HMRC’s Customs Declaration Service.`,
    primary: { label: "File the declaration", href: `/${broker}/integrations`, icon: "arrow" },
    secondary: upload,
  };
}

type Figure = { value: string; label: string; note: React.ReactNode };

function figures(d: Home | null, broker: string): { heading: string; tour: boolean; items: Figure[] } {
  if (!d || d.totals.invoices === 0) {
    return {
      heading: "What the tour finds on one real shipment",
      tour: true,
      items: [
        { value: gbp(384), label: "Overpaid duty to reclaim", note: "LED bulbs declared at 4% that HMRC codes at 0%." },
        { value: gbp(766), label: "Underpayment caught before HMRC did", note: "Melamine “bamboo” tableware is 6%, not 0%." },
        { value: gbp(576), label: "Saved with a trade preference", note: "Bangladesh origin qualifies for a lower rate." },
      ],
    };
  }
  const t = d.totals;
  const m = d.money;
  return {
    heading: "At your desk so far",
    tour: false,
    items: [
      m.scanned
        ? {
            value: gbp(m.reclaim),
            label: "Overpaid duty to reclaim",
            note: m.owe > 0 ? `Plus ${gbp(m.owe)} underpaid to put right.` : "From the 3-year duty check.",
          }
        : {
            value: String(d.pastEntries),
            label: "Past imports ready for the 3-year duty check",
            note: (
              <Link href={`/${broker}/retro-scan`} className={cn("text-link underline-offset-4 hover:underline", focusRing)}>
                Find what was overpaid
              </Link>
            ),
          },
      {
        value: String(t.classified),
        label: "Product lines coded against HMRC’s tariff",
        note: `${t.signedOff} signed off, ${t.review} to check.`,
      },
      {
        value: String(t.precedents),
        label: t.precedents === 1 ? "Correction remembered" : "Corrections remembered",
        note: t.followed > 0 ? `Applied ${plural(t.followed, "time")} on new lines since.` : "Correct a code once and it carries forward.",
      },
    ],
  };
}

function Hero({ d, broker }: { d: Home | null; broker: string }) {
  const copy = heroCopy(d, broker);
  const fig = figures(d, broker);

  return (
    <section
      aria-labelledby="home-title"
      className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_80px_-56px_rgba(19,48,107,0.55)]"
    >
      {/* thin brand rule along the top edge */}
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-[3px] bg-[linear-gradient(90deg,#13306b_0%,#13306b_70%,#c2362b_70%,#c2362b_100%)]" />

      <div className="flex flex-col gap-6 px-6 pb-8 pt-9 sm:px-10 sm:pb-10 sm:pt-12">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-good" />
          Checking against HMRC’s live UK Trade Tariff
        </p>
        <h1 id="home-title" className="max-w-[20ch] text-balance font-serif text-[34px] font-semibold leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[46px]">
          {copy.title}
        </h1>
        <p className="max-w-xl text-pretty text-[17px] leading-relaxed text-foreground/75">{copy.lead}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <Link href={copy.primary.href}>
              {copy.primary.icon === "play" && <PlayCircle />}
              {copy.primary.label}
              {copy.primary.icon === "arrow" && <ArrowRight />}
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={copy.secondary.href}>
              <Upload /> {copy.secondary.label}
            </Link>
          </Button>
        </div>
      </div>

      {/* The value, in money and work, under the fold of the hero. */}
      <div className="border-t border-border bg-[#fbfcfe]">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-5 sm:px-10">
          <h2 className="font-serif text-[17px] font-semibold">{fig.heading}</h2>
          {fig.tour && <span className="text-sm text-muted-foreground">Tour example, not your firm’s figures</span>}
        </div>
        <dl className="grid divide-y divide-border px-6 sm:px-10 md:grid-cols-3 md:divide-x md:divide-y-0">
          {fig.items.map((f, i) => (
            <div key={f.label} className={cn("py-5 md:py-6", i > 0 && "md:pl-8", i < 2 && "md:pr-8")}>
              <dt className="text-sm text-muted-foreground">{f.label}</dt>
              <dd className="mt-1.5 font-serif text-[40px] font-semibold leading-none tabular-nums tracking-[-0.02em]">{f.value}</dd>
              <dd className="mt-2 text-sm text-foreground/70">{f.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// The job, as one flow. Each step ticks itself off from what this firm has actually done.

type Step = { title: string; body: string; done: boolean; doneText: string; action: string; href: string; logos: ConnectorId[] };

function steps(d: Home, broker: string): Step[] {
  const t = d.totals;
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
      body: "Signed codes go to your declaration software as a CSV, or to HMRC’s CDS.",
      done: d.connected.hmrc,
      doneText: "Signed in to HMRC",
      action: "Choose how to file",
      href: `/${broker}/integrations`,
      logos: ["software", "cds"],
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
    <section aria-labelledby="flow-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="flow-title" className="font-serif text-[26px] font-semibold leading-tight tracking-[-0.01em]">
            From invoice to declaration
          </h2>
          <p className="mt-1 text-[15px] text-muted-foreground">The whole job in five steps. Each one ticks off as you do it.</p>
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
                "relative flex flex-col gap-3 border-border px-5 py-5 max-lg:border-b max-lg:last:border-b-0 lg:border-r lg:last:border-r-0 lg:py-6",
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
              <div className="mt-auto pt-1">
                {s.done ? (
                  <p className="text-sm font-medium text-good">{s.doneText}</p>
                ) : isNext ? (
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
  const rowLink = cn("flex items-start gap-4 px-6 py-3.5 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40", "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60");
  return (
    <div className="grid items-start gap-6 lg:grid-cols-5">
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
          <p className="border-t border-border/70 px-6 py-6 text-muted-foreground">Every line is signed off or confident.</p>
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
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 bg-primary/[0.04] px-6 py-5">
        <div>
          <h2 className="font-serif text-[24px] leading-tight">How Precedent is learning your firm</h2>
          <p className="mt-1 text-sm text-muted-foreground">Correct a code once. It&apos;s applied to every similar product, and taught to a model that only your firm uses.</p>
        </div>
        <Link href={`/${broker}/mubit`} className={cn("inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline", focusRing)}>
          See what it learned <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <ol className="grid gap-px bg-border/70 md:grid-cols-3">
        {steps.map((st, i) => (
          <li key={st.label} className="relative bg-card px-6 py-5">
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-[40px] leading-none tabular-nums">{st.n}</span>
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
        <p className="flex flex-wrap items-center gap-2 border-t border-border/70 px-6 py-3.5 text-[14px]">
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

// brokerName is kept for the route's API; the sidebar already shows the firm, so the page doesn't repeat it.
export function HomeView({ broker }: { broker: string; brokerName: string }) {
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
    <div className="mx-auto max-w-6xl space-y-12">
      <Hero d={d} broker={broker} />

      {loadError && <p className="rounded-md border border-bad/30 bg-bad/5 px-4 py-3 text-sm">{loadError}</p>}

      {d?.aiOffline && (
        <div role="status" className="-mt-6 flex items-start gap-3 rounded-lg border border-warn/40 bg-[#fdf3e3] px-5 py-3.5 text-[15px]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>
            <span className="font-medium">The AI check is offline.</span> New lines get HMRC&apos;s own shortlist and are marked Unconfirmed until
            you check them. It switches back on when a working Mubit key is added to the server.
          </p>
        </div>
      )}

      {d && hasWork && <Work d={d} broker={broker} />}
      {d && <Learning d={d} broker={broker} />}
      {d && <Flow d={d} broker={broker} />}
    </div>
  );
}
