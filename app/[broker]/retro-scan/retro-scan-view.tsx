"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Code } from "@/components/code";
import { Info } from "@/components/info";
import { readSse } from "@/lib/sse";

type Entry = {
  id: number;
  entryDate: string;
  text: string;
  declaredCode: string;
  customsValue: number;
  dutyPaid: number;
  finding: { suggestedCode: string; direction: "over" | "under" | "same" | "check"; dutyDelta: number; reason: string } | null;
};

// Which precedent (if any) backed the new code; findings without one are the AI's own view.
function SourceBadge({ reason }: { reason: string }) {
  const id = reason.match(/\(precedent #(\d+)\)$/)?.[1];
  return id ? (
    <Badge className="bg-primary/10 text-primary hover:bg-primary/10" title={reason}>Precedent #{id}</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground" title={reason}>AI only · check</Badge>
  );
}

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

function packText(kind: "over" | "under", entries: Entry[]) {
  const total = entries.reduce((s, e) => s + Math.abs(e.finding!.dutyDelta), 0);
  const lines = entries
    .map((e) => `- ${e.entryDate}  ${e.text}\n  Declared ${e.declaredCode}, should be ${e.finding!.suggestedCode}. Duty paid ${gbp(e.dutyPaid)}, ${kind === "over" ? "overpaid" : "underpaid"} by ${gbp(Math.abs(e.finding!.dutyDelta))}. Source: ${e.finding!.reason.match(/\(precedent #(\d+)\)$/) ? `precedent #${e.finding!.reason.match(/\(precedent #(\d+)\)$/)![1]}` : "AI suggestion, verify before filing"}.`)
    .join("\n");
  return kind === "over"
    ? `CLAIM FOR REPAYMENT OF IMPORT DUTY (CDS online repayment claim)\n\n${entries.length} entries, total overpaid ${gbp(total)}. All within the 3-year limit.\n\n${lines}\n\nEvidence: the receipt for each code (precedent, tariff notes, model run) is attached.`
    : `VOLUNTARY DISCLOSURE OF UNDERPAID DUTY (form C2001)\n\n${entries.length} entries, total underpaid ${gbp(total)}. Disclosed before any HMRC enquiry, to avoid a civil penalty.\n\n${lines}\n\nCause: these goods were declared under a code the broker has since corrected (see precedent).`;
}

export function RetroScanView({ broker }: { broker: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pack, setPack] = useState<"over" | "under" | null>(null);

  const load = useCallback(async () => {
    setEntries(await (await fetch(`/api/${broker}/retro-scan`)).json());
  }, [broker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves
    load();
  }, [load]);

  async function scan() {
    setProgress({ done: 0, total: 1 });
    try {
      const res = await fetch(`/api/${broker}/retro-scan`, { method: "POST" });
      await readSse(res, (event, data) => {
        if (event === "progress") setProgress(data);
        if (event === "entries") setEntries(data);
      });
    } finally {
      setProgress(null);
      load();
    }
  }

  const scanned = entries.some((e) => e.finding);
  const over = entries.filter((e) => e.finding?.direction === "over");
  const under = entries.filter((e) => e.finding?.direction === "under");
  const sum = (es: Entry[]) => es.reduce((s, e) => s + Math.abs(e.finding!.dutyDelta), 0);
  const years = entries.length ? `${entries[0].entryDate.slice(0, 7)} to ${entries.at(-1)!.entryDate.slice(0, 7)}` : "";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">Retro-scan <Info id="retroScan" /></h1>
          <p className="text-sm text-muted-foreground">
            Re-check {entries.length} past entries ({years}) with today&apos;s precedents. Find duty to reclaim, and duty to disclose before HMRC finds it.
          </p>
        </div>
        <Button onClick={scan} disabled={!!progress || entries.length === 0}>
          {progress ? <Loader2 className="animate-spin" /> : <History />} {scanned ? "Scan again" : "Scan past entries"}
        </Button>
      </header>

      {progress && (
        <div className="space-y-2">
          <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
          <p className="text-xs text-muted-foreground">
            {progress.done} of {progress.total} distinct products re-classified
          </p>
        </div>
      )}

      {scanned && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-5">
            <p className="text-sm text-muted-foreground">Overpaid · reclaim</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{gbp(sum(over))}</p>
            <p className="text-xs text-muted-foreground">{over.length} entries · CDS repayment claim, within 3 years</p>
            <Button size="sm" variant="outline" className="mt-4" disabled={!over.length} onClick={() => setPack("over")}>
              <FileText /> Claim pack
            </Button>
          </div>
          <div className="rounded-lg border p-5">
            <p className="text-sm text-muted-foreground">Underpaid · disclose</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{gbp(sum(under))}</p>
            <p className="text-xs text-muted-foreground">{under.length} entries · voluntary disclosure avoids the penalty</p>
            <Button size="sm" variant="outline" className="mt-4" disabled={!under.length} onClick={() => setPack("under")}>
              <FileText /> Disclosure pack
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="w-40">Declared</TableHead>
              <TableHead className="w-40">Should be</TableHead>
              <TableHead className="w-28 text-right">Duty paid</TableHead>
              <TableHead className="w-28 text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => {
              const f = e.finding;
              const changed = f && f.suggestedCode !== e.declaredCode;
              return (
                <TableRow key={e.id} className={f?.direction === "over" || f?.direction === "under" ? "bg-primary/[0.03]" : undefined}>
                  <TableCell className="tabular-nums text-muted-foreground">{e.entryDate}</TableCell>
                  <TableCell className="whitespace-normal font-medium">{e.text}</TableCell>
                  <TableCell><Code code={e.declaredCode} className="text-xs" /></TableCell>
                  <TableCell>
                    {!f ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : changed ? (
                      <div className="space-y-1">
                        <Code code={f.suggestedCode} className="text-xs text-primary" />
                        <SourceBadge reason={f.reason} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Same</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{gbp(e.dutyPaid)}</TableCell>
                  <TableCell className="text-right">
                    {f?.direction === "over" && <Badge variant="outline" className="border-emerald-600/30 text-emerald-700">Reclaim {gbp(-f.dutyDelta)}</Badge>}
                    {f?.direction === "under" && <Badge variant="outline" className="border-destructive/30 text-destructive">Owe {gbp(f.dutyDelta)}</Badge>}
                    {f?.direction === "check" && <Badge variant="outline">Check rate</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!pack} onOpenChange={(o) => !o && setPack(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{pack === "over" ? "Repayment claim pack" : "Voluntary disclosure pack"}</DialogTitle>
            <DialogDescription>A draft for the broker to check and submit. Precedent never files anything.</DialogDescription>
          </DialogHeader>
          {pack && (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs">
              {packText(pack, pack === "over" ? over : under)}
            </pre>
          )}
          {pack && (
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(packText(pack, pack === "over" ? over : under))}>
              Copy text
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
