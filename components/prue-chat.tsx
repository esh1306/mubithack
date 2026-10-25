"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

// "Ask Prue": the page tip is her greeting, then a small chat backed by /api/prue-chat.
export type ChatMsg = { role: "user" | "assistant"; text: string; error?: boolean; used?: string[] };

export function PrueChat({
  broker,
  section,
  greeting,
  cta,
  messages,
  setMessages,
  loading,
  setLoading,
  onClose,
  className,
  style,
}: {
  broker: string;
  section: string;
  greeting: string;
  cta: { label: string; href: string };
  messages: ChatMsg[];
  setMessages: (fn: (m: ChatMsg[]) => ChatMsg[]) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [draft, setDraft] = useState("");
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
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

  return (
    <div
      style={style}
      className={cn(
        "guide-bubble pointer-events-auto flex w-[20rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card text-[14px] leading-snug shadow-[0_14px_36px_-18px_rgba(19,48,107,0.6)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-[12.5px] font-semibold text-primary">Ask Prue</p>
        <button type="button" onClick={onClose} aria-label="Close chat" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      <div ref={list} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        <div className="max-w-[90%] self-start rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2 text-foreground/85">
          {greeting}
          <Link href={cta.href} className="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            {cta.label} <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={cn("flex max-w-[90%] flex-col gap-1", m.role === "user" ? "self-end" : "self-start")}>
            {m.used?.map((u, j) => (
              <span key={j} className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                <Search className="size-3 shrink-0" /> {u}
              </span>
            ))}
            <p
              className={cn(
                "whitespace-pre-wrap rounded-2xl px-3 py-2",
                m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted/60 text-foreground/85",
                m.error && "border border-destructive/30 bg-destructive/5 text-destructive",
              )}
            >
              {m.text}
            </p>
          </div>
        ))}
        {loading && <p className="self-start rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2 text-muted-foreground">Prue is looking it up…</p>}
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about codes, duty, the app…"
          aria-label="Message Prue"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" disabled={loading || !draft.trim()} aria-label="Send" className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-40">
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
