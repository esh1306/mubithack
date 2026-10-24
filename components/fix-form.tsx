"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { Info } from "@/components/info";
import { cn } from "@/lib/utils";

type Hit = { code: string; path: string; dutyRate: string | null };

// Codes the agent looked at while classifying: the ones it checked first, then its search results.
function agentCandidates(toolCalls: string | undefined, currentCode: string): Hit[] {
  if (!toolCalls) return [];
  const calls: { tool: string; output: unknown }[] = JSON.parse(toolCalls);
  const checked: Hit[] = [];
  const searched: Hit[] = [];
  for (const c of calls) {
    if (c.tool === "get_commodity" && c.output && typeof c.output === "object" && "code" in c.output) checked.push(c.output as Hit);
    if (c.tool === "search_tariff" && Array.isArray(c.output)) searched.push(...(c.output as Hit[]));
  }
  const seen = new Set([currentCode]);
  return [...checked, ...searched].filter((h) => h.code && !seen.has(h.code) && seen.add(h.code)).slice(0, 8);
}

function HitList({ hits, picked, onPick }: { hits: Hit[]; picked: Hit | null; onPick: (h: Hit) => void }) {
  return (
    <ul className="divide-y rounded-md border">
      {hits.map((h) => (
        <li key={h.code}>
          <button
            type="button"
            onClick={() => onPick(h)}
            className={cn("flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted", picked?.code === h.code && "bg-primary/5")}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                {picked?.code === h.code && <Check className="size-3.5 text-primary" />}
                <Code code={h.code} className="text-sm" />
              </span>
              <span className="text-xs text-muted-foreground">{h.dutyRate ?? ""}</span>
            </span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{h.path}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Pick the right code and say why. The reason becomes the precedent.
export function FixForm({
  currentCode,
  toolCalls,
  onSubmit,
  onCancel,
}: {
  currentCode: string;
  toolCalls?: string;
  onSubmit: (code: string, reason: string) => void;
  onCancel?: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sameHeading, setSameHeading] = useState<Hit[]>([]);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [reason, setReason] = useState("");
  const candidates = useMemo(() => agentCandidates(toolCalls, currentCode), [toolCalls, currentCode]);

  useEffect(() => {
    fetch(`/api/tariff/search?q=${currentCode.slice(0, 4)}`)
      .then((r) => r.json())
      .then((hs: Hit[]) => setSameHeading(hs.filter((h) => h.code !== currentCode)));
  }, [currentCode]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/tariff/search?q=${encodeURIComponent(q)}`);
      setHits((await res.json()).filter((h: Hit) => h.code !== currentCode));
    }, 200);
    return () => clearTimeout(t);
  }, [q, currentCode]);

  const searching = q.trim().length >= 2;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          Correct code <Info id="code" />
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Search words ('plastic kitchenware') or a number (3924, 610510…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {searching ? (
            hits.length ? <HitList hits={hits} picked={picked} onPick={setPicked} /> : <p className="py-3 text-center text-xs text-muted-foreground">No codes match.</p>
          ) : (
            <>
              {candidates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">The agent also considered</p>
                  <HitList hits={candidates} picked={picked} onPick={setPicked} />
                </div>
              )}
              {sameHeading.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Other codes in heading <span className="font-mono font-semibold">{currentCode.slice(0, 4)}</span>
                  </p>
                  <HitList hits={sameHeading.slice(0, 8)} picked={picked} onPick={setPicked} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          Why? This becomes the precedent the AI follows. <Info id="fix" />
        </label>
        <Textarea
          rows={3}
          placeholder="e.g. This supplier's 'bamboo' tableware is bamboo fibre bound with melamine resin, so it's a plastic (ch. 39), not wood."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{picked ? <>Changing to <Code code={picked.code} /></> : "Pick a code above"}</p>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button disabled={!picked || !reason.trim()} onClick={() => onSubmit(picked!.code, reason.trim())}>
            Save fix and teach
          </Button>
        </div>
      </div>
    </div>
  );
}
