"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileUp,
  Flag,
  Check,
  Loader2,
  MessageCircleQuestion,
  RotateCw,
  PencilLine,
  GraduationCap,
  Plus,
  Upload,
  ShoppingBag,
  FileText,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/ui/kbd";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code } from "@/components/code";
import { Info } from "@/components/info";
import { Status } from "@/components/page";
import { ClientEmailButton } from "@/components/client-email";
import { FixForm } from "@/components/fix-form";
import { ReceiptSheet, type Suggestion } from "@/components/receipt-sheet";
import { LearningPanel, RAIL_TEMPLATE, type NeverSeenItem, type RailStep } from "@/components/learning-panel";
import { readSse } from "@/lib/sse";
import { cn } from "@/lib/utils";

type InLine = { description: string; qty?: number; value?: number; origin?: string };
type Row = {
  id: number;
  text: string;
  status: "running" | "done" | "error";
  suggestion?: Suggestion;
  error?: string;
  source?: string | null;
  existingCode?: string | null;
};
type Broker = { id: string; name: string };
type Sample = { id: string; name: string; supplier: string; about: string };
type Batch = { batchId: string; lines: number; createdAt: string; client: string | null };
type Filter = "review" | "all" | "done";

const railKey = (broker: string) => `precedent:rail:${broker}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function statusOf(r: Row) {
  if (r.status !== "done" || !r.suggestion) return r.status;
  if (r.suggestion.status === "corrected") return "fixed";
  if (r.suggestion.status === "approved") return "approved";
  return r.suggestion.flagged ? "review" : "ready";
}

export function ClassifyView({ broker, brokers }: { broker: string; brokers: Broker[] }) {
  const router = useRouter();
  const search = useSearchParams();

  const [rows, setRows] = useState<Row[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchClient, setBatchClient] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [paste, setPaste] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("review");
  const [selected, setSelected] = useState(0);
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [inlineFix, setInlineFix] = useState<Row | null>(null);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [rail, setRail] = useState<RailStep[] | null>(null);
  const [items, setItems] = useState<NeverSeenItem[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [clients, setClients] = useState<{ id: number; name: string; eori: string | null }[]>([]);
  const [clientId, setClientId] = useState<number | null>(null);

  const brokerName = brokers.find((b) => b.id === broker)?.name ?? broker;

  const loadClients = useCallback(() => {
    fetch(`/api/${broker}/clients`).then((r) => r.json()).then(setClients);
  }, [broker]);
  const loadBatches = useCallback(() => {
    fetch(`/api/${broker}/batch?list=1`).then((r) => r.json()).then(setBatches);
  }, [broker]);

  // Saved state: an invoice from the database (the latest unless one is picked), and the last rail from this browser.
  const loadBatch = useCallback(
    async (id?: string | null) => {
      const res = await fetch(`/api/${broker}/batch${id ? `?id=${id}` : ""}`);
      const data = await res.json();
      setBatchId(data.batchId);
      setBatchClient(data.client?.name ?? null);
      setRows(data.rows);
      setLoaded(true);
      return data.rows as Row[];
    },
    [broker],
  );

  const sampleParam = search.get("sample");
  const batchParam = search.get("batch");
  const started = useRef<string | null>(null);

  useEffect(() => {
    // State is set after the fetches resolve, not synchronously; the lint rule can't see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBatch(batchParam).then((rs) => {
      try {
        const saved = localStorage.getItem(railKey(broker));
        setRail(saved ? JSON.parse(saved) : null);
      } catch {}
      // Land on what needs review if there is any, otherwise everything.
      setFilter(rs.some((r) => statusOf(r) === "review") ? "review" : "all");
    });
    loadBatches();
    fetch("/api/never-seen").then((r) => r.json()).then(setItems);
    fetch("/api/sample").then((r) => r.json()).then(setSamples);
    loadClients();
  }, [broker, batchParam, loadBatch, loadBatches, loadClients]);

  // Lines still being classified server-side (e.g. after switching pages): poll until they land.
  const pending = !busy && rows.some((r) => r.status === "running");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => loadBatch(batchId), 3000);
    return () => clearInterval(t);
  }, [pending, loadBatch, batchId]);

  useEffect(() => {
    if (!rail) return;
    try {
      localStorage.setItem(railKey(broker), JSON.stringify(rail));
    } catch {}
  }, [rail, broker]);

  const updateRow = (lineId: number, suggestion: Suggestion) =>
    setRows((rs) => rs.map((r) => (r.id === lineId ? { ...r, status: "done", suggestion, error: undefined } : r)));

  // New lines replace the queue; lineIds re-runs those rows in place.
  async function run(body: { lines: InLine[]; clientId?: number | null } | { lineIds: number[] }) {
    setBusy(true);
    setComposing(false);
    if ("lines" in body) {
      setRows([]);
      setFilter("all");
    } else setRows((rs) => rs.map((r) => (body.lineIds.includes(r.id) ? { ...r, status: "running", error: undefined } : r)));
    try {
      const res = await fetch(`/api/${broker}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      await readSse(res, (event, data) => {
        if (event === "batch" && "lines" in body) {
          setBatchClient(clients.find((c) => c.id === body.clientId)?.name ?? null);
          setBatchId(data.lines[0]?.batchId ?? null);
          setRows(
            data.lines.map((l: { id: number; text: string; source: string | null; existingCode: string | null }) => ({
              id: l.id,
              text: l.text,
              source: l.source,
              existingCode: l.existingCode,
              status: "running",
            })),
          );
          loadBatches();
        }
        if (event === "result") updateRow(data.lineId, data.suggestion);
        if (event === "error") setRows((rs) => rs.map((r) => (r.id === data.lineId ? { ...r, status: "error", error: data.message } : r)));
      });
    } catch (e) {
      const message = (e as Error).message || "Connection lost";
      setRows((rs) => rs.map((r) => (r.status === "running" ? { ...r, status: "error", error: message } : r)));
    } finally {
      setRows((rs) => rs.map((r) => (r.status === "running" ? { ...r, status: "error", error: "No answer came back" } : r)));
      setBusy(false);
      loadBatches();
    }
  }

  // Each sample invoice belongs to a demo client (importer); make sure it exists, then classify for it.
  const loadSample = useCallback(
    async (id: string) => {
      const sample = await (await fetch(`/api/sample?id=${id}`)).json();
      const client = await (
        await fetch(`/api/${broker}/clients`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sample.client) })
      ).json();
      setClientId(client.id);
      loadClients();
      run({ lines: sample.lines, clientId: client.id });
    },
    // run is recreated each render; the sample only needs the broker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [broker, loadClients],
  );

  // ?sample=<id> (from Home or ⌘K): classify that sample once, then drop the parameter.
  useEffect(() => {
    if (!sampleParam || started.current === sampleParam) return;
    started.current = sampleParam;
    loadSample(sampleParam);
    router.replace(`/${broker}/classify`);
  }, [sampleParam, loadSample, router, broker]);

  function classify(lines: InLine[]) {
    if (lines.length > 0) run({ lines, clientId });
  }

  // .xlsx or .csv: the server finds the header row and the description, qty, value and origin columns.
  async function upload(file: File) {
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/parse-invoice", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) return setUploadError(data.error);
    if (data.lines.length === 0) return setUploadError(`No product lines found in ${file.name}.`);
    classify(data.lines);
  }

  async function pushToShopify(lineIds: number[]) {
    setPushMsg("Writing codes to Shopify…");
    const res = await fetch(`/api/${broker}/shopify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push", lineIds }),
    });
    const data = await res.json();
    if (!res.ok) return setPushMsg(data.error);
    const ok = data.results.filter((r: { ok: boolean }) => r.ok).length;
    const failedOne = data.results.find((r: { ok: boolean; message?: string }) => !r.ok);
    setPushMsg(`${ok} of ${data.results.length} codes written to Shopify${failedOne ? ` · ${failedOne.message}` : ""}`);
    if (ok) loadBatch(batchId);
  }

  async function approve(ids: number[]) {
    await Promise.all(ids.map((id) => fetch(`/api/suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) })));
    setRows((rs) => rs.map((r) => (r.suggestion && ids.includes(r.suggestion.id) ? { ...r, suggestion: { ...r.suggestion, status: "approved" } } : r)));
  }

  // Make sure every never-seen item has a "before" result, so the panel can show the flip.
  async function prepareBaseline() {
    const current: NeverSeenItem[] = await (await fetch("/api/never-seen")).json();
    setItems(current);
    if (current.every((i) => brokers.every((b) => i.brokers[b.id]?.before))) return;
    setPreparing(true);
    try {
      setItems(await (await fetch("/api/never-seen", { method: "POST" })).json());
    } finally {
      setPreparing(false);
    }
  }

  function openPanel() {
    setPanelOpen(true);
    prepareBaseline();
  }

  async function fix(suggestion: Suggestion, code: string, reason: string) {
    setReceipt(null);
    setInlineFix(null);
    setPanelOpen(true);
    setFixing(true);
    setRail(RAIL_TEMPLATE.map((s) => ({ ...s })));
    try {
      const res = await fetch(`/api/${broker}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.id, code, reason }),
      });
      await readSse(res, (event, data) => {
        if (event === "step") setRail((r) => (r ?? RAIL_TEMPLATE).map((s) => (s.id === data.id ? { ...s, state: data.state, detail: data.detail } : s)));
        if (event === "line") updateRow(data.lineId, data.suggestion);
        if (event === "never-seen") setItems(data);
      });
    } finally {
      setFixing(false);
      setItems(await (await fetch("/api/never-seen")).json());
    }
  }

  const counts = useMemo(() => {
    const c = { review: 0, all: rows.length, done: 0, running: 0, ready: 0, failed: 0 };
    for (const r of rows) {
      const s = statusOf(r);
      if (s === "review") c.review++;
      if (s === "approved" || s === "fixed") c.done++;
      if (s === "running") c.running++;
      if (s === "ready") c.ready++;
      if (s === "error") c.failed++;
    }
    return c;
  }, [rows]);

  const visible = rows.filter((r) => {
    const s = statusOf(r);
    if (filter === "review") return s === "review" || s === "error";
    if (filter === "done") return s === "approved" || s === "fixed";
    return true;
  });
  const sel = visible[Math.min(selected, Math.max(visible.length - 1, 0))];
  const readyIds = rows.filter((r) => statusOf(r) === "ready").map((r) => r.suggestion!.id);
  const pendingIds = rows.filter((r) => ["ready", "review"].includes(statusOf(r))).map((r) => r.suggestion!.id);
  const failedIds = rows.filter((r) => r.status === "error").map((r) => r.id);
  const shopifyReady = rows.filter(
    (r) => r.source === "shopify" && r.suggestion && ["approved", "corrected"].includes(r.suggestion.status) && r.existingCode !== r.suggestion.code,
  );
  const showCompose = composing || (loaded && rows.length === 0 && !busy);

  // Keyboard: j/k move, a approve, f fix, enter opens the receipt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [role=dialog], [contenteditable]") || e.metaKey || e.ctrlKey) return;
      if (e.key === "j" || e.key === "ArrowDown") setSelected((i) => Math.min(i + 1, visible.length - 1));
      else if (e.key === "k" || e.key === "ArrowUp") setSelected((i) => Math.max(i - 1, 0));
      else if (!sel?.suggestion) return;
      else if (e.key === "a" && ["review", "ready"].includes(statusOf(sel))) approve([sel.suggestion.id]);
      else if (e.key === "f" && statusOf(sel) !== "fixed") setInlineFix(sel);
      else if (e.key === "Enter") setReceipt(sel);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={cn("-mx-8 -my-7 flex h-screen", panelOpen && "lg:pr-[34rem]")}>
      {/* Invoices */}
      <aside className="flex w-64 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between px-3 py-3">
          <p className="text-[13px] font-medium">Invoices</p>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setComposing(true)} disabled={busy}>
            <Plus /> New
          </Button>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {batches.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">No invoices yet</li>}
          {batches.map((b) => (
            <li key={b.batchId}>
              <button
                type="button"
                onClick={() => {
                  setComposing(false);
                  setSelected(0);
                  router.replace(`/${broker}/classify?batch=${b.batchId}`);
                }}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60",
                  b.batchId === batchId && !composing && "bg-accent",
                )}
              >
                <p className="truncate text-[13px] font-medium">{b.client ?? "No client"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {b.lines} lines · {when(b.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-[15px] font-semibold">
              {showCompose ? "New invoice" : batchClient ?? "Invoice"} <Info id="classify" />
            </h1>
            {!showCompose && batchId && (
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">#{batchId.slice(0, 8)}</span> · {rows.length} lines · {counts.done} signed off
                {counts.running > 0 && <> · {counts.running} classifying</>}
                {pushMsg && <span className="ml-2 text-primary">{pushMsg}</span>}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!showCompose && failedIds.length > 0 && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ lineIds: failedIds })}>
                <RotateCw /> Retry {failedIds.length}
              </Button>
            )}
            {!showCompose && shopifyReady.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => pushToShopify(shopifyReady.map((r) => r.id))}>
                <Upload /> Push {shopifyReady.length} to Shopify
              </Button>
            )}
            {!showCompose && readyIds.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => approve(readyIds)}>
                <Check /> Approve {readyIds.length} confident
              </Button>
            )}
            {!showCompose && counts.review > 0 && (
              <Button size="sm" variant="ghost" onClick={() => approve(pendingIds)}>
                Approve all {pendingIds.length}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={openPanel}>
              <GraduationCap /> Learning
            </Button>
          </div>
        </header>

        {showCompose ? (
          <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">For client</span>
              <Select value={clientId ? String(clientId) : "none"} onValueChange={(v) => setClientId(v === "none" ? null : Number(v))}>
                <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link href={`/${broker}/clients`} className="text-xs text-muted-foreground hover:text-foreground">Manage clients</Link>
            </div>

            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) upload(f);
              }}
            >
              <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
                <FileUp className="size-4" />
              </span>
              <span className="text-sm font-medium">Drop the supplier&apos;s invoice</span>
              <span className="text-xs text-muted-foreground">Excel or CSV. Description, quantity, value and origin columns are found automatically.</span>
              {uploadError && <span className="text-xs text-bad">{uploadError}</span>}
              <input type="file" accept=".xlsx,.csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClipboardPaste className="size-3.5" /> Or paste product lines
              </p>
              <Textarea rows={3} placeholder={"One product per line, e.g.\nBamboo kids' dinner set, plate bowl cup"} value={paste} onChange={(e) => setPaste(e.target.value)} />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !paste.trim()}
                onClick={() => classify(paste.split("\n").map((l) => l.trim()).filter(Boolean).map((description) => ({ description })))}
              >
                Classify lines
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Or try a sample invoice</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={busy}
                    onClick={() => loadSample(s.id)}
                    className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                  >
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{s.about}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b px-6">
              <div className="flex gap-4">
                {(
                  [
                    ["review", "Needs review", counts.review + counts.failed],
                    ["all", "All", counts.all],
                    ["done", "Signed off", counts.done],
                  ] as [Filter, string, number][]
                ).map(([key, label, n]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFilter(key);
                      setSelected(0);
                    }}
                    className={cn(
                      "-mb-px border-b-2 border-transparent py-2.5 text-[13px] text-muted-foreground hover:text-foreground",
                      filter === key && "border-primary text-foreground",
                    )}
                  >
                    {label} <span className="ml-1 tabular-nums text-muted-foreground">{n}</span>
                  </button>
                ))}
              </div>
              <p className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
                <Kbd>J</Kbd><Kbd>K</Kbd> move <Kbd>A</Kbd> approve <Kbd>F</Kbd> fix <Kbd>↵</Kbd> receipt
              </p>
            </div>

            <div className="grid grid-cols-[minmax(0,1.4fr)_10rem_minmax(0,2fr)_5rem_7.5rem] gap-x-4 border-b px-6 py-2 text-[11px] font-medium text-muted-foreground">
              <span>Product</span>
              <span className="flex items-center gap-1">Code <Info id="code" /></span>
              <span>Why</span>
              <span className="flex items-center justify-end gap-1">Sure <Info id="confidence" /></span>
              <span className="text-right">Status</span>
            </div>

            {visible.length === 0 && (
              <p className="px-6 py-16 text-center text-sm text-muted-foreground">
                {filter === "review" ? "Nothing needs review. The rest are confident or signed off." : "No lines here."}
              </p>
            )}

            <ul>
              {visible.map((r, i) => {
                const s = statusOf(r);
                const sug = r.suggestion;
                return (
                  <li
                    key={r.id}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => sug && setReceipt(r)}
                    className={cn(
                      "grid cursor-pointer grid-cols-[minmax(0,1.4fr)_10rem_minmax(0,2fr)_5rem_7.5rem] items-start gap-x-4 border-b border-border/60 px-6 py-2.5",
                      i === selected && "bg-accent/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.text}</p>
                      {r.source === "shopify" && (
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ShoppingBag className="size-3" /> Shopify
                          {r.existingCode ? (
                            <>
                              {" · store has "}
                              <span className={sug && sug.code.slice(0, 6) !== r.existingCode.slice(0, 6) ? "text-bad" : undefined}>
                                <Code code={r.existingCode} className="text-[11px]" />
                              </span>
                            </>
                          ) : (
                            " · no code in store"
                          )}
                        </p>
                      )}
                    </div>

                    {s === "running" ? (
                      <p className="col-span-4 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" /> Checking precedents and the tariff…
                      </p>
                    ) : s === "error" ? (
                      <div className="col-span-4 flex items-center justify-between gap-3">
                        <span className="truncate text-bad">Couldn&apos;t classify: {r.error}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            run({ lineIds: [r.id] });
                          }}
                        >
                          <RotateCw /> Retry
                        </Button>
                      </div>
                    ) : (
                      sug && (
                        <>
                          <button
                            type="button"
                            title="Fix this code (F)"
                            className="group -mx-1.5 flex items-center gap-1.5 justify-self-start rounded px-1.5 py-0.5 hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (s !== "fixed") setInlineFix(r);
                            }}
                          >
                            <Code code={sug.code} className={s === "fixed" ? "text-primary" : undefined} />
                            {s !== "fixed" && <PencilLine className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                          </button>
                          <div className="min-w-0 text-[13px] text-muted-foreground">
                            <p className="line-clamp-2">{sug.reason}</p>
                            {sug.question && sug.status === "pending" && (
                              <div className="mt-1 space-y-0.5">
                                <p className="flex items-start gap-1.5 text-xs text-warn">
                                  <MessageCircleQuestion className="mt-0.5 size-3 shrink-0" />
                                  <span className="line-clamp-1">{sug.question}</span>
                                </p>
                                <ClientEmailButton brokerName={brokerName} product={r.text} question={sug.question} />
                              </div>
                            )}
                            {sug.precedentId && s !== "fixed" && <p className="mt-0.5 text-xs text-primary">Followed precedent #{sug.precedentId}</p>}
                          </div>
                          <p className="text-right tabular-nums">{Math.round(sug.confidence * 100)}%</p>
                          <div className="flex items-center justify-end gap-1">
                            {s === "fixed" && <Status tone="good">Fixed</Status>}
                            {s === "approved" && <Status tone="good">Approved</Status>}
                            {(s === "review" || s === "ready") && (
                              <>
                                {s === "review" ? <Flag className="mr-1 size-3.5 text-warn" aria-label="Needs review" /> : null}
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-7"
                                  title="Approve as it is (A)"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approve([sug.id]);
                                  }}
                                >
                                  <Check />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-7"
                                  title="Fix the code (F)"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineFix(r);
                                  }}
                                >
                                  <PencilLine />
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <ReceiptSheet
        row={receipt}
        onClose={() => setReceipt(null)}
        onFix={fix}
        onApprove={(sg) => {
          approve([sg.id]);
          setReceipt(null);
        }}
      />

      <Dialog open={!!inlineFix} onOpenChange={(o) => !o && setInlineFix(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="leading-snug">{inlineFix?.text}</DialogTitle>
            <DialogDescription>
              The AI said {inlineFix?.suggestion && <Code code={inlineFix.suggestion.code} />}. Pick the right code and say why.
            </DialogDescription>
          </DialogHeader>
          {inlineFix?.suggestion && (
            <FixForm
              currentCode={inlineFix.suggestion.code}
              toolCalls={inlineFix.suggestion.toolCalls}
              onCancel={() => setInlineFix(null)}
              onSubmit={(code, reason) => fix(inlineFix.suggestion!, code, reason)}
            />
          )}
        </DialogContent>
      </Dialog>

      {panelOpen && (
        <LearningPanel broker={broker} brokers={brokers} rail={rail} items={items} preparing={preparing || fixing} onClose={() => setPanelOpen(false)} />
      )}
    </div>
  );
}
