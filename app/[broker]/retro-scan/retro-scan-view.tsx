"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Code } from "@/components/code";
import { Empty, PageHeader } from "@/components/page";
import { DemoCoach } from "@/components/demo-coach";
import { demoSessionKey } from "@/lib/demo";
import { readSse } from "@/lib/sse";

type Maths = {
  entryDate: string;
  customsValue: number;
  dutyPaid: number;
  declaredCode: string;
  declaredRate: string | null;
  suggestedCode: string;
  suggestedRate: string | null;
  shouldPay: number | null;
  delta: number;
  direction: string;
  rateAsOf: string;
  rateSource: "import-date" | "current";
  assumption: string | null;
};

type Entry = {
  id: number;
  entryDate: string;
  text: string;
  declaredCode: string;
  customsValue: number;
  dutyPaid: number;
  inWindow: boolean;
  finding: {
    suggestedCode: string;
    direction: "over" | "under" | "same" | "check";
    dutyDelta: number;
    reason: string;
    maths: Maths | null;
    trail: string | null;
  } | null;
};

function SourceBadge({ reason }: { reason: string }) {
  const id = reason.match(/\(precedent #(\d+)\)/)?.[1];
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
    .map((e) => {
      const trail = e.finding?.trail ?? `${e.entryDate}  ${e.text}. Declared ${e.declaredCode}, should be ${e.finding!.suggestedCode}.`;
      const src = e.finding!.reason.match(/\(precedent #(\d+)\)/) ? `precedent #${e.finding!.reason.match(/\(precedent #(\d+)\)/)![1]}` : "AI suggestion, verify before filing";
      return `- ${trail} Source: ${src}.`;
    })
    .join("\n");
  return kind === "over"
    ? `CLAIM FOR REPAYMENT OF IMPORT DUTY (CDS online repayment claim)\n\n${entries.length} entries, total overpaid ${gbp(total)}. Filtered to the last 3 years.\n\n${lines}\n\nEvidence: the receipt for each code (precedent, tariff notes, model run) is attached.`
    : `VOLUNTARY DISCLOSURE OF UNDERPAID DUTY (form C2001)\n\n${entries.length} entries, total underpaid ${gbp(total)}. Disclosed before any HMRC enquiry, to avoid a civil penalty.\n\n${lines}\n\nCause: these goods were declared under a code the broker has since corrected (see precedent).`;
}

export function RetroScanView({ broker }: { broker: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; skipped?: number } | null>(null);
  const [pack, setPack] = useState<"over" | "under" | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [guided, setGuided] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEntries(await (await fetch(`/api/${broker}/retro-scan`)).json());
  }, [broker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves
    load();
    try {
      setGuided(sessionStorage.getItem(demoSessionKey(broker)) === "1");
    } catch {}
  }, [load, broker]);

  async function scan() {
    setProgress({ done: 0, total: 1 });
    setScanError(null);
    try {
      const res = await fetch(`/api/${broker}/retro-scan`, { method: "POST" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      await readSse(res, (event, data) => {
        if (event === "progress") setProgress(data);
        if (event === "entries") setEntries(data);
        if (event === "fatal") setScanError(data.message);
      });
    } catch (e) {
      setScanError((e as Error).message || "The scan stopped. Try again — nothing is frozen.");
    } finally {
      setProgress(null);
      load();
    }
  }

  const list = entries ?? [];
  const scanned = list.some((e) => e.finding);
  const over = list.filter((e) => e.finding?.direction === "over" && Math.abs(e.finding.dutyDelta) > 0.5);
  const under = list.filter((e) => e.finding?.direction === "under" && Math.abs(e.finding.dutyDelta) > 0.5);
  const sum = (es: Entry[]) => es.reduce((s, e) => s + Math.abs(e.finding!.dutyDelta), 0);
  const inWindow = list.filter((e) => e.inWindow);
  const years = inWindow.length ? `${inWindow[0].entryDate.slice(0, 7)} to ${inWindow.at(-1)!.entryDate.slice(0, 7)}` : "";
  const assumed = list.filter((e) => e.finding?.maths?.rateSource === "current").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Retro-scan"
        info="retroScan"
        description={
          <>
            Demo history: {list.length} Harbourline entries. Scan uses only the last 3 years ({years || "no dates"}).
            Reclaim = overpaid (old rate higher). Disclose = underpaid (e.g. 0% → 6%). £0 code-only changes are not findings.
          </>
        }
        actions={
          <Button onClick={scan} disabled={!!progress || list.length === 0}>
            {progress ? <Loader2 className="animate-spin" /> : <History />} {scanned ? "Scan again" : "Scan past entries"}
          </Button>
        }
      />

      {guided && <DemoCoach step="retro" broker={broker} onSkip={() => setGuided(false)} />}
      {scanError && <p className="rounded-md border border-bad/30 bg-bad/5 px-4 py-3 text-sm">{scanError}</p>}
      {entries === null && !progress && <p className="text-sm text-muted-foreground">Loading past entries…</p>}
      {entries && list.length === 0 && !progress && (
        <Empty title="No past entries">
          Use <span className="font-medium">Reset demo</span> in the sidebar to restore Harbourline&apos;s seeded 3-year history, then scan.
        </Empty>
      )}

      {progress && (
        <div className="space-y-2">
          <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
          <p className="text-xs text-muted-foreground">
            {progress.done} of {progress.total} distinct products re-classified
            {progress.skipped ? ` · ${progress.skipped} older than 3 years skipped` : ""}
          </p>
        </div>
      )}

      {scanned && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card p-6 shadow-card">
            <p className="text-sm text-muted-foreground">Overpaid · reclaim</p>
            <p className="mt-2 font-serif text-[44px] leading-none tabular-nums">{gbp(sum(over))}</p>
            <p className="mt-2 text-sm text-muted-foreground">{over.length} entries · CDS repayment claim, last 3 years</p>
            <Button size="sm" variant="outline" className="mt-4" disabled={!over.length} onClick={() => setPack("over")}>
              <FileText /> Claim pack
            </Button>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-6 shadow-card">
            <p className="text-sm text-muted-foreground">Underpaid · disclose</p>
            <p className="mt-2 font-serif text-[44px] leading-none tabular-nums">{gbp(sum(under))}</p>
            <p className="mt-2 text-sm text-muted-foreground">{under.length} entries · voluntary disclosure avoids the penalty</p>
            <Button size="sm" variant="outline" className="mt-4" disabled={!under.length} onClick={() => setPack("under")}>
              <FileText /> Disclosure pack
            </Button>
          </div>
        </div>
      )}

      {scanned && assumed > 0 && (
        <p className="text-xs text-muted-foreground">
          {assumed} rows use today&apos;s third-country rate because the rate on the import date was not available. Those rows say so in the trail.
        </p>
      )}

      {list.length > 0 && <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
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
            {list.map((e) => {
              const f = e.finding;
              const money = f && (f.direction === "over" || f.direction === "under") && Math.abs(f.dutyDelta) > 0.5;
              const changed = f && f.suggestedCode !== e.declaredCode;
              return (
                <TableRow
                  key={e.id}
                  className={money ? "cursor-pointer bg-primary/[0.03]" : "cursor-pointer"}
                  onClick={() => setOpenId(e.id)}
                >
                  <TableCell className="tabular-nums text-muted-foreground">
                    {e.entryDate}
                    {!e.inWindow && <span className="block text-[10px]">outside 3 years</span>}
                  </TableCell>
                  <TableCell className="whitespace-normal font-medium">{e.text}</TableCell>
                  <TableCell><Code code={e.declaredCode} className="text-xs" /></TableCell>
                  <TableCell>
                    {!f ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : changed ? (
                      <div className="flex flex-col items-start gap-1">
                        <Code code={f.suggestedCode} className="text-xs text-primary" />
                        <SourceBadge reason={f.reason} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Same</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{gbp(e.dutyPaid)}</TableCell>
                  <TableCell className="text-right">
                    {f?.direction === "over" && money && <Badge variant="outline" className="border-good/30 text-good">Reclaim {gbp(-f.dutyDelta)}</Badge>}
                    {f?.direction === "under" && money && <Badge variant="outline" className="border-bad/30 text-bad">Disclose {gbp(f.dutyDelta)}</Badge>}
                    {f?.direction === "check" && <Badge variant="outline">Check rate</Badge>}
                    {f && !money && f.direction !== "check" && <span className="text-xs text-muted-foreground">£0 · not a finding</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>}

      <Dialog open={openId != null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Duty trail</DialogTitle>
            <DialogDescription>Import date, codes, rates, value and the arithmetic.</DialogDescription>
          </DialogHeader>
          {(() => {
            const e = list.find((x) => x.id === openId);
            const m = e?.finding?.maths;
            if (!e) return null;
            return (
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Import date</dt>
                <dd className="font-mono">{e.entryDate}{e.inWindow ? "" : " · outside 3-year window"}</dd>
                <dt className="text-muted-foreground">Declared</dt>
                <dd><Code code={e.declaredCode} className="text-xs" /> · {m?.declaredRate ?? "rate unknown"}</dd>
                <dt className="text-muted-foreground">Suggested</dt>
                <dd><Code code={e.finding?.suggestedCode ?? e.declaredCode} className="text-xs" /> · {m?.suggestedRate ?? "rate unknown"}</dd>
                <dt className="text-muted-foreground">Value</dt>
                <dd>{gbp(e.customsValue)}</dd>
                <dt className="text-muted-foreground">Duty paid</dt>
                <dd>{gbp(e.dutyPaid)}</dd>
                <dt className="text-muted-foreground">Should pay</dt>
                <dd>{m?.shouldPay == null ? "n/a (not a simple % rate)" : gbp(m.shouldPay)}</dd>
                <dt className="text-muted-foreground">Difference</dt>
                <dd>{m ? gbp(m.delta) : "—"} · {m?.direction === "over" ? "reclaim" : m?.direction === "under" ? "disclose" : m?.direction ?? "—"}</dd>
                <dt className="text-muted-foreground">Rate used</dt>
                <dd>{m?.rateSource === "import-date" ? `In force on ${m.rateAsOf}` : "Today's rate (import-date rate unavailable)"}</dd>
                {m?.assumption && (
                  <>
                    <dt className="text-muted-foreground">Assumption</dt>
                    <dd>{m.assumption}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Maths</dt>
                <dd className="font-mono text-xs leading-relaxed">{e.finding?.trail ?? "Not scanned yet."}</dd>
              </dl>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pack} onOpenChange={(o) => !o && setPack(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{pack === "over" ? "Repayment claim pack" : "Voluntary disclosure pack"}</DialogTitle>
            <DialogDescription>A draft for the broker to check and submit. Precedent never files anything. £0 rows are omitted.</DialogDescription>
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
