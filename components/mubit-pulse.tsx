"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

type Learning = { mubit: { status: "ok" | "rejected" | "missing"; examples: number; trainAfter: number }; precedents: unknown[] };

// The learning layer, always in view: corrections remembered, and examples on this firm's Mubit task
// toward its first training. Counts are what we sent; Mubit's console shows what it kept.
export function MubitPulse({ broker, active }: { broker: string; active?: boolean }) {
  const [d, setD] = useState<Learning | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/${broker}/learning`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j && setD(j))
        .catch(() => {});
    void load();
    const t = window.setInterval(load, 10000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [broker]);

  const n = d?.mubit.examples ?? 0;
  const of = d?.mubit.trainAfter ?? 25;
  const status = d?.mubit.status;
  const corrections = d?.precedents.length ?? 0;

  return (
    <Link
      href={`/${broker}/mubit`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-lg border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary/40 bg-primary/[0.06]" : "border-sidebar-border bg-card hover:bg-sidebar-accent",
      )}
    >
      <div className="flex items-center gap-2">
        <Brain className="size-4 text-primary" />
        <p className="flex-1 text-[13px] font-medium">Mubit learning</p>
        <p className="text-[13px] tabular-nums">
          <span className="font-semibold">{n}</span>
          <span className="text-muted-foreground">/{of}</span>
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width]", status === "ok" ? "bg-primary" : "bg-warn")} style={{ width: `${Math.max(3, Math.min(100, (n / of) * 100))}%` }} />
      </div>
      <p className={cn("mt-1.5 text-[11.5px]", status && status !== "ok" ? "text-warn" : "text-muted-foreground")}>
        {!d
          ? "Loading…"
          : status === "rejected"
            ? `Key rejected · ${corrections} correction${corrections === 1 ? "" : "s"} kept locally`
            : status === "missing"
              ? "No Mubit key · corrections kept locally"
              : `${corrections} correction${corrections === 1 ? "" : "s"} · first training at ${of}`}
      </p>
    </Link>
  );
}
