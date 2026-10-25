"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Plug, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeclarationPreview, type DeclarationSummary } from "@/components/declaration-preview";
import { cn } from "@/lib/utils";

type Status = { appReady: boolean; connected: boolean; eori: string | null };
type Result = { lrn: string; status: number; conversationId: string | null; body: string };

// HMRC's XML error, as one readable sentence.
export function hmrcErrorText(body: string) {
  const msg = (tag: string) => body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))?.map((m) => m.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/\{"[^"]*":(\w+)\}/g, "$1").trim());
  const detail = msg("message")?.slice(1).join(" ");
  return [msg("message")?.[0], detail].filter(Boolean).join(": ") || "HMRC rejected the declaration.";
}

// A failed route can answer with an empty body; turn that into a readable error.
export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : { error: `Server error ${res.status}` };
  } catch {
    return { error: `Server error ${res.status}: ${text.slice(0, 120)}` };
  }
}

function ResultNote({ r }: { r: Result }) {
  const ok = r.status === 202;
  return (
    <div className={cn("space-y-1 rounded-md border p-3 text-sm", ok ? "border-good/30 bg-good/5" : "border-bad/30 bg-bad/5")}>
      <p>
        <span className="font-mono">{r.lrn}</span> ·{" "}
        <span className={ok ? "text-good" : "text-destructive"}>HTTP {r.status}</span>
        {ok && " accepted for processing"}
        {r.conversationId && <> · conversation <span className="font-mono text-xs">{r.conversationId}</span></>}
      </p>
      <p className="text-muted-foreground">
        {ok ? "HMRC has the declaration. CDS checks it and sends the MRN or a query as a notification." : hmrcErrorText(r.body)}
      </p>
    </div>
  );
}

// One button that files a signed-off invoice to HMRC's CDS sandbox, through /api/[broker]/hmrc:
// preview the H1 declaration, confirm, submit, and show HMRC's answer. Without an HMRC sign-in it
// offers the CSV for declaration software and a way to connect. `inline` shows those two straight away.
// Give it key={batchId} where the invoice can change, so the draft and result start fresh.
export function DeclareButton({
  broker,
  batchId,
  label = "Declare",
  size = "default",
  inline = false,
}: {
  broker: string;
  batchId: string;
  label?: string;
  size?: "sm" | "default";
  inline?: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"preview" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decl, setDecl] = useState<{ summary: DeclarationSummary; xml: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/${broker}/hmrc`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => live && setStatus(s ?? { appReady: false, connected: false, eori: null }))
      .catch(() => live && setStatus({ appReady: false, connected: false, eori: null }));
    return () => {
      live = false;
    };
  }, [broker]);

  async function call(action: "preview" | "submit") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/${broker}/hmrc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, batchId }),
      });
      const data = await safeJson(res);
      if (data.xml && data.summary) setDecl({ summary: data.summary, xml: data.xml });
      if (!res.ok) throw new Error(data.error);
      if (action === "submit") setResult({ lrn: data.lrn, status: data.status, conversationId: data.conversationId, body: data.body ?? "" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function start() {
    setOpen(true);
    setResult(null);
    if (status?.connected) call("preview");
  }

  const csv = `/api/${broker}/export?batch=${batchId}`;
  const connect = `/${broker}/integrations`;

  if (inline && status && !status.connected) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size={size} asChild>
          <a href={csv}>
            <Download /> Download declaration CSV
          </a>
        </Button>
        <Button size={size} variant="outline" asChild>
          <Link href={connect}>
            <Plug /> Connect HMRC
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <Button size={size} onClick={start} disabled={!status}>
          <Send /> {label}
        </Button>
        {result && !open && (
          <p className={cn("text-xs", result.status === 202 ? "text-good" : "text-destructive")}>
            {result.status === 202 ? `Filed · ${result.lrn}` : `HMRC said ${result.status}`}
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Declare invoice #{batchId.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              {status?.connected
                ? `An H1 import declaration to HMRC's CDS sandbox, as ${status.eori}. Check it, then submit.`
                : "HMRC isn't connected, so this can't go to CDS from here. Download the CSV for your declaration software, or connect HMRC."}
            </DialogDescription>
          </DialogHeader>

          {status?.connected && busy === "preview" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Drafting the declaration…
            </p>
          )}
          {result && <ResultNote r={result} />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {decl && <DeclarationPreview summary={decl.summary} xml={decl.xml} />}

          <DialogFooter>
            {status?.connected ? (
              result?.status === 202 ? (
                <Button onClick={() => setOpen(false)}>Done</Button>
              ) : (
                <Button disabled={!decl || !!busy} onClick={() => call("submit")}>
                  {busy === "submit" ? <Loader2 className="animate-spin" /> : <Send />} Submit to HMRC sandbox
                </Button>
              )
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href={connect}>
                    <Plug /> Connect HMRC
                  </Link>
                </Button>
                <Button asChild>
                  <a href={csv}>
                    <Download /> Download declaration CSV
                  </a>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
