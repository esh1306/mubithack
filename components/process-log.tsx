"use client";

import { BookOpen, Check, CircleHelp, ExternalLink, Loader2, Scale, Search, TriangleAlert, History } from "lucide-react";
import { describeStep, type Step, type ToolCall } from "@/lib/steps";
import { cn } from "@/lib/utils";

const ICON: Record<Step["kind"], typeof Search> = {
  precedent: History,
  search: Search,
  notes: BookOpen,
  verify: Scale,
  ask: CircleHelp,
  fallback: TriangleAlert,
  other: Check,
};

const TONE: Record<Step["kind"], string> = {
  precedent: "bg-[#eef2fa] text-primary",
  search: "bg-[#eef2fa] text-primary",
  notes: "bg-[#eef2fa] text-primary",
  verify: "bg-[#e7f4ec] text-good",
  ask: "bg-[#fdf3e3] text-warn",
  fallback: "bg-[#fdf3e3] text-warn",
  other: "bg-muted text-muted-foreground",
};

// The evidence trail for one line: each step the classifier took, with the official source it used.
// `live` adds a "working" row at the end while the line is still being classified.
export function ProcessLog({ calls, live, compact }: { calls: ToolCall[]; live?: boolean; compact?: boolean }) {
  const steps = calls.map(describeStep);
  const shown = compact ? steps.slice(-2) : steps;

  if (shown.length === 0 && !live) return <p className="text-sm text-muted-foreground">No steps were recorded for this line.</p>;

  return (
    <ol className={cn("relative", compact ? "space-y-1.5" : "space-y-4")}>
      {shown.map((s, i) => {
        const Icon = ICON[s.kind];
        return (
          <li key={i} className="relative flex gap-3">
            {!compact && i < shown.length - 1 + (live ? 1 : 0) && (
              <span aria-hidden className="absolute left-[11px] top-7 bottom-[-1rem] w-px bg-border" />
            )}
            <span className={cn("relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full", TONE[s.kind])}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn("leading-snug", compact ? "text-[13px] text-muted-foreground" : "text-sm font-medium")}>{s.title}</p>
              {!compact && s.detail && <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>}
              {!compact && s.items && s.items.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
                  {s.items.map((it, j) => (
                    <li key={j} className="text-[13px] leading-snug">
                      {it.href ? (
                        <a href={it.href} target="_blank" rel="noreferrer" className="text-link underline-offset-2 hover:underline">
                          {it.label}
                        </a>
                      ) : (
                        <span className="text-foreground">{it.label}</span>
                      )}
                      {it.note && <span className="mt-0.5 block text-muted-foreground line-clamp-3">{it.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {!compact && s.source && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Source:{" "}
                  {s.source.href ? (
                    <a href={s.source.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-link hover:underline">
                      {s.source.label} <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    s.source.label
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
      {live && (
        <li className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          </span>
          <p className={cn("pt-0.5 text-muted-foreground", compact ? "text-[13px]" : "text-sm")}>
            {steps.length === 0 ? "Starting: checking your precedents and the UK tariff…" : "Working on the next step…"}
          </p>
        </li>
      )}
    </ol>
  );
}
