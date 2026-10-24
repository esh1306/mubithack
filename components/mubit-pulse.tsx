"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Pulse = {
  hasKey: boolean;
  examplesTowardTrain: number;
  trainAfter: number;
  lastRequestId: string | null;
};

export function MubitPulse({ broker }: { broker: string }) {
  const [d, setD] = useState<Pulse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/${broker}/mubit`)
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          setD({
            hasKey: !!j.hasKey,
            examplesTowardTrain: j.examplesTowardTrain ?? 0,
            trainAfter: j.trainAfter ?? 25,
            lastRequestId: j.lastRequestId ?? j.recent?.[0]?.requestIds?.[0] ?? null,
          });
        })
        .catch(() => {});
    void load();
    const t = window.setInterval(load, 8000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [broker]);

  const n = d?.examplesTowardTrain ?? 0;
  const of = d?.trainAfter ?? 25;
  const status = !d ? "…" : !d.hasKey ? "Offline / no key" : n > 0 ? "Recording" : "Ready";

  return (
    <Link
      href={`/${broker}/mubit`}
      className="block rounded-md border border-sidebar-border bg-card px-3 py-3 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium">Learning from your fixes</p>
        <p className="font-serif text-lg leading-none tabular-nums">
          {n}
          <span className="text-xs text-muted-foreground">/{of}</span>
        </p>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (n / of) * 100)}%` }} />
      </div>
      <p className={cn("mt-1.5 text-xs", !d?.hasKey ? "text-warn" : "text-muted-foreground")}>
        {status === "Offline / no key" ? "Mubit offline · no API key" : `Mubit ${status.toLowerCase()}`}
      </p>
    </Link>
  );
}
