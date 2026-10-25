"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Barcode, BookOpen, Loader2, Scale, Search, Send, Sparkles } from "lucide-react";
import { Prue } from "@/components/prue";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// "Ask Prue": a right-side drawer. The page tip is her greeting, then a chat backed by /api/prue-chat,
// with each reply's tool calls shown as a "What Prue did" timeline above the answer.
export type ChatMsg = { role: "user" | "assistant"; text: string; error?: boolean; used?: string[] };

const STARTERS = ["What code for a silicone phone case?", "What does retro-scan do?", "Why was this line flagged?"];

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
  const Icon = label.startsWith("Searched precedents") ? Scale : label.startsWith("Searched") ? Search : label.startsWith("Read chapter") ? BookOpen : label.startsWith("Looked up") ? Barcode : Sparkles;
  return (
    <li className="relative flex gap-2.5 pb-2 last:pb-0">
      <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-primary">
        <Icon className="size-3.5" />
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
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;
    const next = [...messages.filter((m) => !m.error), { role: "user" as const, text }];
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setLoading(true);
    try {
      const res = await fetch("/api/prue-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ broker, section, messages: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; used?: string[] };
      setMessages((m) => [...m, data.reply ? { role: "assistant", text: data.reply, used: data.used } : { role: "assistant", text: data.error ?? "Sorry, something went wrong. Try again?", error: true }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "I can't reach the server right now. Check your connection and try again.", error: true }]);
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
        className="w-full gap-0 p-0 data-[side=right]:w-full sm:max-w-[460px] data-[side=right]:sm:max-w-[460px]"
      >
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
              <p key={i} className={cn(bubble, "max-w-[88%] self-end rounded-br-sm bg-primary text-primary-foreground")}>
                {m.text}
              </p>
            ) : (
              <div key={i} className="flex max-w-[92%] flex-col gap-2 self-start">
                {!!m.used?.length && (
                  <Timeline>
                    {m.used.map((u, j) => (
                      <Step key={j} text={u} />
                    ))}
                  </Timeline>
                )}
                <p className={cn(bubble, "rounded-bl-sm bg-muted/60 text-foreground/85", m.error && "border border-destructive/30 bg-destructive/5 text-destructive")}>{m.text}</p>
              </div>
            ),
          )}

          {loading && (
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
          className="flex items-end gap-2 border-t border-border p-3"
        >
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
            placeholder="Ask about codes, duty, the app…"
            aria-label="Message Prue"
            className="field-sizing-content max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" disabled={loading || !draft.trim()} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
            <Send className="size-4" />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
