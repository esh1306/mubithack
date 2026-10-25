"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Cpu,
  Brain,
  Check,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Landmark,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Code } from "@/components/code";
import { Prue, type PrueState } from "@/components/prue";
import { CustomsScene } from "@/components/customs-scene";
import { ClientToolbar, sortClients, useClientSort } from "@/components/client-sort";
import { readSse } from "@/lib/sse";
import { describeStep, pretty, type ToolCall } from "@/lib/steps";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------------------------
// Types

type Client = { id: number; name: string; eori: string | null; invoices: number };
type InLine = { description: string; qty?: number; value?: number; origin?: string };
type Sug = { id: number; code: string; reason: string; status: string; model: string | null };
type Tariff = {
  dutyRate: string | null;
  vat: string | null;
  pathParts: string[];
  flags: string[];
  preference: { rate: string; scheme: string } | null;
  amounts: { duty: number; dutyWithPreference: number | null; vat: number | null } | null;
  url: string;
};
type Line = { id: number; text: string; qty: number | null; value: number | null; origin: string | null; sug?: Sug; tariff?: Tariff; state: "waiting" | "checking" | "done" | "error" };
type Log = { key: string; lineId: number; kind: "search" | "notes" | "found" | "duty" | "pref" | "warn"; title: string; detail?: string; source?: string };
type Variant = { text: string; code: string | null; matched: boolean; requestIds: string[]; skipped: string | null };
type Unseen = { text: string; shouldChange: boolean; brokers: Record<string, { before: { code: string } | null; now: { code: string; model: string | null } | null }> };
type Learn = { precedentId: number | null; variants: Variant[]; total: number; unseen: Unseen[]; examples: number | null; trainAfter: number; done: boolean };
type Entry = { id: number; entryDate: string; text: string; declaredCode: string; finding: { suggestedCode: string; direction: string; dutyDelta: number } | null };

const STAGES = [
  { id: "client", label: "Client" },
  { id: "invoice", label: "Invoice" },
  { id: "check", label: "HMRC check" },
  { id: "review", label: "Your review" },
  { id: "file", label: "Declaration" },
  { id: "lookback", label: "3-year check" },
  { id: "impact", label: "Impact" },
] as const;
type StageId = (typeof STAGES)[number]["id"];

const DEMO_SAMPLE = "00-tour";
const DEMO_CLIENT = "Sunrise Homeware Ltd";
const SPEC = "Bamboo fibre bound with melamine resin (supplier spec sheet).";
const REASON = "The supplier's spec sheet says bamboo fibre bound with melamine resin, so this is kitchenware of plastics (ch. 39), not bamboo or paperboard. Consigned from China, so 3924 10 00 11.";

const gbp = (n: number, dp = 2) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: dp, maximumFractionDigits: dp });
const isBamboo = (t: string) => /bamboo/i.test(t);
const rate = (r: string | null | undefined) => (r ? r.replace(/\.00\s*%/, "%").replace(/(\.\d)0\s*%/, "$1%") : "—");
const COUNTRY: Record<string, string> = { CN: "China", BD: "Bangladesh", VN: "Vietnam", IN: "India", TR: "Turkey" };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? `Server error ${r.status}`);
  return r.json();
}

async function tariffFor(l: { sug?: Sug; origin: string | null; value: number | null }, code = l.sug?.code) {
  const q = new URLSearchParams();
  if (l.origin) q.set("origin", l.origin);
  if (l.value) q.set("value", String(l.value));
  return json<Tariff>(`/api/tariff/${code}?${q}`);
}

// ---------------------------------------------------------------------------------------------
// Pieces

