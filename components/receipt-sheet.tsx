"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Code } from "@/components/code";
import { Button } from "@/components/ui/button";
import { FixForm } from "@/components/fix-form";
import { Info } from "@/components/info";
import { Check, PencilLine } from "lucide-react";

export type Suggestion = {
  id: number;
  code: string;
  reason: string;
  confidence: number;
  flagged: boolean;
  question: string | null;
  status: string;
  precedentId: number | null;
  mubitRequestId: string | null; // JSON array of mreq_ ids
  model: string;
  toolCalls: string; // JSON array of { tool, input, output }
};

type ToolCall = { tool: string; input: Record<string, unknown>; output: unknown };

const TOOL_LABEL: Record<string, string> = {
  search_precedents: "Searched precedents",
  search_tariff: "Searched the tariff",
  get_commodity: "Checked a code",
  ask_client: "Drafted a client question",
};

function summarise(c: ToolCall) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = c.output as any;
  if (c.tool === "search_precedents") {
    // Older receipts stored a bare array; newer ones { precedents, note }.
    const found: { id: number }[] = Array.isArray(out) ? out : out?.precedents ?? [];
    return found.length ? `${found.length} found: #${found.map((p) => p.id).join(", #")}` : "None found";
  }
  if (c.tool === "search_tariff") return Array.isArray(out) ? `${out.length} candidate codes` : "";
  if (c.tool === "get_commodity") return out?.error ?? out?.path?.split(" > ").slice(-2).join(" › ");
  if (c.tool === "ask_client") return "Recorded";
  return "";
}

export function ReceiptSheet({
  row,
  onClose,
  onFix,
  onApprove,
}: {
  row: { text: string; suggestion?: Suggestion } | null;
  onClose: () => void;
  onFix: (suggestion: Suggestion, code: string, reason: string) => void;
  onApprove: (suggestion: Suggestion) => void;
}) {
  const s = row?.suggestion;
  const code = s?.code;
  const [fixing, setFixing] = useState(false);
  const [tariff, setTariff] = useState<{ code: string; path: string; dutyRate: string | null } | null>(null);

  useEffect(() => {
    if (code) fetch(`/api/tariff/${code}`).then((r) => (r.ok ? r.json() : null)).then(setTariff);
  }, [code]);
  // Only show tariff details that belong to the code on screen.
  const info = tariff?.code === code ? tariff : null;

  const calls: ToolCall[] = s ? JSON.parse(s.toolCalls) : [];
  const mreqs: string[] = s?.mubitRequestId ? JSON.parse(s.mubitRequestId) : [];

  return (
    <Sheet
      open={!!s}
      onOpenChange={(o) => {
        if (!o) {
          setFixing(false);
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {s && (
          <>
            <SheetHeader>
              <SheetDescription className="flex items-center gap-1">
                Receipt <Info id="receipt" />
              </SheetDescription>
              <SheetTitle className="text-base leading-snug">{row!.text}</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-8">
              <div className="space-y-2">
                <Code code={s.code} className="text-2xl" />
                <p className="text-sm text-muted-foreground">{info?.path ?? "…"}</p>
                {s.status === "corrected" && <p className="text-sm">{s.reason}</p>}
                <dl className="grid grid-cols-3 gap-3 pt-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Duty (third country)</dt>
                    <dd className="font-medium">{info ? info.dutyRate ?? "n/a" : "…"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Confidence</dt>
                    <dd className="font-medium">{Math.round(s.confidence * 100)}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Model</dt>
                    <dd className="font-medium">{s.model}</dd>
                  </div>
                </dl>
                {!fixing && s.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => onApprove(s)}>
                      <Check /> Approve this code
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setFixing(true)}>
                      <PencilLine /> Fix this code
                    </Button>
                  </div>
                )}
                {!fixing && s.status === "approved" && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setFixing(true)}>
                    <PencilLine /> Fix this code
                  </Button>
                )}
              </div>

              {fixing && (
                <div className="rounded-lg border p-4">
                  <FixForm
                    currentCode={s.code}
                    toolCalls={s.toolCalls}
                    onCancel={() => setFixing(false)}
                    onSubmit={(newCode, reason) => {
                      setFixing(false);
                      onFix(s, newCode, reason);
                    }}
                  />
                </div>
              )}

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-medium">How the agent got there</h3>
                {calls.length === 0 && <p className="text-xs text-muted-foreground">Set by the broker, not the agent.</p>}
                <ol className="space-y-3">
                  {calls.map((c, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{TOOL_LABEL[c.tool] ?? c.tool}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {Object.values(c.input ?? {}).filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{summarise(c)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="flex items-center gap-1 text-sm font-medium">
                  Sent through Mubit <Info id="mubit" />
                </h3>
                <p className="text-xs text-muted-foreground">{mreqs.length} model calls, each recorded by Mubit for this broker&apos;s task.</p>
                <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                  {mreqs.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
