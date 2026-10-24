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
      className="block rounded-md border-2 border-foreground/15 bg-card px-3 py-2.5 hover:border-primary/40"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Mubit learning</p>
      <p className="mt-1 font-[family-name:var(--font-display-face)] text-2xl font-extrabold leading-none">
        {n}
        <span className="text-sm text-foreground/50">/{of}</span>
      </p>
      <p className={cn("mt-1 text-[11px] font-semibold", !d?.hasKey ? "text-primary" : "text-foreground/60")}>{status}</p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-foreground/45">
        {d?.lastRequestId ?? (d?.hasKey ? "no request yet" : "sample / offline")}
      </p>
      <p className="mt-1 text-[10px] text-foreground/40">Adapter not claimed live</p>
    </Link>
  );
}
