"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Invoice = {
  batchId: string;
  createdAt: string;
  client: { id: number; name: string } | null;
  lines: number;
  value: number;
  review: number;
  signedOff: number;
  corrected: number;
  waiting: number;
};
type Tab = "all" | "review" | "done";

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function StatusPill({ inv }: { inv: Invoice }) {
  if (inv.waiting > 0) return <span className="rounded-full bg-info/10 px-2.5 py-0.5 text-xs font-medium text-info">Checking</span>;
  if (inv.review > 0) return <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-medium text-warn">{inv.review} to review</span>;
  return <span className="rounded-full bg-good/12 px-2.5 py-0.5 text-xs font-medium text-good">Ready to declare</span>;
}

// Every invoice the firm has brought in, like a declarations list in broker software:
// filter by client and status, open one to review it, or start a new one.
export function InvoicesList({ broker }: { broker: string }) {
  const router = useRouter();
  const [list, setList] = useState<Invoice[] | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [client, setClient] = useState("all");

  useEffect(() => {
    fetch(`/api/${broker}/batch?summary=1`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]));
  }, [broker]);

  const clients = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of list ?? []) if (i.client) m.set(String(i.client.id), i.client.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [list]);

  const shown = (list ?? []).filter(
    (i) =>
      (client === "all" || String(i.client?.id) === client) &&
      (tab === "all" || (tab === "review" ? i.review + i.waiting > 0 : i.review + i.waiting === 0)),
  );
  const count = (t: Tab) => (list ?? []).filter((i) => (t === "all" ? true : t === "review" ? i.review + i.waiting > 0 : i.review + i.waiting === 0)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="desk-display">Invoices</h1>
          <p className="max-w-2xl text-[15px] text-muted-foreground">Every invoice you&apos;ve brought in, with how far each one is from a signed declaration.</p>
        </div>
        {list && list.length > 0 && (
          <Button asChild>
            <Link href={`/${broker}/classify?new=1`}>
              <Plus /> New invoice
            </Link>
          </Button>
        )}
      </header>

      {list === null && <p className="text-sm text-muted-foreground">Loading invoices…</p>}

      {list && list.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="font-serif text-2xl">No invoices yet</p>
          <p className="max-w-md text-[15px] text-muted-foreground">Choose a client and bring in their supplier invoice. Every line is checked against HMRC&apos;s live tariff.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={`/${broker}/classify?new=1`}>
                <Plus /> New invoice
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${broker}/tour`}>Take the product tour</Link>
            </Button>
          </div>
        </div>
      )}

      {list && list.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4">
            <div className="flex gap-5">
              {(
                [
                  ["all", "All"],
                  ["review", "Needs review"],
                  ["done", "Ready to declare"],
                ] as [Tab, string][]
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn("-mb-px border-b-2 border-transparent py-3.5 text-[14.5px] text-muted-foreground hover:text-foreground", tab === t && "border-primary text-foreground")}
                >
                  {label} <span className="ml-1 tabular-nums">{count(t)}</span>
                </button>
              ))}
            </div>
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger className="my-2 w-56" aria-label="Filter by client">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-[14.5px]">
              <thead>
                <tr className="border-b border-border/70 bg-muted/50 text-left text-[12.5px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">Invoice</th>
                  <th className="px-3 py-2.5 font-medium">Brought in</th>
                  <th className="px-3 py-2.5 text-right font-medium">Lines</th>
                  <th className="px-3 py-2.5 text-right font-medium">Value</th>
                  <th className="px-3 py-2.5 font-medium">Signed off</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr
                    key={i.batchId}
                    onClick={() => router.push(`/${broker}/classify?batch=${i.batchId}`)}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40"
                  >
                    <td className="px-5 py-3 font-medium">{i.client?.name ?? "No client"}</td>
                    <td className="px-3 py-3 font-mono text-[13px] text-muted-foreground">#{i.batchId.slice(0, 8)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{when(i.createdAt)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{i.lines}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{i.value ? gbp(i.value) : "—"}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-good" style={{ width: `${(i.signedOff / Math.max(1, i.lines)) * 100}%` }} />
                        </span>
                        <span className="text-[13px] tabular-nums text-muted-foreground">
                          {i.signedOff}/{i.lines}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill inv={i} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden />
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                      No invoices match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
