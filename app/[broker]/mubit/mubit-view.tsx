"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code } from "@/components/code";
import { possessive } from "@/lib/utils";
import { PageHeader, Stat } from "@/components/page";

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

export function MubitView({ broker }: { broker: string }) {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    fetch(`/api/${broker}/mubit`).then((r) => r.json()).then(setD);
  }, [broker]);

  if (!d) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Mubit"
        info="mubit"
        description={<>{possessive(d.broker)} own task in Mubit: every call this broker sends, grouped so a small adapter can be trained on it.</>}
        actions={
          <Button variant="outline" asChild>
            <a href="https://app.mubit.ai/console/" target="_blank" rel="noreferrer">
              Open Mubit console <ExternalLink />
            </a>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Calls through Mubit" value={d.calls} context="each agent step is one call" />
        <Stat label="Lines classified" value={d.classifications} />
        <Stat label="Steps per line" value={d.avgSteps.toFixed(1)} context="tool calls + answer" />
        <Stat label="Followed a precedent" value={d.precedentFollowed} />
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-[22px]">Why this is one task</h2>
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
        <h2 className="font-serif text-[22px]">Where the calls came from</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(d.bySource).map(([k, v]) => (
            <Stat key={k} label={k} value={v.calls} context={`${v.lines} lines`} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-[22px]">Latest calls</h2>
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
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
