"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Barcode, BookOpen, Check, FileText, Loader2, Paperclip, Scale, Search, Send, Sparkles, X } from "lucide-react";
import { Code } from "@/components/code";
import { Prue } from "@/components/prue";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { readSse } from "@/lib/sse";
import { cn } from "@/lib/utils";

// "Ask Prue": a right-side drawer. The page tip is her greeting, then a chat backed by /api/prue-chat,
// with each reply's tool calls shown as a "What Prue did" timeline above the answer.
// A dropped invoice is parsed by /api/parse-invoice and coded by /api/[broker]/classify (a real batch on the desk);
// with a typed question, its lines go to the chat as context instead.
type FileLine = { description: string; qty?: number; value?: number; origin?: string };
type CodedRow = { lineId?: number; description: string; code?: string; confidence?: number; flagged?: boolean; status: "running" | "done" | "error" };
export type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  error?: boolean;
  used?: string[];
  id?: string;
  file?: string;
  lines?: FileLine[];
  rows?: CodedRow[];
  batch?: string;
};

const STARTERS = ["What code for a silicone phone case?", "What does retro-scan do?", "Why was this line flagged?"];
const ACCEPT = ".xlsx,.csv,.pdf,.txt,.png,.jpg,.jpeg,.webp";
const SUPPORTED = /\.(xlsx|csv|pdf|txt|png|jpe?g|webp)$/i;
// Keep the demo quick: code at most this many lines from a file.
const CAP = 25;

// What the model sees for each message: the attached lines, or the codes Prue gave, so follow-ups work.
function forModel(m: ChatMsg) {
  if (m.lines?.length) {
    const list = m.lines.slice(0, 60).map((l, i) => `${i + 1}. ${l.description}${l.origin ? ` (origin ${l.origin})` : ""}`);
    return `${m.text || "Here is a file."}\n\nAttached ${m.file} (${m.lines.length} lines):\n${list.join("\n")}`;
  }
  if (m.rows?.length) {
    const list = m.rows.map((r, i) => `${i + 1}. ${r.description}: ${r.code || "no code"}${r.flagged ? " (needs review)" : ""}`);
    return `${m.text}\n${list.join("\n")}`;
  }
  return m.text;
}

const PAGE: Record<string, string> = {
  home: "Home",
  classify: "Invoices",
  "classify:invoice": "Invoice review",
  "classify:new": "New invoice",
  clients: "Clients",
  "retro-scan": "Retro-scan",
  precedents: "Precedents",
  integrations: "Integrations",
  export: "Export",
  mubit: "Mubit learning",
};

// Route steps look like `Searched HMRC for "LED bulb" · top 8539520000, 10 candidates`.
function Step({ text }: { text: string }) {
  const [label, detail] = text.split(" · ");
  const Icon = label.startsWith("Searched precedents")
    ? Scale
    : label.startsWith("Searched")
      ? Search
      : label.startsWith("Read chapter")
        ? BookOpen
        : label.startsWith("Read ")
          ? FileText
          : label.startsWith("Looked up")
            ? Barcode
            : label.startsWith("Coding")
              ? Loader2
              : label.startsWith("Coded")
                ? Check
                : Sparkles;
  return (
    <li className="relative flex gap-2.5 pb-2 last:pb-0">
      <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-primary">
        <Icon className={cn("size-3.5", Icon === Loader2 && "animate-spin")} />
      </span>
      <span className="pt-0.5 text-[12.5px] leading-snug text-foreground/80">
        {label}
        {detail && <span className="block font-mono text-[11.5px] text-muted-foreground">{detail}</span>}
      </span>
    </li>
  );
}

function Timeline({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">What Prue did</p>
      {/* The thin line joining the step icons. */}
      <ol className="relative before:absolute before:bottom-3 before:left-3 before:top-3 before:w-px before:bg-border">{children}</ol>
    </div>
  );
}

