"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { cn } from "@/lib/utils";

type Hit = { code: string; path: string; dutyRate: string | null };

// Pick the right code from the tariff and say why. The reason becomes the precedent.
export function FixForm({
  currentCode,
  onSubmit,
  onCancel,
}: {
  currentCode: string;
  onSubmit: (code: string, reason: string) => void;
  onCancel?: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/tariff/search?q=${encodeURIComponent(q)}`);
      setHits(await res.json());
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const shown = q.trim().length < 2 ? [] : hits;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Correct code</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Search the tariff, e.g. 'plastics kitchenware' or 3924"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {shown.length > 0 && (
          <ul className="max-h-64 overflow-y-auto rounded-md border">
            {shown.map((h) => (
              <li key={h.code}>
                <button
                  type="button"
                  onClick={() => setPicked(h)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left last:border-0 hover:bg-muted",
                    picked?.code === h.code && "bg-primary/5",
                    h.code === currentCode && "opacity-50",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <Code code={h.code} className="text-sm" />
                    <span className="text-xs text-muted-foreground">{h.dutyRate ?? ""}</span>
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{h.path}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {picked && (
          <p className="text-xs text-muted-foreground">
            Selected <Code code={picked.code} />
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Why? This becomes the precedent the AI follows.</label>
        <Textarea
          rows={3}
          placeholder="e.g. This supplier's 'bamboo' tableware is bamboo fibre bound with melamine resin, so it's a plastic (ch. 39), not wood."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={!picked || !reason.trim() || picked.code === currentCode} onClick={() => onSubmit(picked!.code, reason.trim())}>
          Save fix and teach
        </Button>
      </div>
    </div>
  );
}
