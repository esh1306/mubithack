"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Prue, type PrueState } from "@/components/prue";
import { cn } from "@/lib/utils";

type Tip = { state: PrueState; text: string; cta?: { label: string; href: string } };

// What Prue says on each page: one plain sentence about what to do here, and the next step.
function tipFor(section: string, broker: string): Tip {
  const at = (p: string) => `/${broker}/${p}`;
  switch (section) {
    case "classify":
      return { state: "idle", text: "Open a line to see my receipt: HMRC's sources, the legal note, the duty. Approve it, or correct me and I'll remember." };
    case "clients":
      return { state: "idle", text: "Each client is an importer. Click one to bring in their Shopify catalogue or start an invoice for them." };
    case "retro-scan":
      return { state: "thinking", text: "I can re-check 3 years of imports at the rate on each date. Overpaid duty becomes a claim pack for HMRC." };
    case "precedents":
      return { state: "learned", text: "Every correction you make, I apply to similar products, and teach to your firm's own Mubit model." };
    case "integrations":
    case "export":
    case "mubit":
      return { state: "idle", text: "Goods come in from Shopify or Excel, I check them against HMRC's tariff, and signed codes go out to your declaration." };
    default:
      return { state: "hello", text: "Hi, I'm Prue. I find the UK commodity code for every product and print a receipt for it.", cta: { label: "Show me one shipment", href: at("tour") } };
  }
}

// Prue, bottom-left, with a speech bubble. Hide her per page; she comes back when the page changes.
export function PrueGuide({ broker, section }: { broker: string; section: string }) {
  const [closed, setClosed] = useState<string | null>(null);
  const tip = tipFor(section, broker);
  const cta = tip.cta ?? { label: "Take the product tour", href: `/${broker}/tour` };
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

  return (
    <div className="mt-auto">
      {open && (
        <div key={section} className="guide-bubble relative mb-2 rounded-2xl border border-primary/20 bg-card p-3.5 pr-8 text-[13.5px] leading-snug shadow-[0_10px_28px_-16px_rgba(19,48,107,0.55)]">
          <button type="button" onClick={toggle} aria-label="Hide Prue's tip" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-3.5" />
          </button>
          <p className="text-foreground/85">{tip.text}</p>
          <Link href={cta.href} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            {cta.label} <ArrowRight className="size-3.5" />
          </Link>
          <span className="absolute -bottom-[7px] left-9 size-3.5 rotate-45 border-b border-r border-primary/20 bg-card" />
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        className={cn("flex items-end gap-2 rounded-lg px-1 text-left text-[12.5px] text-muted-foreground hover:text-foreground")}
        aria-label={open ? "Hide Prue's tip" : "Ask Prue"}
      >
        <Prue state={tip.state} size={76} />
        {!open && <span className="mb-3">Ask Prue</span>}
      </button>
    </div>
  );
}
