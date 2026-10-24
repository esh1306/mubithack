"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileUp,
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
  Sparkles,
  ChevronDown,
  ChevronRight,
  ReceiptText,
} from "lucide-react";
import { ProcessLog } from "@/components/process-log";
import { parseCalls, type ToolCall } from "@/lib/steps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/ui/kbd";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code } from "@/components/code";
import { Info } from "@/components/info";
import { ClientEmailButton } from "@/components/client-email";
import { FixForm } from "@/components/fix-form";
import { ReceiptSheet, type Suggestion } from "@/components/receipt-sheet";
import {
  LearningPanel,
  RAIL_TEMPLATE,
  type Lesson,
  type NeverSeenItem,
  type RailStep,
  type TeachState,
  type VariantRow,
} from "@/components/learning-panel";
import { DemoCoach, type DemoStep } from "@/components/demo-coach";
import {
  DEMO_BAMBOO_CODE,
  DEMO_BAMBOO_REASON,
  DEMO_SAMPLE_ID,
  demoSessionKey,
  isDemoBambooLine,
  lessonStorageKey,
  prettyRate,
  railStorageKey,
} from "@/lib/demo";
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
  origin?: string | null;
  value?: number | null;
  qty?: number | null;
  // Live tool calls while the line is being classified (the stored ones live on the suggestion).
  calls?: ToolCall[];
};
type Broker = { id: string; name: string };
type Sample = { id: string; name: string; supplier: string; about: string };
type Batch = { batchId: string; lines: number; createdAt: string; client: string | null };
type Filter = "review" | "all" | "done";
type SavedLesson = { lesson: Lesson | null; variants: VariantRow[]; teach: TeachState | null };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function statusOf(r: Row) {
  if (r.status !== "done" || !r.suggestion) return r.status;
  if (r.suggestion.status === "corrected") return "fixed";
  if (r.suggestion.status === "approved") return "approved";
  return r.suggestion.flagged ? "review" : "ready";
}

type Tone = "good" | "warn" | "info" | "bad" | "muted";
const TAG: Record<Tone, string> = {
  good: "bg-[#e7f4ec] text-good ring-good/25",
  warn: "bg-[#fdf3e3] text-warn ring-warn/25",
  info: "bg-[#e8effc] text-info ring-info/25",
  bad: "bg-[#fdecea] text-bad ring-bad/25",
  muted: "bg-muted text-muted-foreground ring-border",
};

function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TAG[tone])}>{children}</span>;
}

// Plain-words status for one line.
function StatusTag({ row }: { row: Row }) {
  const s = statusOf(row);
  if (s === "running") return <Tag tone="info"><Loader2 className="size-3 animate-spin" /> Working</Tag>;
  if (s === "error") return <Tag tone="bad">Couldn&apos;t classify</Tag>;
  if (s === "approved") return <Tag tone="good"><Check className="size-3" /> Approved</Tag>;
  if (s === "fixed") return <Tag tone="good"><Check className="size-3" /> Corrected</Tag>;
  if (row.suggestion?.model === "hmrc-search") return <Tag tone="warn">Unconfirmed</Tag>;
  if (s === "review") return <Tag tone="warn">Needs your review</Tag>;
  return <Tag tone="info">Ready to approve</Tag>;
}

