"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { Prue, type PrueState } from "@/components/prue";
import { prueFor } from "@/lib/prue-tips";
import { cn } from "@/lib/utils";

// The sidebar and corner Prue. Pages that place her themselves (see lib/prue-tips) render their own,
// so there is never more than one on screen.
type Override = { state?: PrueState; text: string } | null;
let override: Override = null;
const listeners = new Set<() => void>();
const set = (o: Override) => {
  override = o;
  listeners.forEach((l) => l());
};

export function usePrueSays(text: string, state?: PrueState) {
  useEffect(() => {
    set({ text, state });
    return () => set(null);
  }, [text, state]);
}

function useOverride() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => override,
    () => null,
  );
}

export function PrueGuide({ broker, section: page }: { broker: string; section: string }) {
  const q = useSearchParams();
  const section = page !== "classify" ? page : q.get("new") === "1" ? "classify:new" : q.get("batch") || q.get("sample") ? "classify:invoice" : "classify";
  const said = useOverride();
  const [closed, setClosed] = useState<string | null>(null);
  const conf = prueFor(section);
  const state = said?.state ?? conf.pose;
  const text = said?.text ?? conf.say;
  const cta = section === "home" ? { label: "Show me one shipment", href: `/${broker}/tour` } : { label: "Take the product tour", href: `/${broker}/tour` };
  const open = closed !== section;

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- per-viewer "hide on this page" preference
      setClosed(sessionStorage.getItem(`prue:closed:${section}`) ? section : null);
    } catch {}
  }, [section]);

  const toggle = () => {
    const next = open ? section : null;
    setClosed(next);
    try {
      if (next) sessionStorage.setItem(`prue:closed:${section}`, "1");
      else sessionStorage.removeItem(`prue:closed:${section}`);
    } catch {}
  };

  if (conf.place !== "sidebar" && conf.place !== "corner") return null;
  const corner = conf.place === "corner";

  return (
    // sidebar: inside the rail's foot (15rem wide), the bubble may spill a little into the page.
    // corner: bottom-right of the page, clear of the navigation.
    <div
      className={cn(
        "pointer-events-none fixed bottom-3 z-40 hidden w-[17.5rem] flex-col md:flex",
        corner ? "right-4 items-end" : "left-3 items-start",
      )}
    >
      {open ? (
        <div
          key={text}
          className="guide-bubble pointer-events-auto relative mb-1 w-full rounded-2xl border border-primary/20 bg-card p-4 pr-8 text-[14px] leading-snug shadow-[0_14px_36px_-18px_rgba(19,48,107,0.6)]"
        >
          <button type="button" onClick={toggle} aria-label="Hide Prue's tip" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-3.5" />
          </button>
          <p className="text-[12px] font-semibold text-primary">Prue</p>
          <p className="mt-0.5 text-foreground/85">{text}</p>
          <Link href={cta.href} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            {cta.label} <ArrowRight className="size-3.5" />
          </Link>
          <span className={cn("absolute -bottom-[7px] size-3.5 rotate-45 border-b border-r border-primary/20 bg-card", corner ? "right-14" : "left-14")} />
        </div>
      ) : null}
      <div className={cn("pointer-events-auto flex items-end gap-2", corner && "flex-row-reverse")}>
        <button type="button" onClick={toggle} className="rounded-2xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring" aria-label={open ? "Hide Prue's tip" : "Ask Prue"}>
          <Prue state={state} size={104} />
        </button>
        {!open && (
          <button type="button" onClick={toggle} className="mb-4 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] text-muted-foreground shadow-sm hover:text-foreground">
            Ask Prue
          </button>
        )}
      </div>
    </div>
  );
}
