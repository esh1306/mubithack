"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Flag, MessageCircleQuestion, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { PageHeader, Panel, Stat, Empty, Status } from "@/components/page";

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
    <div className="h-1 w-24 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${done} of ${total} signed off`}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function HomeView({ broker, brokerName }: { broker: string; brokerName: string }) {
  const [d, setD] = useState<Home | null>(null);

  useEffect(() => {
    fetch(`/api/${broker}/home`).then((r) => r.json()).then(setD);
  }, [broker]);

  const empty = d && d.totals.invoices === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={brokerName}
        title="Overview"
        description="What needs you, what the AI learned from your team, and the money it found."
        actions={
          <Button asChild>
            <Link href={`/${broker}/classify?sample=01-ningbo-homeware`}>
              <Sparkles /> Classify a sample invoice
            </Link>
          </Button>
        }
      />

      {empty && (
        <Empty icon={Inbox} title="No invoices yet">
          Drop in a supplier invoice on the{" "}
          <Link href={`/${broker}/classify`} className="text-primary hover:underline">Inbox</Link>, or start with a sample. Every line gets a
          10-digit code, a reason and a receipt.
        </Empty>
      )}

      {d && !empty && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Needs your review"
              value={d.totals.review}
              context={`across ${d.totals.invoices} invoice${d.totals.invoices === 1 ? "" : "s"}`}
              status={d.totals.review > 0 ? <Status tone="warn">Waiting</Status> : <Status tone="good">Clear</Status>}
            />
            <Stat
              label="Lines classified"
              value={d.totals.classified}
              context={`${d.totals.signedOff} signed off by your team`}
            />
            <Stat
              label="Answers from your precedents"
              value={d.totals.followed}
              context={`learned from ${d.totals.precedents} fix${d.totals.precedents === 1 ? "" : "es"}`}
            />
            <Stat
              label="Duty to reclaim"
              value={d.money.scanned ? gbp(d.money.reclaim) : "—"}
              context={d.money.scanned ? `${gbp(d.money.owe)} to disclose` : "run a retro-scan to find it"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel
              className="lg:col-span-3"
              title="Needs you"
              actions={
                <Link href={`/${broker}/classify`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Open inbox <ArrowRight className="size-3" />
                </Link>
              }
            >
              {d.needsYou.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing waiting. Every line is signed off or confident.</p>
              ) : (
                <ul className="divide-y">
                  {d.needsYou.map((n) => (
                    <li key={n.lineId}>
                      <Link href={`/${broker}/classify?batch=${n.batchId}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-accent/50">
                        <Flag className="mt-0.5 size-3.5 shrink-0 text-warn" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{n.text}</p>
                          {n.question && (
                            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                              <MessageCircleQuestion className="size-3 shrink-0" /> {n.question}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Code code={n.code} className="text-xs" />
                          <p className="text-[11px] tabular-nums text-muted-foreground">{Math.round(n.confidence * 100)}% sure</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="lg:col-span-2" title="Connected">
              <ul className="divide-y text-sm">
                <li className="flex items-center justify-between px-4 py-2.5">
                  <span>HMRC Customs Declarations</span>
                  {d.connected.hmrc ? <Status tone="good">Signed in</Status> : <Status tone="idle">Not signed in</Status>}
                </li>
                <li className="flex items-center justify-between px-4 py-2.5">
                  <span>Client stores (Shopify)</span>
                  <Status tone={d.connected.stores ? "good" : "idle"}>
                    {d.connected.stores} of {d.connected.clients} clients
                  </Status>
                </li>
                <li className="flex items-center justify-between px-4 py-2.5">
                  <span>UK Trade Tariff</span>
                  <Status tone="good">{d.connected.tariffCodes.toLocaleString()} codes</Status>
                </li>
                <li className="flex items-center justify-between px-4 py-2.5">
                  <span>Mubit</span>
                  {d.connected.mubit ? <Status tone="good">Recording</Status> : <Status tone="bad">No key</Status>}
                </li>
              </ul>
              <div className="border-t px-4 py-2.5">
                <Link href={`/${broker}/integrations`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Manage integrations <ArrowRight className="size-3" />
                </Link>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Recent invoices">
              <ul className="divide-y">
                {d.invoices.map((inv) => (
                  <li key={inv.batchId}>
                    <Link href={`/${broker}/classify?batch=${inv.batchId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{inv.client ?? "No client"}</p>
                        <p className="text-xs text-muted-foreground">
                          {when(inv.createdAt)} · {inv.lines} lines <span className="font-mono">#{inv.batchId.slice(0, 6)}</span>
                        </p>
                      </div>
                      {inv.review > 0 && <Status tone="warn">{inv.review} to review</Status>}
                      <div className="flex items-center gap-2">
                        <Progress done={inv.signedOff} total={inv.lines} />
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
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
                <Link href={`/${broker}/precedents`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  All precedents <ArrowRight className="size-3" />
                </Link>
              }
            >
              {d.learned.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No fixes yet. Correct a code in the inbox and it becomes a precedent the AI follows.
                </p>
              ) : (
                <ul className="divide-y">
                  {d.learned.map((p) => (
                    <li key={p.id} className="space-y-1 px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-medium">{p.lineText}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">followed {p.followed}×</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Code code={p.oldCode} className="line-through opacity-50" />
                        <ArrowRight className="size-3 text-primary" />
                        <Code code={p.newCode} />
                      </div>
                      <p className="line-clamp-1 text-xs text-muted-foreground">“{p.reason}”</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