// Where this invoice is in the real procedure: classify against the UK tariff, broker signs off,
// declaration on CDS, then the 3-year post-clearance check (Customs (Import Duty) Regs 2018, reg 59).
function ProcedureBar({
  broker,
  total,
  back,
  waiting,
  done,
}: {
  broker: string;
  total: number;
  back: number;
  waiting: number;
  done: number;
}) {
  const steps: { title: string; note: string; state: "done" | "now" | "next"; href?: string }[] = [
    { title: "Invoice received", note: `${total} product line${total === 1 ? "" : "s"}`, state: total ? "done" : "now" },
    { title: "Checked against the UK tariff", note: `${back} of ${total} back`, state: back === total && total ? "done" : total ? "now" : "next" },
    { title: "Your review", note: waiting ? `${waiting} waiting for you` : "Nothing waiting", state: back === total && total ? (waiting ? "now" : "done") : "next" },
    { title: "Signed off", note: `${done} of ${total}`, state: total && done === total ? "done" : done ? "now" : "next" },
    { title: "Declaration on CDS", note: "You submit; we draft", state: "next", href: `/${broker}/integrations` },
    { title: "3-year duty check", note: "Overpaid duty to reclaim", state: "next", href: `/${broker}/retro-scan` },
  ];
  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
      {steps.map((st, i) => {
        const body = (
          <>
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                st.state === "done" && "bg-good text-white",
                st.state === "now" && "bg-primary text-primary-foreground",
                st.state === "next" && "border border-input bg-card text-muted-foreground",
              )}
            >
              {st.state === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[13px] font-medium leading-tight", st.state === "next" && "text-muted-foreground")}>{st.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{st.note}</span>
            </span>
          </>
        );
        return (
          <li key={st.title} className={cn("bg-card", st.state === "now" && "bg-[#f3f6fd]")}>
            {st.href ? (
              <Link href={st.href} className="flex h-full items-start gap-2.5 px-3.5 py-3 hover:bg-accent">
                {body}
              </Link>
            ) : (
              <div className="flex h-full items-start gap-2.5 px-3.5 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function storeCodeLabel(code: string) {
  const d = code.replace(/\D/g, "");
  if (d.length === 6) {
    return (
      <span className="font-mono text-[11px] tabular-nums">
        {d.slice(0, 4)} {d.slice(4, 6)} <span className="text-muted-foreground">(6-digit HS)</span>
      </span>
    );
  }
  return <Code code={code} className="text-[11px]" />;
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
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState(0);
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [open, setOpen] = useState<number | null>(null);
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
  const [demo, setDemo] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [teach, setTeach] = useState<TeachState | null>(null);
  const [receiptSeen, setReceiptSeen] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

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
  const demoParam = search.get("demo");
  const batchParam = search.get("batch");
  const started = useRef<string | null>(null);
  const bambooPicked = useRef(false);

  useEffect(() => {
    try {
      if (demoParam === "1" || sessionStorage.getItem(demoSessionKey(broker)) === "1") {
        if (demoParam === "1") sessionStorage.setItem(demoSessionKey(broker), "1");
        setDemo(true);
      }
    } catch {
      if (demoParam === "1") setDemo(true);
    }
  }, [demoParam, broker]);

  useEffect(() => {
    // State is set after the fetches resolve, not synchronously; the lint rule can't see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBatch(batchParam).then(() => {
      try {
        const saved = localStorage.getItem(railStorageKey(broker));
        setRail(saved ? JSON.parse(saved) : null);
        const packed = localStorage.getItem(lessonStorageKey(broker));
        if (packed) {
          const data = JSON.parse(packed) as SavedLesson;
          setLesson(data.lesson ?? null);
          setVariants(data.variants ?? []);
          setTeach(data.teach ?? null);
        }
      } catch {}
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
      localStorage.setItem(railStorageKey(broker), JSON.stringify(rail));
    } catch {}
  }, [rail, broker]);

  useEffect(() => {
    try {
      localStorage.setItem(lessonStorageKey(broker), JSON.stringify({ lesson, variants, teach }));
    } catch {}
  }, [lesson, variants, teach, broker]);

  const updateRow = (lineId: number, suggestion: Suggestion) =>
    setRows((rs) => rs.map((r) => (r.id === lineId ? { ...r, status: "done", suggestion, error: undefined, calls: undefined } : r)));

  // New lines replace the queue; lineIds re-runs those rows in place.
  async function run(body: { lines: InLine[]; clientId?: number | null } | { lineIds: number[] }) {
    setBusy(true);
    setComposing(false);
    if ("lines" in body) {
      setRows([]);
      setFilter("all");
      bambooPicked.current = false;
    } else setRows((rs) => rs.map((r) => (body.lineIds.includes(r.id) ? { ...r, status: "running", error: undefined, calls: [] } : r)));
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
            data.lines.map((l: { id: number; text: string; source: string | null; existingCode: string | null; origin: string | null; value: number | null; qty: number | null }) => ({
              id: l.id,
              text: l.text,
              source: l.source,
              existingCode: l.existingCode,
              origin: l.origin,
              value: l.value,
              qty: l.qty,
              status: "running",
            })),
          );
          loadBatches();
        }
        if (event === "start") setRows((rs) => rs.map((r) => (r.id === data.lineId ? { ...r, calls: [] } : r)));
        if (event === "step")
          setRows((rs) => rs.map((r) => (r.id === data.lineId ? { ...r, calls: [...(r.calls ?? []), data.call] } : r)));
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
      // Reopen this client's latest invoice instead of classifying the same sample again;
      // only lines that failed are re-run. "New" or "Reset demo" starts fresh.
      const list: Batch[] = await (await fetch(`/api/${broker}/batch?list=1`)).json();
      const existing = list.find((b) => b.client === client.name && b.lines === sample.lines.length);
      if (existing) {
        const loadedRows = await loadBatch(existing.batchId);
        const failed = loadedRows.filter((r) => r.status === "error").map((r) => r.id);
        if (failed.length) run({ lineIds: failed });
        return;
      }
      run({ lines: sample.lines, clientId: client.id });
    },
    // run is recreated each render; the sample only needs the broker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [broker, loadClients, loadBatch],
  );

  function startDemo() {
    try {
      sessionStorage.setItem(demoSessionKey(broker), "1");
    } catch {}
    setDemo(true);
    setReceiptSeen(false);
    setLesson(null);
    setVariants([]);
    setTeach(null);
    loadSample(DEMO_SAMPLE_ID);
  }

  // ?sample=<id> (from Home or ⌘K): classify that sample once, then drop the parameter.
  useEffect(() => {
    if (!sampleParam || started.current === sampleParam) return;
    started.current = sampleParam;
    if (demoParam === "1") {
      try {
        sessionStorage.setItem(demoSessionKey(broker), "1");
      } catch {}
      setDemo(true);
    }
    loadSample(sampleParam);
    router.replace(`/${broker}/classify`);
  }, [sampleParam, demoParam, loadSample, router, broker]);

  function classify(lines: InLine[]) {
    if (lines.length > 0) run({ lines, clientId });
  }

  // .xlsx or .csv: the server finds the header row and the description, qty, value and origin columns.
  async function upload(file: File) {
    setUploadError(null);
    if (/\.pdf$/i.test(file.name)) {
      return setUploadError("PDF invoices are not parsed yet. Upload a .xlsx or .csv (or a Shopify product CSV).");
    }
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
    setFixError(null);
    setVariants([]);
    setTeach(null);
    setRail(RAIL_TEMPLATE.map((s) => ({ ...s })));
    try {
      const res = await fetch(`/api/${broker}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.id, code, reason }),
      });
      if (!res.ok) {
        setFixError(`Couldn't save the fix (${res.status}). Try again.`);
        return;
      }
      await readSse(res, (event, data) => {
        if (event === "step") setRail((r) => (r ?? RAIL_TEMPLATE).map((s) => (s.id === data.id ? { ...s, state: data.state, detail: data.detail } : s)));
        if (event === "line") updateRow(data.lineId, data.suggestion);
        if (event === "never-seen") setItems(data);
        if (event === "lesson") setLesson(data);
        if (event === "variant") setVariants((vs) => [...vs.filter((v) => v.text !== data.text), data]);
        if (event === "teach") setTeach({ examples: data.examples, trainAfter: data.trainAfter });
        if (event === "fatal") setFixError(data.message);
      });
    } catch (e) {
      setFixError((e as Error).message || "Connection lost while teaching. The fix may still have saved.");
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

  const visible = useMemo(() => {
    const filtered = rows.filter((r) => {
      const s = statusOf(r);
      if (filter === "review") return s === "review" || s === "error";
      if (filter === "done") return s === "approved" || s === "fixed";
      return true;
    });
    const bamboo = rows.filter((r) => isDemoBambooLine(r.text));
    if (!demo || bamboo.length === 0) return filtered;
    const rest = filtered.filter((r) => !isDemoBambooLine(r.text));
    const pinned = bamboo.filter((r, i, xs) => xs.findIndex((x) => x.id === r.id) === i);
    return [...pinned, ...rest];
  }, [rows, filter, demo]);

  const sel = visible[Math.min(selected, Math.max(visible.length - 1, 0))];
  const readyIds = rows.filter((r) => statusOf(r) === "ready").map((r) => r.suggestion!.id);
  const failedIds = rows.filter((r) => r.status === "error").map((r) => r.id);
  const shopifyReady = rows.filter(
    (r) => r.source === "shopify" && r.suggestion && ["approved", "corrected"].includes(r.suggestion.status) && r.existingCode !== r.suggestion.code,
  );
  const showCompose = composing || (loaded && rows.length === 0 && !busy);
  const classifying = busy || counts.running > 0;
  const bambooRow = rows.find((r) => isDemoBambooLine(r.text));

  useEffect(() => {
    if (!demo || bambooPicked.current) return;
    const i = visible.findIndex((r) => isDemoBambooLine(r.text) && r.status === "done");
    if (i >= 0) {
      bambooPicked.current = true;
      setSelected(i);
    }
  }, [demo, visible]);

  const coachStep: DemoStep = useMemo(() => {
    if (classifying || (demo && rows.length === 0)) return "classify";
    if (fixing || (rail && rail.some((s) => s.state === "running"))) return "learn";
    if (bambooRow && statusOf(bambooRow) !== "fixed") return "fix";
    if (bambooRow && statusOf(bambooRow) === "fixed" && !receiptSeen) return "receipt";
    if (bambooRow && statusOf(bambooRow) === "fixed") return "retro";
    return "classify";
  }, [classifying, demo, rows.length, fixing, rail, bambooRow, receiptSeen]);

  function exitGuide() {
    try {
      sessionStorage.removeItem(demoSessionKey(broker));
    } catch {}
    setDemo(false);
  }

  function openReceipt(row: Row) {
    setReceipt(row);
    if (isDemoBambooLine(row.text) && statusOf(row) === "fixed") setReceiptSeen(true);
  }

  const fixPrefs = (row: Row | null) =>
    row && isDemoBambooLine(row.text)
      ? { preferredCode: DEMO_BAMBOO_CODE, defaultReason: DEMO_BAMBOO_REASON }
      : { preferredCode: undefined, defaultReason: undefined };

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
      else if (e.key === "Enter") openReceipt(sel);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={cn("-mx-5 -mb-10 -mt-20 min-h-screen md:-mx-12 md:-my-10", panelOpen && "lg:pr-[34rem]")}>
      {/* Main */}
      <section className="mx-auto flex w-full max-w-[84rem] min-w-0 flex-col gap-5 px-5 pb-12 pt-20 md:px-10 md:pt-10">
        {demo && <DemoCoach step={coachStep} broker={broker} onSkip={exitGuide} />}

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Inbox</span>
              <ChevronRight className="size-3.5" />
              <Select
                value={!showCompose && batchId ? batchId : "new"}
                onValueChange={(v) => {
                  if (v === "new") return setComposing(true);
                  setComposing(false);
                  setSelected(0);
                  setOpen(null);
                  router.replace(`/${broker}/classify?batch=${v}`);
                }}
              >
                <SelectTrigger className="h-8 w-auto max-w-[22rem] gap-2 bg-card text-foreground">
                  <SelectValue placeholder="Choose an invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ New invoice</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.batchId} value={b.batchId}>
                      {b.client ?? "Unassigned invoice"} · {b.lines} lines · {when(b.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <h1 className="flex items-center gap-2 font-serif text-[30px] leading-tight">
              {showCompose ? "New invoice" : batchClient ?? "Unassigned invoice"} <Info id="classify" className="mt-1" />
            </h1>
            {!showCompose && batchId && (
              <p className="text-sm text-muted-foreground">
                Invoice <span className="font-mono">#{batchId.slice(0, 8)}</span> · {rows.length} lines · {counts.done} signed off
                {pushMsg && <span className="ml-2 text-info">{pushMsg}</span>}
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
              <Button size="sm" onClick={() => approve(readyIds)}>
                <Check /> Approve {readyIds.length} ready
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={openPanel}>
              <GraduationCap /> Learning
            </Button>
            <Button size="sm" variant="outline" onClick={() => setComposing(true)} disabled={busy}>
              <Plus /> New invoice
            </Button>
          </div>
        </header>

        {!showCompose && rows.length > 0 && (
          <ProcedureBar broker={broker} total={rows.length} back={rows.length - counts.running} waiting={counts.review + counts.ready} done={counts.done} />
        )}

        {lesson && !showCompose && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] px-5 py-4">
            <p className="text-[13px] font-medium text-primary">Before / after your fix</p>
            <p className="mt-2 text-[15px] leading-relaxed">
              Before your fix: <Code code={lesson.oldCode} className="line-through opacity-60" /> at {prettyRate(lesson.oldRate)}
              {"  ·  "}
              After: <Code code={lesson.newCode} className="text-primary" /> at {prettyRate(lesson.newRate)} — because of Precedent #{lesson.precedentId}
            </p>
          </div>
        )}

        {showCompose ? (
          <div className="w-full max-w-3xl space-y-8">
            <button
              type="button"
              disabled={busy}
              onClick={startDemo}
              className="flex w-full items-start gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-4 text-left transition-colors hover:border-primary/50"
            >
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="block font-medium">Play the 3-minute demo</span>
                <span className="block text-sm text-muted-foreground">
                  Ningbo homeware · fix the bamboo dinner set · watch a never-seen line come back right.
                </span>
              </span>
            </button>

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
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card px-6 py-14 text-center transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) upload(f);
              }}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileUp className="size-5" />
              </span>
              <span className="font-serif text-2xl">Drop the supplier&apos;s invoice</span>
              <span className="text-sm text-muted-foreground">Excel or CSV. Description, quantity, value and origin columns are found automatically.</span>
              {uploadError && <span className="text-xs text-bad">{uploadError}</span>}
              <input type="file" accept=".xlsx,.csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
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
              <p className="text-sm font-medium text-muted-foreground">Or try a sample invoice</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={busy}
                    onClick={() => (s.id === DEMO_SAMPLE_ID ? startDemo() : loadSample(s.id))}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/40"
                  >
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-sm text-muted-foreground">{s.about}</span>
                      {s.id === DEMO_SAMPLE_ID && <span className="mt-1 block text-xs text-primary">3-minute demo</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-6">
              <div className="flex gap-4">
                {(
                  [
                    ["all", "All", counts.all],
                    ["review", "Needs review", counts.review + counts.failed],
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
                      "-mb-px border-b-2 border-transparent py-3.5 text-[15px] text-muted-foreground hover:text-foreground",
                      filter === key && "border-primary text-foreground",
                    )}
                  >
                    {label} <span className="ml-1 tabular-nums text-muted-foreground">{n}</span>
                  </button>
                ))}
              </div>
              <p className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
                <Kbd>J</Kbd><Kbd>K</Kbd> move <Kbd>A</Kbd> approve <Kbd>F</Kbd> fix <Kbd>↵</Kbd> receipt
              </p>
            </div>

            <div className="hidden grid-cols-[1.25rem_minmax(0,1.4fr)_9rem_minmax(0,2fr)_9.5rem] gap-x-4 border-b border-border bg-muted/60 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
              <span />
              <span>Product</span>
              <span className="flex items-center gap-1">Commodity code <Info id="code" /></span>
              <span>Reason</span>
              <span className="text-right">Status</span>
            </div>

            {visible.length === 0 && (
              <p className="px-6 py-16 text-center text-muted-foreground">
                {classifying
                  ? "Lines will appear here as each one comes back."
                  : filter === "review"
                    ? "Nothing needs review. Switch to All to see every line."
                    : filter === "done"
                      ? "Nothing signed off yet. Approve or fix a line first."
                      : "No lines here."}
              </p>
            )}

            <ul>
              {visible.map((r, i) => {
                const s = statusOf(r);
                const sug = r.suggestion;
                const bamboo = demo && isDemoBambooLine(r.text);
                const expanded = open === r.id;
                const calls = s === "running" ? r.calls ?? [] : parseCalls(sug?.toolCalls);
                return (
                  <li
                    key={r.id}
                    className={cn("border-b border-border last:border-b-0", i === selected && !expanded && "bg-accent/40", expanded && "bg-[#fafbfd]")}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => setOpen(expanded ? null : r.id)}
                      onKeyDown={(e) => e.key === " " && (e.preventDefault(), setOpen(expanded ? null : r.id))}
                      className={cn(
                        "grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[1.25rem_minmax(0,1.4fr)_9rem_minmax(0,2fr)_9.5rem]",
                        bamboo && "shadow-[inset_3px_0_0_var(--brand)]",
                      )}
                    >
                      <ChevronDown className={cn("mt-1 size-4 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{r.text}</p>
                        {bamboo && <p className="mt-1 text-xs font-medium text-brand">{s === "fixed" ? "Demo line · corrected" : "Demo line · the one to fix"}</p>}
                        {r.source === "shopify" && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <ShoppingBag className="size-3" /> Shopify
                            {r.existingCode ? (
                              <>
                                {" · store has "}
                                <span className={sug && sug.code.slice(0, 6) !== r.existingCode.replace(/\D/g, "").slice(0, 6) ? "text-bad" : undefined}>
                                  {storeCodeLabel(r.existingCode)}
                                </span>
                              </>
                            ) : (
                              " · no code in store"
                            )}
                          </p>
                        )}
                      </div>

                      <div className="md:hidden">
                        <StatusTag row={r} />
                      </div>

                      {s === "running" ? (
                        <div className="col-span-2 col-start-2 md:col-span-2 md:col-start-auto">
                          <ProcessLog calls={calls} live compact />
                        </div>
                      ) : s === "error" ? (
                        <p className="col-span-2 col-start-2 text-sm text-bad md:col-span-2 md:col-start-auto">{r.error}</p>
                      ) : (
                        sug && (
                          <>
                            <div className="col-start-2 md:col-start-auto">
                              <Code code={sug.code} className={cn("text-[15px]", s === "fixed" && "text-good")} />
                            </div>
                            <div className="col-span-2 col-start-2 min-w-0 text-sm leading-relaxed text-muted-foreground md:col-span-1 md:col-start-auto">
                              <p className={cn(!expanded && "line-clamp-2")}>{sug.reason}</p>
                              {sug.question && sug.status === "pending" && (
                                <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-warn">
                                  <MessageCircleQuestion className="mt-0.5 size-3 shrink-0" />
                                  <span className="line-clamp-1">Ask the importer: {sug.question}</span>
                                </p>
                              )}
                              {sug.precedentId && s !== "fixed" && <p className="mt-0.5 text-xs font-medium text-info">Followed your precedent #{sug.precedentId}</p>}
                            </div>
                          </>
                        )
                      )}

                      <div className="hidden justify-end md:flex">
                        {s === "running" ? <StatusTag row={r} /> : s === "error" ? (
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
                        ) : (
                          <StatusTag row={r} />
                        )}
                      </div>
                    </div>

                    {expanded && s !== "running" && sug && (
                      <div className="grid gap-6 border-t border-border px-5 pb-6 pt-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:pl-14">
                        <div>
                          <p className="mb-3 font-serif text-[17px] text-foreground">How this code was reached</p>
                          <ProcessLog calls={calls} />
                        </div>
                        <aside className="space-y-4 rounded-lg border border-border bg-card p-4 self-start">
                          <div>
                            <p className="text-xs text-muted-foreground">Proposed code</p>
                            <Code code={sug.code} className="text-lg" />
                            <p className="mt-1 text-xs text-muted-foreground">
                              {sug.model === "hmrc-search"
                                ? "From HMRC's search only · not reviewed by the AI"
                                : sug.model === "broker"
                                  ? "Set by your team"
                                  : sug.model === "precedent"
                                    ? "From your precedent"
                                    : `AI confidence ${Math.round(sug.confidence * 100)}%`}
                            </p>
                          </div>
                          {sug.question && sug.status === "pending" && (
                            <div className="rounded-md bg-[#fdf3e3] p-3 text-sm">
                              <p className="font-medium text-warn">Question for the importer</p>
                              <p className="mt-1">{sug.question}</p>
                              <div className="mt-2">
                                <ClientEmailButton brokerName={brokerName} product={r.text} question={sug.question} />
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {(s === "review" || s === "ready") && (
                              <Button size="sm" onClick={() => approve([sug.id])}>
                                <Check /> Approve this code
                              </Button>
                            )}
                            {s !== "fixed" && (
                              <Button size="sm" variant="outline" onClick={() => setInlineFix(r)}>
                                <PencilLine /> Correct it
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openReceipt(r)}>
                              <ReceiptText /> Full receipt
                            </Button>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            You sign every code. Precedent never files for you; the declaration is yours to submit on CDS.
                          </p>
                        </aside>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <ReceiptSheet
        row={receipt}
        broker={broker}
        preferredCode={fixPrefs(receipt).preferredCode}
        defaultReason={fixPrefs(receipt).defaultReason}
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
              preferredCode={fixPrefs(inlineFix).preferredCode}
              defaultReason={fixPrefs(inlineFix).defaultReason}
              onCancel={() => setInlineFix(null)}
              onSubmit={(code, reason) => fix(inlineFix.suggestion!, code, reason)}
            />
          )}
        </DialogContent>
      </Dialog>

      {panelOpen && (
        <LearningPanel
          broker={broker}
          brokers={brokers}
          rail={rail}
          items={items}
          preparing={preparing || fixing}
          lesson={lesson}
          variants={variants}
          teach={teach}
          error={fixError}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
