"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Flag, MessageCircleQuestion, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { Prue } from "@/components/prue";
import { Panel, Stat, Empty, Status } from "@/components/page";
import { DEMO_SAMPLE_ID } from "@/lib/demo";

type Home = {
  totals: { classified: number; signedOff: number; review: number; precedents: number; followed: number; invoices: number };
  invoices: { batchId: string; client: string | null; createdAt: string; lines: number; classified: number; review: number; signedOff: number }[];
  needsYou: { lineId: number; batchId: string; text: string; client: string | null; code: string; confidence: number; question: string | null }[];
  learned: { id: number; lineText: string; oldCode: string; newCode: string; reason: string; followed: number }[];
  money: { reclaim: number; owe: number; scanned: boolean };
  connected: { hmrc: boolean; eori: string | null; stores: number; clients: number; tariffCodes: number; mubit: boolean };
};

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// A single bar: how far through an invoice the broker is. Thin, rounded, one hue; the numbers sit beside it.
function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${done} of ${total} signed off`}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Greeting by the viewer's clock, set after mount so server and client render the same HTML first.
function useGreeting() {
  const [g, setG] = useState({ hello: "Welcome back.", date: "" });
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser clock once
    setG({
      hello: h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.",
      date: now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
    });
  }, []);
  return g;
}

function ConnectedPanel({ d, broker, linkMore }: { d: Home; broker: string; linkMore: string }) {
  return (
    <Panel className="lg:col-span-2" title="Connected" description="Where codes come from and where they go.">
      <ul className="divide-y divide-border/70 border-t border-border/70">
        {[
          ["HMRC Customs Declarations", d.connected.hmrc ? <Status key="h" tone="good">Signed in</Status> : <Status key="h" tone="idle">Not signed in</Status>],
          ["Client stores · Shopify", <Status key="s" tone={d.connected.stores ? "good" : "idle"}>{d.connected.stores} of {d.connected.clients} clients</Status>],
          ["UK Trade Tariff", <Status key="t" tone="good">{d.connected.tariffCodes.toLocaleString()} codes</Status>],
          ["Mubit", d.connected.mubit ? <Status key="m" tone="good">Recording</Status> : <Status key="m" tone="bad">No key</Status>],
        ].map(([label, status]) => (
          <li key={label as string} className="flex items-center justify-between gap-3 px-6 py-3.5">
            <span>{label}</span>
            {status}
          </li>
        ))}
      </ul>
      <div className="border-t border-border/70 px-6 py-3.5">
        <Link href={`/${broker}/integrations`} className={linkMore}>
          Manage integrations <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Panel>
  );
}

export function HomeView({ broker, brokerName }: { broker: string; brokerName: string }) {
  const [d, setD] = useState<Home | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const greeting = useGreeting();

  useEffect(() => {
    fetch(`/api/${broker}/home`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(setD)
      .catch(() => setLoadError("Couldn't load this broker's home. Check the connection and refresh."));
  }, [broker]);

  const empty = d && d.totals.invoices === 0;
  const linkMore = "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground";
  const demoHref = `/${broker}/classify?sample=${DEMO_SAMPLE_ID}&demo=1`;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-4xl items-end gap-6">
          <Prue size={104} mood={d && d.totals.review === 0 ? "happy" : "neutral"} className="shrink-0" />
          <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {brokerName}
            {greeting.date && <> · {greeting.date}</>}
          </p>
          <h1 className="font-serif text-[56px] leading-[1] tracking-[-0.015em]">{greeting.hello}</h1>
          {d && (
            <p className="font-serif text-[26px] leading-snug text-foreground/80">
              {empty ? (
                <>No invoices yet. Play the 3-minute demo — classify one invoice, fix the bamboo line, and watch it remember.</>
              ) : d.totals.review > 0 ? (
                <>
                  <span className="text-foreground">{d.totals.review} lines</span> need your eye across {d.totals.invoices} invoices.{" "}
                </>
              ) : (
                <>Every line is signed off or confident. </>
              )}
              {!empty && d.totals.followed > 0 && (
                <>
                  Your team&apos;s fixes answered <span className="text-foreground">{d.totals.followed}</span> on their own.
                </>
              )}
            </p>
          )}
          </div>
        </div>
        <Button size="lg" asChild>
          <Link href={demoHref}>
            <Sparkles /> Play the 3-minute demo
          </Link>
        </Button>
      </header>

      {loadError && <p className="rounded-md border border-bad/30 bg-bad/5 px-4 py-3 text-sm">{loadError}</p>}
      {!d && !loadError && <p className="text-sm text-muted-foreground">Loading this broker&apos;s desk…</p>}

      {d && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Needs your review"
            value={d.totals.review}
            context={`across ${d.totals.invoices} invoice${d.totals.invoices === 1 ? "" : "s"}`}
            status={d.totals.review > 0 ? <Status tone="warn">Waiting</Status> : <Status tone="good">Clear</Status>}
          />
          <Stat label="Lines classified" value={d.totals.classified} context={`${d.totals.signedOff} signed off by your team`} />
          <Stat
            label="Answered by your precedents"
            value={d.totals.followed}
            context={`learned from ${d.totals.precedents} fix${d.totals.precedents === 1 ? "" : "es"}`}
          />
          <Stat
            label="Duty to reclaim"
            value={d.money.scanned ? gbp(d.money.reclaim) : "—"}
            context={d.money.scanned ? `${gbp(d.money.owe)} to disclose voluntarily` : "run a retro-scan to find it"}
          />
        </div>
      )}

      {empty && d && (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Empty icon={Inbox} title="No invoices yet">
              Play the 3-minute demo, or drop a supplier invoice on the{" "}
              <Link href={`/${broker}/classify`} className="text-primary underline-offset-4 hover:underline">Inbox</Link>
              . Every line gets a 10-digit code, a reason and a receipt.
            </Empty>
          </div>
          <ConnectedPanel d={d} broker={broker} linkMore={linkMore} />
        </div>
      )}

      {d && !empty && (
        <>

          <div className="grid items-start gap-6 lg:grid-cols-5">
            <Panel
              className="lg:col-span-3"
              title="Needs you"
              description="Lines the AI wasn't sure about, or wants to ask the importer about."
              actions={
                <Link href={`/${broker}/classify`} className={linkMore}>
                  Open inbox <ArrowRight className="size-3.5" />
                </Link>
              }
            >
              {d.needsYou.length === 0 ? (
                <p className="px-6 pb-8 pt-2 text-muted-foreground">Nothing waiting. Every line is signed off or confident.</p>
              ) : (
                <ul className="divide-y divide-border/70 border-t border-border/70">
                  {d.needsYou.map((n) => (
                    <li key={n.lineId}>
                      <Link href={`/${broker}/classify?batch=${n.batchId}`} className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-accent/40">
                        <Flag className="mt-1 size-4 shrink-0 text-warn" aria-label="Needs review" />
                        <div className="min-w-0 flex-1 space-y-1">
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
                        <div className="shrink-0 space-y-1 text-right">
                          <Code code={n.code} className="text-sm" />
                          <p className="text-xs tabular-nums text-muted-foreground">{Math.round(n.confidence * 100)}% sure</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <ConnectedPanel d={d} broker={broker} linkMore={linkMore} />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Panel title="Recent invoices">
              <ul className="divide-y divide-border/70 border-t border-border/70">
                {d.invoices.map((inv) => (
                  <li key={inv.batchId}>
                    <Link href={`/${broker}/classify?batch=${inv.batchId}`} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-accent/40">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{inv.client ?? "No client"}</p>
                        <p className="text-sm text-muted-foreground">
                          {when(inv.createdAt)} · {inv.lines} lines
                        </p>
                      </div>
                      {inv.review > 0 && <Status tone="warn">{inv.review} to review</Status>}
                      <div className="flex items-center gap-2.5">
                        <Progress done={inv.signedOff} total={inv.lines} />
                        <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
                          {inv.signedOff}/{inv.lines}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="What it learned from your team"
              actions={
                <Link href={`/${broker}/precedents`} className={linkMore}>
                  All precedents <ArrowRight className="size-3.5" />
                </Link>
              }
            >
              {d.learned.length === 0 ? (
                <p className="px-6 pb-8 pt-2 text-muted-foreground">No fixes yet. Correct a code in the inbox and it becomes a precedent the AI follows.</p>
              ) : (
                <ul className="divide-y divide-border/70 border-t border-border/70">
                  {d.learned.map((p) => (
                    <li key={p.id} className="space-y-2 px-6 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{p.lineText}</p>
                        <span className="shrink-0 text-sm text-muted-foreground">followed {p.followed}×</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Code code={p.oldCode} className="line-through opacity-50" />
                        <ArrowRight className="size-3.5 text-primary" />
                        <Code code={p.newCode} />
                      </div>
                      <p className="line-clamp-2 font-serif text-[17px] italic leading-snug text-foreground/75">“{p.reason}”</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
