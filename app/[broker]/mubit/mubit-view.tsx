"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Code } from "@/components/code";
import { possessive } from "@/lib/utils";
import { PageHeader, Stat } from "@/components/page";

type Data = {
  broker: string;
  model: string;
  prompt: string;
  hasKey: boolean;
  trainAfter: number;
  examples: number;
  examplesTowardTrain: number;
  progress: number;
  classifications: number;
  calls: number;
  avgSteps: number;
  precedentFollowed: number;
  bySource: Record<string, { lines: number; calls: number }>;
  note: string;
  precedents: { id: number; lineText: string; newCode: string; variantCount: number; variantsMatched: number; requestIds: string[] }[];
  lastRequestId: string | null;
  recent: { text: string; code: string; at: string; source: string; requestIds: string[] }[];
};

export function MubitView({ broker }: { broker: string }) {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    fetch(`/api/${broker}/mubit`).then((r) => r.json()).then(setD);
  }, [broker]);

  if (!d) return <p className="text-sm text-muted-foreground">Loading what this broker has sent through Mubit…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Mubit"
        info="mubit"
        description={<>{possessive(d.broker)} classify task: every example this broker sent, counted locally. Mubit&apos;s console is the source of truth for training.</>}
        actions={
          <Button variant="outline" asChild>
            <a href="https://app.mubit.ai/console/" target="_blank" rel="noreferrer">
              Open Mubit console <ExternalLink />
            </a>
          </Button>
        }
      />

      <p className="rounded-md border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{d.note}</p>

      {!d.hasKey && (
        <p className="rounded-md border border-bad/30 bg-bad/5 px-4 py-3 text-sm">
          Mubit API key is missing. Set <span className="font-mono">MUBIT_API_KEY</span> in <span className="font-mono">.env.local</span> (from app.mubit.ai).
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Examples sent" value={d.examples} context="completed classify calls on this task" />
        <Stat label="Calls through Mubit" value={d.calls} context="each agent step is one call" />
        <Stat label="Steps per line" value={d.avgSteps.toFixed(1)} context="tool calls + answer" />
        <Stat label="Followed a precedent" value={d.precedentFollowed} />
      </div>

      <section className="space-y-3">
        <h2 className="desk-kicker">Progress toward first train</h2>
        <p className="text-sm text-muted-foreground">
          {d.examplesTowardTrain} of {d.trainAfter} examples sent. Mubit&apos;s default is to train after {d.trainAfter} kept examples.
          This app does not observe keep/train/test/live. We do not claim an adapter is live.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-foreground/10" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-primary"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - d.progress)}`}
              />
            </svg>
            <p className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display-face)] text-xl font-extrabold">
              {d.examplesTowardTrain}
            </p>
          </div>
          <Progress value={d.progress * 100} className="max-w-sm flex-1" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="desk-kicker">Why this is one task</h2>
        <p className="text-sm text-muted-foreground">
          Mubit groups calls with the same model, instructions, tools and output format. Only the broker&apos;s name changes in the
          instructions, so each broker is its own task. Changing the prompt, tools or model would start a new task.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">model · {d.model}</Badge>
          <Badge variant="outline">tools · search_precedents, search_tariff, get_commodity, ask_client</Badge>
          <Badge variant="outline">output · code, reason, confidence, precedentId</Badge>
          <Badge variant="outline">{d.hasKey ? "key present" : "no key"}</Badge>
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">{d.prompt}</pre>
      </section>

      <section className="space-y-3">
        <h2 className="desk-kicker">Examples sent per source</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {Object.entries(d.bySource).map(([k, v]) => (
            <Stat key={k} label={k} value={v.lines} context={`${v.calls} calls`} />
          ))}
        </div>
      </section>

      {d.precedents.some((p) => p.variantCount > 0) && (
        <section className="space-y-3">
          <h2 className="desk-kicker">Timeline · correction → variants → request ids</h2>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card">
            {d.precedents.filter((p) => p.variantCount > 0).map((p) => (
              <li key={p.id} className="space-y-1 px-4 py-3 text-sm">
                <p className="font-medium">#{p.id} · {p.lineText}</p>
                <p className="text-muted-foreground">
                  {p.variantCount} paraphrases prepared · {p.requestIds.length} request IDs · {p.variantsMatched} came back as{" "}
                  <Code code={p.newCode} className="text-xs" />
                </p>
                {p.requestIds.length > 0 && (
                  <p className="font-mono text-xs text-muted-foreground">{p.requestIds.slice(0, 6).join("  ")}{p.requestIds.length > 6 ? " …" : ""}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="desk-kicker">Latest examples</h2>
        {d.recent.length === 0 && (
          <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            No classify calls recorded yet for this broker. Play the 3-minute demo from Home to send the first examples.
          </p>
        )}
        <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card">
          {d.recent.map((r, i) => (
            <li key={i} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{r.text}</p>
                <p className="font-mono text-xs text-muted-foreground">{r.requestIds.join("  ") || "no request id recorded"}</p>
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
