"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code } from "@/components/code";
import { Info } from "@/components/info";

type Data = {
  broker: string;
  model: string;
  prompt: string;
  classifications: number;
  calls: number;
  avgSteps: number;
  precedentFollowed: number;
  bySource: Record<string, { lines: number; calls: number }>;
  recent: { text: string; code: string; at: string; source: string; requestIds: string[] }[];
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MubitView({ broker }: { broker: string }) {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    fetch(`/api/${broker}/mubit`).then((r) => r.json()).then(setD);
  }, [broker]);

  if (!d) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
            Mubit <Info id="mubit" />
          </h1>
          <p className="text-sm text-muted-foreground">
            {d.broker}&apos;s own task in Mubit: every call this broker sends, grouped so a small adapter can be trained on it.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="https://app.mubit.ai/console/" target="_blank" rel="noreferrer">
            Open Mubit console <ExternalLink />
          </a>
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Calls through Mubit" value={d.calls} hint="each agent step is one call" />
        <Stat label="Lines classified" value={d.classifications} />
        <Stat label="Steps per line" value={d.avgSteps.toFixed(1)} hint="tool calls + answer" />
        <Stat label="Followed a precedent" value={d.precedentFollowed} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Why this is one task</h2>
        <p className="text-sm text-muted-foreground">
          Mubit groups calls with the same model, instructions, tools and output format. Only the broker&apos;s name changes in the
          instructions, so each broker trains its own adapter. Changing the prompt, tools or model would start a new task.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">model · {d.model}</Badge>
          <Badge variant="outline">tools · search_precedents, search_tariff, get_commodity, ask_client</Badge>
          <Badge variant="outline">output · code, reason, confidence, precedentId</Badge>
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">{d.prompt}</pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Where the calls came from</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(d.bySource).map(([k, v]) => (
            <Stat key={k} label={k} value={v.calls} hint={`${v.lines} lines`} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Latest calls</h2>
        <ul className="divide-y rounded-lg border">
          {d.recent.map((r, i) => (
            <li key={i} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{r.text}</p>
                <p className="font-mono text-xs text-muted-foreground">{r.requestIds.join("  ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{r.source}</Badge>
                <Code code={r.code} className="text-xs" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