// The codes for a dropped file, filled in line by line as the classify stream answers.
function CodesTable({ rows, href, onOpen }: { rows: CodedRow[]; href?: string; onOpen: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full table-fixed text-[12.5px]">
        <tbody className="divide-y divide-border/60">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="truncate py-1.5 pl-3 pr-2 text-foreground/85" title={r.description}>
                {r.description}
              </td>
              <td className="w-[7.5rem] whitespace-nowrap py-1.5 pr-2">{r.status === "done" ? <Code code={r.code ?? ""} className="text-[12px]" /> : null}</td>
              <td className="w-[4.75rem] whitespace-nowrap py-1.5 pr-3 text-right text-[11.5px]">
                {r.status === "running" ? (
                  <Loader2 className="ml-auto size-3.5 animate-spin text-muted-foreground" />
                ) : r.status === "error" || !r.code ? (
                  <span className="text-bad">failed</span>
                ) : r.flagged ? (
                  <span className="font-medium text-warn">needs you</span>
                ) : (
                  <span className="text-muted-foreground">{Math.round((r.confidence ?? 0) * 100)}%</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {href && (
        <Link href={href} onClick={onOpen} className="flex items-center gap-1 border-t border-border/70 px-3 py-2 text-[12.5px] font-medium text-primary hover:bg-primary/5">
          Open in Classify <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

export function PrueChat({
  open,
  onOpenChange,
  broker,
  firm,
  section,
  greeting,
  cta,
  messages,
  setMessages,
  loading,
  setLoading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  broker: string;
  firm: string;
  section: string;
  greeting: string;
  cta: { label: string; href: string };
  messages: ChatMsg[];
  setMessages: (fn: (m: ChatMsg[]) => ChatMsg[]) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [coding, setCoding] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const reply = (msg: Omit<ChatMsg, "role">) => setMessages((m) => [...m, { role: "assistant", ...msg }]);
  const patch = (id: string, fn: (m: ChatMsg) => ChatMsg) => setMessages((ms) => ms.map((m) => (m.id === id ? fn(m) : m)));

  const attach = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    input.current?.focus();
  };

  // A normal chat turn. `read` is the file step shown first when lines were attached.
  const ask = async (history: ChatMsg[], read?: string) => {
    const res = await fetch("/api/prue-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ broker, section, messages: history.filter((m) => !m.error).map((m) => ({ role: m.role, text: forModel(m) })) }),
    });
    const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; used?: string[] };
    if (data.reply) reply({ text: data.reply, used: [...(read ? [read] : []), ...(data.used ?? [])] });
    else reply({ text: data.error ?? "Sorry, something went wrong. Try again?", error: true });
  };

  // Code the file's lines through the same classify stream as the Classify page; this creates a batch.
  const code = async (lines: FileLine[], name: string) => {
    const id = crypto.randomUUID();
    const shown = lines.slice(0, CAP);
    const read = `Read ${lines.length} line${lines.length === 1 ? "" : "s"} from ${name}${lines.length > CAP ? ` · coding the first ${CAP}` : ""}`;
    const progress = (rows: CodedRow[]) => {
      const done = rows.filter((r) => r.status !== "running").length;
      const needs = rows.filter((r) => r.status !== "done" || r.flagged || !r.code).length;
      return done < rows.length ? `Coding ${done}/${rows.length}…` : `Coded ${rows.length}/${rows.length}${needs ? ` · ${needs} need${needs === 1 ? "s" : ""} you` : ""}`;
    };
    const update = (fn: (r: CodedRow) => CodedRow) =>
      patch(id, (m) => {
        const rows = (m.rows ?? []).map(fn);
        return { ...m, rows, used: [read, progress(rows)] };
      });
    const rows: CodedRow[] = shown.map((l) => ({ description: l.description, status: "running" }));
    reply({ id, text: "", used: [read, progress(rows)], rows });
    setCoding(true);
    let lost = false;
    try {
      const res = await fetch(`/api/${broker}/classify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: shown }) });
      if (!res.ok) throw new Error();
      await readSse(res, (event, data) => {
        if (event === "batch") {
          const saved = data.lines as { id: number; batchId: string }[];
          patch(id, (m) => ({ ...m, batch: saved[0]?.batchId, rows: (m.rows ?? []).map((r, i) => ({ ...r, lineId: saved[i]?.id })) }));
        }
        if (event === "result") update((r) => (r.lineId === data.lineId ? { ...r, status: "done", code: data.suggestion.code, confidence: data.suggestion.confidence, flagged: data.suggestion.flagged } : r));
        if (event === "error") update((r) => (r.lineId === data.lineId ? { ...r, status: "error" } : r));
      });
    } catch {
      lost = true;
    } finally {
      // Anything still spinning got no answer.
      update((r) => (r.status === "running" ? { ...r, status: "error" } : r));
      patch(id, (m) => {
        const ok = (m.rows ?? []).filter((r) => r.status === "done" && r.code && !r.flagged).length;
        const total = m.rows?.length ?? 0;
        const text = lost ? "I lost the connection while coding. Open Classify to see what finished." : ok === total ? `All ${total} coded.` : `${ok} of ${total} coded, ${total - ok} need you.`;
        return { ...m, text, error: lost };
      });
      setCoding(false);
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    const f = file;
    if ((!text && !f) || loading) return;
    const id = crypto.randomUUID();
    const mine: ChatMsg = { id, role: "user", text, file: f?.name };
    setMessages((m) => [...m, mine]);
    setDraft("");
    setFile(null);
    setLoading(true);
    try {
      if (!f) return await ask([...messages, mine]);
      if (!SUPPORTED.test(f.name)) return reply({ text: `I can't read ${f.name}. Try a PDF, Excel, CSV, image or text file.`, error: true });
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/parse-invoice", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { lines?: FileLine[]; error?: string };
      if (!res.ok) return reply({ text: data.error ?? `I couldn't read ${f.name}.`, error: true });
      const lines = data.lines ?? [];
      if (!lines.length) return reply({ text: `I couldn't find any product lines in ${f.name}.`, error: true });
      patch(id, (m) => ({ ...m, lines }));
      // A question with the file: answer it from the lines. Just the file: code it.
      if (text) await ask([...messages, { ...mine, lines }], `Read ${lines.length} line${lines.length === 1 ? "" : "s"} from ${f.name}`);
      else await code(lines, f.name);
    } catch {
      reply({ text: "I can't reach the server right now. Check your connection and try again.", error: true });
    } finally {
      setLoading(false);
    }
  };

  const bubble = "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          input.current?.focus();
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          attach(e.dataTransfer.files[0]);
        }}
        className="w-full gap-0 p-0 data-[side=right]:w-full sm:max-w-[460px] data-[side=right]:sm:max-w-[460px]"
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-2 z-50 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary/50 bg-background/90 text-center">
            <Paperclip className="size-6 text-primary" />
            <p className="font-medium text-primary">Drop an invoice to get its codes</p>
            <p className="text-[12.5px] text-muted-foreground">PDF, Excel, CSV, image or text</p>
          </div>
        )}
        <SheetHeader className="flex-row items-center gap-3 border-b border-border px-4 py-3 pr-12">
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
            <Prue state={loading ? "thinking" : "idle"} size={34} />
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-[15px] font-semibold text-primary">Ask Prue</SheetTitle>
            <SheetDescription className="truncate text-[12.5px]">
              {PAGE[section] ?? "Desk"} · {firm}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div ref={list} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <div className={cn(bubble, "max-w-[88%] self-start rounded-bl-sm bg-muted/60 text-foreground/85")}>
            {greeting}
            <Link href={cta.href} onClick={() => onOpenChange(false)} className="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
              {cta.label} <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {messages.length === 0 && (
            <div className="flex flex-col items-start gap-1.5 pt-1">
              <p className="text-[11.5px] text-muted-foreground">Try asking</p>
              <button
                type="button"
                onClick={() => picker.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1.5 text-left text-[13px] text-primary transition-colors hover:bg-primary/5"
              >
                <Paperclip className="size-3.5" /> Drop an invoice to get codes
              </button>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-primary/25 bg-card px-3 py-1.5 text-left text-[13px] text-primary transition-colors hover:bg-primary/5"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex max-w-[88%] flex-col items-end gap-1.5 self-end">
                {m.file && (
                  <span className="flex max-w-full items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-[12.5px] text-primary">
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">{m.file}</span>
                    {m.lines && <span className="shrink-0 text-muted-foreground">· {m.lines.length} lines</span>}
                  </span>
                )}
                {m.text && <p className={cn(bubble, "rounded-br-sm bg-primary text-primary-foreground")}>{m.text}</p>}
              </div>
            ) : (
              <div key={i} className="flex max-w-[92%] flex-col gap-2 self-start">
                {!!m.used?.length && (
                  <Timeline>
                    {m.used.map((u, j) => (
                      <Step key={j} text={u} />
                    ))}
                  </Timeline>
                )}
                {m.rows && <CodesTable rows={m.rows} href={m.batch && `/${broker}/classify?batch=${m.batch}`} onOpen={() => onOpenChange(false)} />}
                {m.text && <p className={cn(bubble, "rounded-bl-sm bg-muted/60 text-foreground/85", m.error && "border border-destructive/30 bg-destructive/5 text-destructive")}>{m.text}</p>}
              </div>
            ),
          )}

          {loading && !coding && (
            <div className="max-w-[92%] self-start">
              <Timeline>
                <li className="relative flex gap-2.5">
                  <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-primary">
                    <Loader2 className="size-3.5 animate-spin" />
                  </span>
                  <span className="pt-0.5 text-[12.5px] leading-snug text-foreground/80">
                    <span className="animate-pulse">Prue is working…</span>
                    <span className="block text-[11.5px] text-muted-foreground">Checking precedents and HMRC&apos;s tariff</span>
                  </span>
                </li>
              </Timeline>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex flex-col gap-2 border-t border-border p-3"
        >
          {file && (
            <span className="flex max-w-full items-center gap-1.5 self-start rounded-lg border border-primary/25 bg-primary/5 py-1 pl-2.5 pr-1 text-[12.5px] text-primary">
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="rounded p-0.5 hover:bg-primary/10">
                <X className="size-3.5" />
              </button>
            </span>
          )}
          <div className="flex items-end gap-2">
            <input ref={picker} type="file" accept={ACCEPT} hidden onChange={(e) => (attach(e.target.files?.[0]), (e.target.value = ""))} />
            <button
              type="button"
              onClick={() => picker.current?.click()}
              disabled={loading}
              aria-label="Attach an invoice"
              title="Attach an invoice or product list"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-input text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Paperclip className="size-4" />
            </button>
            <textarea
              ref={input}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter is a new line.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder={file ? "Ask about this file, or send to get its codes" : "Ask about codes, or drop an invoice…"}
              aria-label="Message Prue"
              className="field-sizing-content max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button type="submit" disabled={loading || (!draft.trim() && !file)} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
              <Send className="size-4" />
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