function Timeline({ at, reached, go }: { at: number; reached: number; go: (i: number) => void }) {
  return (
    <ol className="flex items-start gap-0 overflow-x-auto pb-1">
      {STAGES.map((s, i) => {
        const done = i < at;
        const here = i === at;
        return (
          <li key={s.id} className="flex min-w-[6.5rem] flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <span className={cn("h-[3px] flex-1 rounded-full transition-colors duration-500", i === 0 ? "bg-transparent" : i <= at ? "bg-primary" : "bg-border")} />
              <button
                type="button"
                disabled={i > reached}
                onClick={() => go(i)}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                  done && "border-primary bg-primary text-primary-foreground",
                  here && "scale-110 border-primary bg-card text-primary shadow-[0_0_0_5px_rgba(19,48,107,0.12)]",
                  !done && !here && "border-border bg-card text-muted-foreground",
                )}
                aria-current={here ? "step" : undefined}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </button>
              <span className={cn("h-[3px] flex-1 rounded-full transition-colors duration-500", i === STAGES.length - 1 ? "bg-transparent" : i < at ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("text-center text-[13px]", here ? "font-semibold text-foreground" : "text-muted-foreground")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// The tour's voice: what is happening, and what it is worth. Speech bubble with a tail toward the work.
function Guide({ title, what, worth, tip, children, mood = "idle" }: { title: string; what: React.ReactNode; worth?: React.ReactNode; tip?: React.ReactNode; children?: React.ReactNode; mood?: PrueState }) {
  return (
    <aside key={title} className="guide-bubble lg:sticky lg:top-8">
      <div className="mb-1 flex items-end gap-3 pl-2">
        <Prue state={mood} size={84} label="Prue, your guide" />
        <div className="pb-3">
          <p className="text-sm font-semibold leading-tight">Prue</p>
          <p className="text-xs text-muted-foreground">Your guide through Precedent</p>
        </div>
      </div>
      <div className="relative rounded-2xl border border-primary/20 bg-card p-5 shadow-[0_12px_32px_-18px_rgba(19,48,107,0.45)]">
        <span className="absolute -top-2 left-4 size-4 rotate-45 border-l border-t border-primary/20 bg-card" />
        <h3 className="font-serif text-[21px] leading-snug">{title}</h3>
        <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-foreground/85">{what}</div>
        {worth && (
          <div className="mt-4 flex gap-2.5 rounded-xl bg-good/10 px-3.5 py-3 text-[14px] leading-relaxed">
            <CircleDollarSign className="mt-0.5 size-4 shrink-0 text-good" />
            <div>
              <p className="font-semibold text-good">Why it matters</p>
              <div className="text-foreground/85">{worth}</div>
            </div>
          </div>
        )}
        {tip && (
          <div className="mt-3 flex gap-2.5 rounded-xl border border-brand/30 bg-brand/[0.06] px-3.5 py-3 text-[14px] leading-relaxed">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
            <div>
              <p className="font-semibold text-brand">Your move</p>
              <div className="text-foreground/85">{tip}</div>
            </div>
          </div>
        )}
        {children}
      </div>
    </aside>
  );
}

function StageHead({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <header className="space-y-1.5">
      <p className="text-sm font-medium text-primary">Step {n} of {STAGES.length}</p>
      <h2 className="font-serif text-[34px] leading-tight tracking-[-0.01em]">{title}</h2>
      <p className="max-w-2xl text-[16px] text-muted-foreground">{sub}</p>
    </header>
  );
}

function LogIcon({ kind }: { kind: Log["kind"] }) {
  const map = {
    search: [Search, "bg-info/10 text-info"],
    notes: [BookOpen, "bg-primary/10 text-primary"],
    found: [Check, "bg-good/15 text-good"],
    duty: [CircleDollarSign, "bg-primary/10 text-primary"],
    pref: [Sparkles, "bg-good/15 text-good"],
    warn: [TriangleAlert, "bg-warn/15 text-warn"],
  } as const;
  const [Icon, cls] = map[kind];
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", cls)}>
      <Icon className="size-3.5" />
    </span>
  );
}

function Money({ label, value, tone, note }: { label: string; value: string; tone: "good" | "bad" | "ink"; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-serif text-[38px] leading-none tabular-nums", tone === "good" && "text-good", tone === "bad" && "text-bad")}>{value}</p>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}

// After a correction: the fix applied to products this broker has never seen, other brokers untouched,
// and the correction (with paraphrases) sent to this broker's Mubit task as training examples.
function LearnPanel({ learn, broker, brokerName, lineText }: { learn: Learn; broker: string; brokerName: string; lineText: string }) {
  const words = new Set(lineText.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3));
  const related = (t: string) => t.toLowerCase().split(/[^a-z]+/).some((w) => words.has(w));
  const mine = learn.unseen.filter((u) => u.brokers[broker] && related(u.text));
  const other = Object.keys(learn.unseen[0]?.brokers ?? {}).find((b) => b !== broker);
  const sentIds = learn.variants.flatMap((v) => v.requestIds);
  const notSent = learn.variants.length > 0 && sentIds.length === 0;
  return (
    <div className="guide-bubble overflow-hidden rounded-xl border-2 border-primary/30 bg-card">
      <div className="flex items-center gap-3 border-b border-border/70 bg-primary/[0.05] px-5 py-3.5">
        <Brain className="size-5 text-primary" />
        <p className="flex-1 font-medium">
          Learning from your correction{learn.precedentId ? ` · precedent #${learn.precedentId}` : ""}
        </p>
        {!learn.done ? <Loader2 className="size-4 animate-spin text-info" /> : <Check className="size-4 text-good" />}
      </div>
      <div className="grid gap-px bg-border/70 lg:grid-cols-2">
        <div className="space-y-3 bg-card p-5">
          <p className="text-sm font-semibold">Products {brokerName} has never coded</p>
          {mine.length === 0 && <p className="text-sm text-muted-foreground">Trying similar products…</p>}
          <ul className="space-y-2">
            {mine.map((u) => {
              const b = u.brokers[broker];
              const flipped = b.before && b.now && b.before.code !== b.now.code;
              return (
                <li key={u.text} className="log-line flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">{u.text}</span>
                  <span className="flex items-center gap-1.5">
                    {b.before && <Code code={b.before.code} className={cn("text-[12px]", flipped && "line-through opacity-50")} />}
                    {flipped && (
                      <>
                        <ArrowRight className="size-3 text-primary" />
                        <Code code={b.now!.code} className="text-[12px] text-primary" />
                      </>
                    )}
                    {!flipped && b.now && !u.shouldChange && <span className="text-xs text-muted-foreground">stays: real bamboo</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {other && mine.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Other brokers on Precedent don&apos;t get this correction: each firm&apos;s judgement stays its own.
            </p>
          )}
        </div>
        <div className="space-y-3 bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Cpu className="size-4 text-primary" /> Teaching Mubit
          </p>
          <p className="text-sm text-muted-foreground">
            The correction is rephrased the way suppliers might write it, and each version goes through {brokerName}&apos;s own Mubit task as a training example.
          </p>
          <ul className="max-h-44 space-y-1.5 overflow-y-auto">
            {learn.variants.map((v) => (
              <li key={v.text} className="log-line flex items-center justify-between gap-2 text-[13px]">
                <span className="min-w-0 truncate">“{v.text}”</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{v.requestIds[0] ? v.requestIds[0].slice(0, 10) : "not recorded"}</span>
              </li>
            ))}
          </ul>
          {learn.examples !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Examples on {brokerName}&apos;s Mubit task</span>
                <span className="tabular-nums">
                  {learn.examples} of {learn.trainAfter} to first training
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (learn.examples / learn.trainAfter) * 100)}%` }} />
              </div>
            </div>
          )}
          {learn.done && notSent && (
            <p className="rounded-md bg-[#fdf3e3] px-3 py-2 text-xs">
              Mubit didn&apos;t record these: the Mubit key on this server was rejected. The correction itself is saved and already applied above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

export function TourView({ broker, brokerName }: { broker: string; brokerName: string }) {
  const [at, setAt] = useState(0);
  const [reached, setReached] = useState(0);
  const go = useCallback((i: number) => {
    setAt(i);
    setReached((r) => Math.max(r, i));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const stage: StageId = STAGES[at].id;

  // 1 · client
  const [clients, setClients] = useState<Client[] | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEori, setNewEori] = useState("");
  const client = clients?.find((c) => c.id === clientId) ?? null;
  const clientSort = useClientSort();
  const shownClients = clients ? sortClients(clients, clientSort.sort, clientSort.q) : null;

  // 2 · invoice
  const [source, setSource] = useState<"demo" | "file" | "shopify" | null>(null);
  const [inLines, setInLines] = useState<InLine[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const isDemo = source === "demo";

  // 3 · check
  const [lines, setLines] = useState<Line[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [log, setLog] = useState<Log[]>([]);
  const queue = useRef<Log[]>([]);
  const [streamDone, setStreamDone] = useState(false);
  const [hmrcCalls, setHmrcCalls] = useState(0);
  const [aiOffline, setAiOffline] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [draining, setDraining] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);
  const saved = useRef(new Map<number, Line>());
  const checking = stage === "check" && (!streamDone || draining);

  // 4 · review
  const [openFix, setOpenFix] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [cands, setCands] = useState<{ code: string; description: string }[] | null>(null);
  const [pick, setPick] = useState<{ code: string; description: string; tariff?: Tariff } | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [learn, setLearn] = useState<Learn | null>(null);
  const [busy, setBusy] = useState(false);

  // 6 · look back
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    json<Client[]>(`/api/${broker}/clients`).then(setClients).catch(() => setClients([]));
  }, [broker]);

  // Drip the live log so a person can follow it; the calls themselves are real and already made.
  useEffect(() => {
    if (stage !== "check") return;
    const t = setInterval(() => {
      const next = queue.current.shift();
      setDraining(queue.current.length > 0 || !!next);
      if (next) setLog((l) => [...l, next]);
    }, 380);
    return () => clearInterval(t);
  }, [stage]);
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [log.length]);

  // ---- actions

  async function addClient() {
    if (!newName.trim()) return;
    const c = await json<Client>(`/api/${broker}/clients`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, eori: newEori }) });
    const list = await json<Client[]>(`/api/${broker}/clients`);
    setClients(list);
    setClientId(c.id);
    setAdding(false);
    setNewName("");
    setNewEori("");
  }

  async function loadDemo() {
    setSource("demo");
    setFileName(null);
    setFileError(null);
    const s = await json<{ lines: InLine[] }>(`/api/sample?id=${DEMO_SAMPLE}`);
    setInLines(s.lines);
  }

  async function loadFile(file: File, kind: "file" | "shopify") {
    setSource(kind);
    setFileError(null);
    setFileName(file.name);
    setInLines(null);
    if (kind === "shopify") {
      if (!clientId) return;
      const csv = await file.text();
      const r = await fetch(`/api/${broker}/clients/${clientId}/shopify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import-csv", csv }) });
      const d = await r.json();
      if (!r.ok || !d.lines?.length) return setFileError(d.error ?? "No products found in that CSV.");
      return setInLines(d.lines);
    }
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/parse-invoice", { method: "POST", body: form });
    const d = await r.json();
    if (!r.ok || !d.lines?.length) return setFileError(d.error ?? `No product lines found in ${file.name}.`);
    setInLines(d.lines);
  }

  async function runCheck() {
    if (!inLines) return;
    go(2);
    setLog([]);
    queue.current = [];
    setStreamDone(false);
    setHmrcCalls(0);
    const started = performance.now();
    const push = (l: Log) => queue.current.push(l);
    const lookups: Promise<void>[] = [];
    let calls = 0;

    const res = await fetch(`/api/${broker}/classify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: inLines, clientId }) });
    await readSse(res, (event, data) => {
      if (event === "batch") {
        setBatchId(data.lines[0]?.batchId ?? null);
        saved.current = new Map(data.lines.map((l: Line) => [l.id, l]));
        setLines(data.lines.map((l: Line) => ({ id: l.id, text: l.text, qty: l.qty, value: l.value, origin: l.origin, state: "waiting" })));
      }
      if (event === "start") setLines((ls) => ls.map((l) => (l.id === data.lineId ? { ...l, state: "checking" } : l)));
      if (event === "step") {
        const call = data.call as ToolCall;
        if (call.tool === "fallback" || call.tool === "decision") return;
        calls += 1;
        setHmrcCalls(calls);
        const s = describeStep(call);
        const kind: Log["kind"] = s.kind === "search" ? "search" : s.kind === "notes" ? "notes" : s.kind === "verify" ? "found" : "search";
        push({ key: `${data.lineId}-${calls}`, lineId: data.lineId, kind, title: s.title, detail: s.detail ?? s.items?.[0]?.label, source: s.source?.label });
      }
      if (event === "result") {
        const sug = data.suggestion as Sug;
        if (sug.model === "hmrc-search") setAiOffline(true);
        setLines((ls) => ls.map((l) => (l.id === data.lineId ? { ...l, sug, state: "done" } : l)));
        lookups.push(
          (async () => {
            const row = saved.current.get(data.lineId);
            const line = { origin: row?.origin ?? null, value: row?.value ?? null, sug };
            const t = await tariffFor(line).catch(() => null);
            calls += 1;
            setHmrcCalls(calls);
            if (!t) return;
            setLines((ls) => ls.map((l) => (l.id === data.lineId ? { ...l, tariff: t } : l)));
            const amt = t.amounts;
            push({
              key: `${data.lineId}-duty`,
              lineId: data.lineId,
              kind: "duty",
              title: `${pretty(sug.code)} · duty ${rate(t.dutyRate)}, VAT ${rate(t.vat ?? "20%")}`,
              detail: amt ? `On ${gbp(line.value ?? 0, 0)}: ${gbp(amt.duty)} duty, ${gbp(amt.vat ?? 0)} import VAT` : undefined,
              source: "UK Trade Tariff · live",
            });
            if (t.preference && amt && amt.dutyWithPreference !== null && amt.dutyWithPreference < amt.duty) {
              push({
                key: `${data.lineId}-pref`,
                lineId: data.lineId,
                kind: "pref",
                title: `Made in ${COUNTRY[line.origin ?? ""] ?? line.origin}: ${rate(t.preference.rate)} duty under a trade preference`,
                detail: `${t.preference.scheme}. Saves ${gbp(amt.duty - amt.dutyWithPreference)} with proof of origin.`,
                source: "Rules of origin · HMRC",
              });
            }
            for (const f of t.flags) push({ key: `${data.lineId}-${f}`, lineId: data.lineId, kind: "warn", title: f, source: "UK Trade Tariff" });
          })(),
        );
      }
      if (event === "error") setLines((ls) => ls.map((l) => (l.id === data.lineId ? { ...l, state: "error" } : l)));
    });
    await Promise.all(lookups);
    setSeconds(Math.max(1, Math.round((performance.now() - started) / 1000)));
    setStreamDone(true);
  }

  async function searchHmrc() {
    if (!q.trim()) return;
    setCands(null);
    const d = await json<{ candidates: { code: string; description: string }[] }>(`/api/tariff/candidates?q=${encodeURIComponent(q)}`);
    setCands(d.candidates.slice(0, 5));
  }

  async function choose(c: { code: string; description: string }, line: Line) {
    setPick(c);
    const t = await tariffFor(line, c.code).catch(() => undefined);
    setPick({ ...c, tariff: t });
  }

  async function saveFix(line: Line) {
    if (!pick || !line.sug || !reason.trim()) return;
    setSaving(true);
    try {
      setLearn({ precedentId: null, variants: [], total: 0, unseen: [], examples: null, trainAfter: 25, done: false });
      const res = await fetch(`/api/${broker}/fix`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suggestionId: line.sug.id, code: pick.code, reason }) });
      setOpenFix(null);
      setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, sug: { ...l.sug!, code: pick.code, status: "corrected" }, tariff: pick.tariff ?? l.tariff } : l)));
      if (res.ok && res.body)
        await readSse(res, (event, data) => {
          if (event === "lesson") setLearn((x) => x && { ...x, precedentId: data.precedentId });
          if (event === "variant") setLearn((x) => x && { ...x, total: data.total, examples: data.examples, trainAfter: data.trainAfter, variants: [...x.variants, data] });
          if (event === "never-seen") setLearn((x) => x && { ...x, unseen: data });
          if (event === "teach") setLearn((x) => x && { ...x, examples: data.examples, trainAfter: data.trainAfter });
        });
      setLearn((x) => x && { ...x, done: true });
      if (!pick.tariff) {
        const t = await tariffFor(line, pick.code).catch(() => undefined);
        setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, tariff: t } : l)));
      }
    } finally {
      setSaving(false);
    }
  }

  async function approve(ids: number[]) {
    setBusy(true);
    await Promise.all(ids.map((id) => fetch(`/api/suggestions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) })));
    setLines((ls) => ls.map((l) => (l.sug && ids.includes(l.sug.id) ? { ...l, sug: { ...l.sug, status: "approved" } } : l)));
    setBusy(false);
  }

  async function runLookback() {
    setScan({ done: 0, total: 1 });
    const res = await fetch(`/api/${broker}/retro-scan`, { method: "POST" });
    await readSse(res, (event, data) => {
      if (event === "progress") setScan({ done: data.done, total: data.total });
      if (event === "entries") setEntries(data);
    });
    setScan(null);
    if (!entries) setEntries(await json<Entry[]>(`/api/${broker}/retro-scan`));
  }

  // ---- derived numbers

  const unsigned = lines.filter((l) => l.sug && l.sug.status === "pending");
  const fixTarget = isDemo ? lines.find((l) => isBamboo(l.text)) : undefined;
  const fixed = lines.find((l) => l.sug?.status === "corrected");
  const total = (inLines ?? []).reduce((s, l) => s + (l.value ?? 0), 0);
  const dutyTotal = lines.reduce((s, l) => s + (l.tariff?.amounts ? (l.tariff.amounts.dutyWithPreference ?? l.tariff.amounts.duty) : 0), 0);
  const vatTotal = lines.reduce((s, l) => s + (l.tariff?.amounts?.vat ?? 0), 0);
  const prefSaving = lines.reduce((s, l) => {
    const a = l.tariff?.amounts;
    return s + (a && a.dutyWithPreference !== null ? a.duty - a.dutyWithPreference : 0);
  }, 0);
  const caught = fixed?.tariff?.amounts?.duty ?? 0;
  const money = useMemo(() => {
    const es = entries ?? [];
    const pick = (dir: string) => es.filter((e) => e.finding?.direction === dir && Math.abs(e.finding.dutyDelta) > 0.5);
    const over = pick("over");
    const under = pick("under");
    const group = (list: Entry[]) => {
      const m = new Map<string, { label: string; from: string; to: string; n: number; sum: number }>();
      for (const e of list) {
        const k = `${e.declaredCode}>${e.finding!.suggestedCode}`;
        const g = m.get(k) ?? { label: e.text, from: e.declaredCode, to: e.finding!.suggestedCode, n: 0, sum: 0 };
        g.n += 1;
        g.sum += Math.abs(e.finding!.dutyDelta);
        m.set(k, g);
      }
      return [...m.values()];
    };
    const sum = (l: Entry[]) => l.reduce((s, e) => s + Math.abs(e.finding!.dutyDelta), 0);
    return { over: sum(over), under: sum(under), overGroups: group(over), underGroups: group(under), checked: es.filter((e) => e.finding).length };
  }, [entries]);

  // ---------------------------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">Product tour</span>
          <span className="text-sm text-muted-foreground">One real shipment, start to finish, on HMRC&apos;s live tariff · about 5 minutes</span>
        </div>
        <Link href={`/${broker}/home`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <X className="size-4" /> Exit tour
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-5 sm:px-6">
        <Timeline at={at} reached={reached} go={go} />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          {/* ------------------------------------------------------------- 1 · client */}
          {stage === "client" && (
            <>
              <StageHead n={1} title="Who is this shipment for?" sub="Pick the importer you're declaring for, or add a new one. Their EORI number goes on the declaration." />
              {clients && clients.length > 4 && (
                <ClientToolbar {...clientSort} shown={shownClients!.length} total={clients.length} />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {clients === null && <p className="text-sm text-muted-foreground">Loading your clients…</p>}
                {shownClients?.map((c) => {
                  const hint = !clientId && c.name === DEMO_CLIENT;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClientId(c.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border-2 bg-card p-5 text-left transition-all hover:border-primary/50",
                        clientId === c.id ? "border-primary shadow-[0_0_0_4px_rgba(19,48,107,0.1)]" : "border-border",
                        hint && "tour-pulse",
                      )}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-[20px] leading-snug">{c.name}</span>
                        <span className="block text-sm text-muted-foreground">EORI {c.eori ?? "not set"}</span>
                        {hint && <span className="mt-2 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">Pick this one for the demo</span>}
                      </span>
                      {clientId === c.id && <Check className="size-5 text-primary" />}
                    </button>
                  );
                })}
                {!adding ? (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Plus className="size-4" /> Add a new client
                  </button>
                ) : (
                  <div className="space-y-2.5 rounded-xl border-2 border-primary/40 bg-card p-5">
                    <Input placeholder="Company name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                    <Input placeholder="EORI, e.g. GB123456789000" value={newEori} onChange={(e) => setNewEori(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addClient} disabled={!newName.trim()}>
                        Add client
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button size="lg" disabled={!clientId} onClick={() => go(1)}>
                Continue with {client?.name ?? "a client"} <ArrowRight />
              </Button>
            </>
          )}

          {/* ------------------------------------------------------------- 2 · invoice */}
          {stage === "invoice" && (
            <>
              <StageHead n={2} title="Bring in the shipment" sub={`The supplier's commercial invoice for ${client?.name}: what's in the boxes, what it cost and where it was made.`} />
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <p className="border-b border-border/70 px-5 py-3 text-sm font-medium text-muted-foreground">Choose where the goods come from</p>
                <div className="grid divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <button
                    type="button"
                    onClick={loadDemo}
                    className={cn("relative flex flex-col gap-2 p-5 text-left transition-colors hover:bg-accent/40", source === "demo" && "bg-primary/[0.05]", !source && "tour-pulse")}
                  >
                    <FileText className="size-5 text-primary" />
                    <span className="font-medium">Demo invoice</span>
                    <span className="text-sm text-muted-foreground">Sunrise Homeware, Ningbo · 6 lines</span>
                    <span className="mt-1 w-fit rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">Use this for the tour</span>
                    {source === "demo" && <Check className="absolute right-4 top-4 size-5 text-primary" />}
                  </button>
                  <label className={cn("relative flex cursor-pointer flex-col gap-2 p-5 transition-colors hover:bg-accent/40", source === "file" && "bg-primary/[0.05]")}>
                    <FileSpreadsheet className="size-5 text-primary" />
                    <span className="font-medium">Upload Excel or CSV</span>
                    <span className="text-sm text-muted-foreground">Any supplier invoice. Columns are found automatically.</span>
                    <input type="file" accept=".xlsx,.csv" hidden onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], "file")} />
                    {source === "file" && <Check className="absolute right-4 top-4 size-5 text-primary" />}
                  </label>
                  <label className={cn("relative flex cursor-pointer flex-col gap-2 p-5 transition-colors hover:bg-accent/40", source === "shopify" && "bg-primary/[0.05]")}>
                    <ShoppingBag className="size-5 text-primary" />
                    <span className="font-medium">From Shopify</span>
                    <span className="text-sm text-muted-foreground">The client&apos;s product export. Codes write back to the store.</span>
                    <input type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], "shopify")} />
                    {source === "shopify" && <Check className="absolute right-4 top-4 size-5 text-primary" />}
                  </label>
                </div>
              </div>
              {fileError && <p className="rounded-md border border-bad/30 bg-bad/5 px-4 py-3 text-sm">{fileError}</p>}

              {inLines && (
                <div className="guide-bubble rounded-xl border border-border bg-[#fffdf8] p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-border pb-4">
                    <div>
                      <p className="font-serif text-[24px]">Commercial invoice</p>
                      <p className="text-sm text-muted-foreground">{isDemo ? "No. SH-2026-1044 · Sunrise Homeware Co., Ningbo" : fileName}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Buyer (importer)</p>
                      <p className="font-medium">{client?.name}</p>
                      <p className="text-muted-foreground">EORI {client?.eori ?? "not set"}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="mt-3 w-full min-w-[34rem] text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Description</th>
                          <th className="py-2 pr-3 text-right font-medium">Qty</th>
                          <th className="py-2 pr-3 font-medium">Made in</th>
                          <th className="py-2 text-right font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inLines.map((l, i) => (
                          <tr key={i} className="border-t border-border/60 align-top">
                            <td className="py-2 pr-3">
                              {l.description}
                              {isDemo && isBamboo(l.description) && <span className="block text-xs text-muted-foreground">Spec: {SPEC}</span>}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums">{l.qty ?? "—"}</td>
                            <td className="py-2 pr-3">{l.origin ? (COUNTRY[l.origin] ?? l.origin) : "—"}</td>
                            <td className="py-2 text-right tabular-nums">{l.value ? gbp(l.value, 0) : "—"}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-foreground/20 font-medium">
                          <td className="py-2" colSpan={3}>
                            Total customs value
                          </td>
                          <td className="py-2 text-right tabular-nums">{gbp(total, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" onClick={() => go(0)}>
                  Back
                </Button>
                <Button size="lg" disabled={!inLines} onClick={runCheck}>
                  Check {inLines?.length ?? ""} lines with HMRC <ArrowRight />
                </Button>
              </div>
            </>
          )}

          {/* ------------------------------------------------------------- 3 · check */}
          {stage === "check" && (
            <>
              <StageHead n={3} title="Checking every line with HMRC" sub="Each product goes to HMRC's Trade Tariff: candidate codes, the legal notes, then the live duty and VAT for where it was made." />
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <CustomsScene active={checking} code={lines.find((l) => l.sug)?.sug ? pretty(lines.find((l) => l.sug)!.sug!.code) : "···· ·· ·· ··"} className="h-40 border-b border-border/70" />
                <div className="grid gap-px bg-border/70 sm:grid-cols-3">
                  {[
                    ["Lines coded", `${lines.filter((l) => l.state === "done").length} of ${lines.length || inLines?.length || 0}`],
                    ["Calls to HMRC's tariff", String(hmrcCalls)],
                    ["Time", seconds ? `${seconds} s` : checking ? "running…" : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-card px-5 py-3">
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="font-serif text-[24px] tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card">
                <p className="flex items-center justify-between border-b border-border/70 px-5 py-3 text-sm font-medium">
                  <span>Live log</span>
                  {checking ? (
                    <span className="inline-flex items-center gap-1.5 text-info">
                      <Loader2 className="size-3.5 animate-spin" /> Working
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-good">
                      <Check className="size-3.5" /> Done
                    </span>
                  )}
                </p>
                <ol className="max-h-[26rem] space-y-0 overflow-y-auto px-5 py-3">
                  {log.map((e) => {
                    const l = lines.find((x) => x.id === e.lineId);
                    return (
                      <li key={e.key} className="log-line flex gap-3 border-b border-border/50 py-2.5 last:border-b-0">
                        <LogIcon kind={e.kind} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{l?.text}</p>
                          <p className="text-[14px] font-medium leading-snug">{e.title}</p>
                          {e.detail && <p className="line-clamp-2 text-[13px] text-muted-foreground">{e.detail}</p>}
                        </div>
                        {e.source && <span className="hidden shrink-0 self-start rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">{e.source}</span>}
                      </li>
                    );
                  })}
                  <div ref={logEnd} />
                </ol>
              </div>
              <Button size="lg" disabled={checking} onClick={() => go(3)}>
                Review the codes <ArrowRight />
              </Button>
            </>
          )}

          {/* ------------------------------------------------------------- 4 · review */}
          {stage === "review" && (
            <>
              <StageHead n={4} title="You check, approve or correct" sub="Every line shows its code, what HMRC calls it and the duty it means. Nothing goes on a declaration without your sign-off." />
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {lines.map((l) => {
                  const a = l.tariff?.amounts;
                  const status = l.sug?.status;
                  const target = fixTarget?.id === l.id && status === "pending";
                  return (
                    <div key={l.id} className={cn("border-b border-border/70 last:border-b-0", target && "bg-bad/[0.04]")}>
                      <div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_7.5rem_8.5rem] sm:items-center">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{l.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.qty ?? "—"} units · {COUNTRY[l.origin ?? ""] ?? l.origin ?? "origin unknown"} · {l.value ? gbp(l.value, 0) : "—"}
                          </p>
                          {target && <span className="mt-1.5 inline-block rounded-full bg-bad/10 px-2 py-0.5 text-xs font-medium text-bad">Check this one</span>}
                        </div>
                        <div className="min-w-0">
                          {l.sug && <Code code={l.sug.code} className="text-[15px]" />}
                          <p className="line-clamp-2 text-xs text-muted-foreground">{l.tariff?.pathParts.at(-1)}</p>
                        </div>
                        <div className="text-sm">
                          <p className="tabular-nums">{rate(l.tariff?.dutyRate)} duty</p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {a ? (a.dutyWithPreference !== null && a.dutyWithPreference < a.duty ? `${gbp(a.dutyWithPreference)} with preference` : gbp(a.duty)) : ""}
                          </p>
                        </div>
                        <div className="flex justify-start sm:justify-end">
                          {status === "approved" && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-good">
                              <Check className="size-4" /> Approved
                            </span>
                          )}
                          {status === "corrected" && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-good">
                              <Check className="size-4" /> Corrected
                            </span>
                          )}
                          {status === "pending" && (
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => approve([l.sug!.id])}>
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant={target ? "default" : "ghost"}
                                className={cn(target && "tour-pulse")}
                                onClick={() => {
                                  setOpenFix(openFix === l.id ? null : l.id);
                                  setQ("");
                                  setCands(null);
                                  setPick(null);
                                  setReason("");
                                }}
                              >
                                Correct
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {openFix === l.id && (
                        <div className="guide-bubble space-y-4 border-t border-border/70 bg-muted/40 px-5 py-5">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-border bg-card p-3.5 text-sm">
                              <p className="text-xs font-medium text-muted-foreground">HMRC&apos;s search ranked first</p>
                              <p className="mt-1"><Code code={l.sug!.code} /> · {rate(l.tariff?.dutyRate)} duty</p>
                              <p className="text-muted-foreground">{l.tariff?.pathParts.at(-1)}</p>
                            </div>
                            {isDemo && isBamboo(l.text) && (
                              <div className="rounded-lg border border-warn/40 bg-[#fdf3e3] p-3.5 text-sm">
                                <p className="text-xs font-medium text-warn">On the invoice</p>
                                <p className="mt-1">{SPEC}</p>
                                <p className="text-muted-foreground">Not bamboo, not paperboard: it&apos;s plastic.</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Search HMRC&apos;s tariff</p>
                            <div className="flex gap-2">
                              <Input placeholder="Describe what it really is" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchHmrc()} />
                              <Button variant="outline" onClick={searchHmrc} disabled={!q.trim()}>
                                <Search /> Search
                              </Button>
                            </div>
                            {cands && (
                              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                                {cands.length === 0 && <li className="px-3.5 py-2.5 text-sm text-muted-foreground">No matches. Try the material and what it&apos;s for.</li>}
                                {cands.map((c) => (
                                  <li key={c.code}>
                                    <button
                                      type="button"
                                      onClick={() => choose(c, l)}
                                      className={cn("flex w-full items-start gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-accent/40", pick?.code === c.code && "bg-primary/[0.06]")}
                                    >
                                      <span className={cn("mt-1 size-3.5 shrink-0 rounded-full border-2", pick?.code === c.code ? "border-primary bg-primary" : "border-border")} />
                                      <span className="min-w-0">
                                        <Code code={c.code} className="text-[13px]" />
                                        <span className="block text-muted-foreground">{c.description}</span>
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {pick?.tariff && (
                              <div className="rounded-lg border border-border bg-card p-3.5 text-sm">
                                <p>
                                  <Code code={pick.code} /> · <span className="font-medium">{rate(pick.tariff.dutyRate)} duty</span>
                                  {pick.tariff.amounts && <> · {gbp(pick.tariff.amounts.duty)} on this line</>}
                                </p>
                                {pick.tariff.flags.map((f) => (
                                  <p key={f} className="mt-1 flex items-start gap-1.5 text-warn">
                                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {f}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">Why (saved with the correction)</p>
                              {isDemo && isBamboo(l.text) && !reason && (
                                <button type="button" className="text-xs text-link hover:underline" onClick={() => setReason(REASON)}>
                                  Use the supplier&apos;s spec as the reason
                                </button>
                              )}
                            </div>
                            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="In your own words, so the next person (and HMRC) can follow it" />
                          </div>
                          <div className="flex gap-2">
                            <Button disabled={!pick || !reason.trim() || saving} onClick={() => saveFix(l)}>
                              {saving && <Loader2 className="animate-spin" />} Save correction
                            </Button>
                            <Button variant="ghost" onClick={() => setOpenFix(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {learn && <LearnPanel learn={learn} broker={broker} brokerName={brokerName} lineText={fixed?.text ?? ""} />}

              {fixed && fixed.tariff?.amounts && (
                <div className="guide-bubble flex items-start gap-3 rounded-xl border border-good/30 bg-good/[0.06] p-5">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-good" />
                  <p className="text-[15px] leading-relaxed">
                    <span className="font-semibold">Caught before it was declared.</span> The {fixed.text.toLowerCase()} would have gone in at 0% duty. The right
                    code charges {rate(fixed.tariff.dutyRate)}, so {gbp(caught)} would have been underpaid on this invoice alone, and HMRC can claim it back for
                    3 years with a penalty on top.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {unsigned.filter((l) => l.id !== fixTarget?.id).length > 0 && (
                  <Button size="lg" variant="outline" disabled={busy} onClick={() => approve(unsigned.filter((l) => l.id !== fixTarget?.id).map((l) => l.sug!.id))}>
                    <Check /> Approve the other {unsigned.filter((l) => l.id !== fixTarget?.id).length}
                  </Button>
                )}
                <Button size="lg" disabled={unsigned.length > 0} onClick={() => go(4)}>
                  Prepare the declaration <ArrowRight />
                </Button>
              </div>
            </>
          )}

          {/* ------------------------------------------------------------- 5 · file */}
          {stage === "file" && (
            <>
              <StageHead n={5} title="Ready to declare" sub="Signed codes drop into the import declaration. Send it to your declaration software, or to HMRC's Customs Declaration Service." />
              <div className="rounded-xl border border-border bg-[#fffdf8] p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-border pb-4">
                  <div>
                    <p className="font-serif text-[24px]">Import declaration · draft</p>
                    <p className="text-sm text-muted-foreground">H1 · free circulation · prepared by {brokerName}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Importer</p>
                    <p className="font-medium">{client?.name}</p>
                    <p className="text-muted-foreground">EORI {client?.eori ?? "not set"}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="mt-3 w-full min-w-[40rem] text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Item</th>
                        <th className="py-2 pr-3 font-medium">Goods</th>
                        <th className="py-2 pr-3 font-medium">DE 6/14 · 6/15</th>
                        <th className="py-2 pr-3 text-right font-medium">Value</th>
                        <th className="py-2 pr-3 text-right font-medium">Duty</th>
                        <th className="py-2 text-right font-medium">VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => {
                        const c = (l.sug?.code ?? "").replace(/\D/g, "");
                        const a = l.tariff?.amounts;
                        return (
                          <tr key={l.id} className="border-t border-border/60 align-top">
                            <td className="py-2 pr-3 tabular-nums">{i + 1}</td>
                            <td className="py-2 pr-3">{l.text}</td>
                            <td className="py-2 pr-3 font-mono text-[13px]">
                              {c.slice(0, 8)} · {c.slice(8)}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums">{l.value ? gbp(l.value, 0) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">
                              {a ? gbp(a.dutyWithPreference ?? a.duty) : "—"}
                              {a && a.dutyWithPreference !== null && a.dutyWithPreference < a.duty && <span className="block text-[11px] text-good">preference</span>}
                            </td>
                            <td className="py-2 text-right tabular-nums">{a?.vat != null ? gbp(a.vat) : "—"}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-foreground/20 font-medium">
                        <td className="py-2" colSpan={3}>
                          Total
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{gbp(total, 0)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{gbp(dutyTotal)}</td>
                        <td className="py-2 text-right tabular-nums">{gbp(vatTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {prefSaving > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Includes a {gbp(prefSaving)} saving from a trade preference. The importer needs proof of origin from the supplier to claim it.
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <a href={`/api/${broker}/export?batch=${batchId}`} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50">
                  <Download className="size-5 text-primary" />
                  <span className="font-medium">Declaration software</span>
                  <span className="text-sm text-muted-foreground">CSV for ASM, CargoWise or Descartes</span>
                </a>
                <a href={`/api/${broker}/export?batch=${batchId}&audit=1`} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50">
                  <ShieldCheck className="size-5 text-primary" />
                  <span className="font-medium">Evidence file</span>
                  <span className="text-sm text-muted-foreground">Every code&apos;s reason, source and sign-off</span>
                </a>
                <Link href={`/${broker}/integrations`} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50">
                  <Landmark className="size-5 text-primary" />
                  <span className="font-medium">HMRC CDS</span>
                  <span className="text-sm text-muted-foreground">Submit directly (sandbox)</span>
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" onClick={() => go(3)}>
                  Back
                </Button>
                <Button size="lg" onClick={() => go(5)}>
                  Now look back 3 years <ArrowRight />
                </Button>
              </div>
            </>
          )}

          {/* ------------------------------------------------------------- 6 · look back */}
          {stage === "lookback" && (
            <>
              <StageHead n={6} title="Was duty paid right in the past?" sub="Your signed codes and corrections are now checked against every import from the last 3 years, at the duty rate on each import date." />
              {!entries && !scan && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <p className="text-[15px] text-muted-foreground">{brokerName} has 40 past imports on file. HMRC repays overpaid duty for 3 years, so anything older is gone.</p>
                  <Button size="lg" className="tour-pulse mt-4" onClick={runLookback}>
                    <History /> Run the 3-year check
                  </Button>
                </div>
              )}
              {scan && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="size-4 animate-spin text-info" /> Re-checking past imports… {scan.done} of {scan.total} products
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(scan.done / Math.max(1, scan.total)) * 100}%` }} />
                  </div>
                </div>
              )}
              {entries && !scan && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Money label="Overpaid: claim it back" value={gbp(money.over)} tone="good" note={`${money.overGroups.reduce((s, g) => s + g.n, 0)} past imports · HMRC repayment claim`} />
                    <Money label="Underpaid: put it right" value={gbp(money.under)} tone="bad" note={`${money.underGroups.reduce((s, g) => s + g.n, 0)} past imports · voluntary disclosure`} />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {[...money.overGroups.map((g) => ({ ...g, dir: "over" as const })), ...money.underGroups.map((g) => ({ ...g, dir: "under" as const }))].map((g) => (
                      <div key={`${g.from}${g.to}`} className="grid gap-2 border-b border-border/70 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="font-medium">{g.label}{g.n > 1 ? ` and similar · ${g.n} imports` : ""}</p>
                          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            Declared <Code code={g.from} className="line-through opacity-60" /> <ArrowRight className="size-3.5" /> should be <Code code={g.to} />
                          </p>
                        </div>
                        <p className={cn("font-serif text-[22px] tabular-nums", g.dir === "over" ? "text-good" : "text-bad")}>
                          {g.dir === "over" ? "+" : "−"}
                          {gbp(g.sum)}
                        </p>
                      </div>
                    ))}
                    {money.overGroups.length + money.underGroups.length === 0 && <p className="px-5 py-6 text-muted-foreground">Every past import was declared at the right rate.</p>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="lg" asChild>
                      <Link href={`/${broker}/retro-scan`}>
                        <FileText /> Open the claim pack
                      </Link>
                    </Button>
                    <Button size="lg" onClick={() => go(6)}>
                      See the impact <ArrowRight />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ------------------------------------------------------------- 7 · impact */}
          {stage === "impact" && (
            <>
              <StageHead n={7} title="What one shipment just did" sub={`${client?.name}'s invoice, from arrival to a signed declaration, plus 3 years of money found.`} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Money label="Overpaid duty to reclaim" value={gbp(money.over)} tone="good" note="Money back to the importer from HMRC" />
                <Money label="Underpayment caught" value={gbp(money.under + caught)} tone="bad" note="Fixed before an HMRC audit found it" />
                <Money label="Saved with a trade preference" value={gbp(prefSaving)} tone="good" note="Found on this invoice, with proof of origin" />
                <Money label="Lines coded from HMRC's tariff" value={`${lines.length} in ${seconds ?? 0} s`} tone="ink" note={`${hmrcCalls} live calls to the UK Trade Tariff`} />
              </div>
              {learn && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/25 bg-primary/[0.04] p-5">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Cpu className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[20px]">Memory that compounds, through Mubit</p>
                    <p className="text-[15px] text-muted-foreground">
                      1 correction now covers {learn.unseen.filter((u) => u.shouldChange && u.brokers[broker]?.now?.code === fixed?.sug?.code).length || "every"} similar
                      product{learn.unseen.length === 1 ? "" : "s"} {brokerName} has never coded. Each correction also goes to {brokerName}&apos;s own Mubit task;
                      at {learn.trainAfter} examples Mubit can train a model that classifies the way this firm does.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/${broker}/mubit`}>What Mubit has seen</Link>
                  </Button>
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  { who: "For the broker", icon: Building2, points: ["Invoice to signed codes in minutes, not an afternoon", "Every correction is remembered for the next invoice", "An evidence trail that shows reasonable care"] },
                  { who: "For the importer", icon: CircleDollarSign, points: ["Overpaid duty found and claimed back", "No surprise demand from HMRC later", "Preferences used when the goods qualify"] },
                  { who: "For HMRC and customs", icon: Landmark, points: ["Codes taken from HMRC's own tariff", "Each line arrives with its reason and legal note", "Underpayments disclosed, not discovered"] },
                ].map(({ who, icon: Icon, points }) => (
                  <div key={who} className="rounded-xl border border-border bg-card p-5">
                    <p className="flex items-center gap-2 font-serif text-[20px]">
                      <Icon className="size-5 text-primary" /> {who}
                    </p>
                    <ul className="mt-3 space-y-2 text-[15px]">
                      {points.map((p) => (
                        <li key={p} className="flex gap-2">
                          <Check className="mt-1 size-4 shrink-0 text-good" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href={`/${broker}/home`}>
                    Open your desk <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/${broker}/classify?new=1`}>
                    <Upload /> Try your own invoice
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ------------------------------------------------------------- guide */}
        <div className="order-1 lg:order-2">
          {stage === "client" && (
            <Guide
              mood="hello"
              title="A broker files for many importers"
              what={<p>Every UK import is declared for an importer, identified by their EORI number. Precedent keeps each client&apos;s codes, corrections and reclaims separate.</p>}
              worth={<p>One desk for every client. No spreadsheets per customer.</p>}
              tip={<p>Pick <span className="font-medium">{DEMO_CLIENT}</span>, or add your own client to see the flow with your name on it.</p>}
            />
          )}
          {stage === "invoice" && (
            <Guide
              title="Goods arrive as an invoice"
              what={<p>Normally a broker retypes every line into HMRC&apos;s tariff website and searches by hand. Here the invoice comes straight in from Excel, CSV or the client&apos;s Shopify store.</p>}
              worth={<p>No retyping, no copy-paste errors, and every line keeps its value and country of origin for the duty maths.</p>}
              tip={!inLines ? <p>Choose the <span className="font-medium">Demo invoice</span>: six real products from Ningbo and Dhaka.</p> : <p>Looks right? Send it to HMRC&apos;s tariff.</p>}
            />
          )}
          {stage === "check" && (
            <Guide
              mood={checking ? "thinking" : "idle"}
              title="This is HMRC's own data, live"
              what={
                <>
                  <p>For each line Precedent calls the UK Trade Tariff, HMRC&apos;s official service: the classification search, the chapter notes (the law that rules a heading in or out), and today&apos;s duty, VAT and trade preferences for that country.</p>
                  {aiOffline && <p className="text-sm text-muted-foreground">The AI step is offline on this server, so you&apos;re seeing HMRC&apos;s top match for each line. That makes your review in the next step matter.</p>}
                </>
              }
              worth={<p>Minutes per line become seconds, and every answer has a source an officer would recognise.</p>}
              tip={checking ? <p>Watch the log fill in. Look for the T-shirts from Bangladesh.</p> : <p>Done. Let&apos;s check what came back.</p>}
            />
          )}
          {stage === "review" && (
            <Guide
              mood={fixed ? "learned" : isDemo ? "confused" : "idle"}
              title={fixed ? "That correction is now remembered" : "One of these is wrong, and it costs money"}
              what={
                fixed ? (
                  <p>Your correction and its reason are saved for {brokerName}. The next bamboo dinnerware line, on any invoice, gets coded this way automatically, and the 3-year check will use it too.</p>
                ) : isDemo ? (
                  <p>HMRC&apos;s search took the bamboo dinner set at face value. But the supplier&apos;s spec says bamboo fibre in melamine resin, and the legal notes treat that as plastic. Plastic tableware pays 6%, not 0%.</p>
                ) : (
                  <p>Open any line you&apos;re not sure about, search HMRC&apos;s tariff yourself, and save the right code with your reason.</p>
                )
              }
              worth={<p>Getting it wrong means HMRC can claim the missing duty back for 3 years, plus a penalty. Getting it right once means it stays right.</p>}
              tip={
                !isDemo ? undefined : fixed ? (
                  <p>Approve the other lines, then prepare the declaration.</p>
                ) : (
                  <p>
                    Click <span className="font-medium">Correct</span> on the bamboo set, search for <span className="font-medium">melamine tableware</span>, and pick the code for goods{" "}
                    <span className="font-medium">consigned from China</span> (3924 10 00 11). This one ships from Ningbo.
                  </p>
                )
              }
            />
          )}
          {stage === "file" && (
            <Guide
              title="You sign, then it's filed"
              what={<p>The 10-digit code splits into the declaration&apos;s data elements 6/14 and 6/15. Duty and VAT come from HMRC&apos;s live rates, including the preference for the Bangladesh T-shirts.</p>}
              worth={<p>Each line carries its evidence: HMRC&apos;s sources, the legal note and who signed it. If HMRC ever queries the entry, the answer is one download away.</p>}
              tip={<p>Download either file if you like, then look back 3 years.</p>}
            />
          )}
          {stage === "lookback" && (
            <Guide
              mood={scan ? "thinking" : entries ? "learned" : "idle"}
              title="Money already paid, found"
              what={<p>Precedent re-checks past imports using today&apos;s signed codes and your correction, at the duty rate on each import date. LED bulbs used to go in as light fittings at 4%; HMRC&apos;s tariff has them as LED lamps at 0%.</p>}
              worth={<p>Overpaid duty is repaid by HMRC if claimed within 3 years. Underpaid duty you disclose yourself is treated far better than duty HMRC finds in an audit.</p>}
              tip={!entries ? <p>Run the check.</p> : <p>The claim pack lists each import, its deadline and the evidence to file with HMRC.</p>}
            />
          )}
          {stage === "impact" && (
            <Guide
              mood="learned"
              title="One desk for the whole job"
              what={<p>Invoice in, codes checked against HMRC, a person signs, the declaration goes out, and the last 3 years pay for it. Every step on the same screen, with the same evidence.</p>}
              worth={<p>Less time per invoice, money back for clients, and no nasty letters from HMRC.</p>}
            >
              <div className="mt-4 flex flex-wrap gap-2">
                {["Shopify", "Excel and CSV", "UK Trade Tariff", "HMRC CDS", "Declaration software"].map((t) => (
                  <span key={t} className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs">{t}</span>
                ))}
              </div>
            </Guide>
          )}
        </div>
      </div>
    </div>
  );
}
