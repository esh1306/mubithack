"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Code } from "@/components/code";
import { Empty, PageHeader } from "@/components/page";
import { DemoCoach } from "@/components/demo-coach";
import { demoSessionKey } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { readSse } from "@/lib/sse";
import { buildPack, LINKS, MIN_CLAIM, packCsv, type PackEntry } from "@/lib/claim-pack";

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

function toPackEntry(e: Entry): PackEntry {
  const f = e.finding!;
  const m = f.maths;
  const precedent = f.reason.match(/\(precedent #(\d+)\)/)?.[1];
  return {
    entryDate: e.entryDate,
    text: e.text,
    declaredCode: e.declaredCode,
    declaredRate: m?.declaredRate ?? null,
    correctCode: f.suggestedCode,
    correctRate: m?.suggestedRate ?? null,
    customsValue: e.customsValue,
    dutyPaid: e.dutyPaid,
    dutyDue: m?.shouldPay ?? null,
    difference: f.dutyDelta,
    basis: precedent ? `Your precedent #${precedent}` : "AI classification record; verify before filing",
  };
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function ClaimPack({ kind, entries, broker }: { kind: "over" | "under"; entries: Entry[]; broker: string }) {
  const pack = buildPack(entries.map(toPackEntry), kind);
  const over = kind === "over";
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">{over ? "Overpaid in total" : "Underpaid in total"}</dt>
          <dd className="font-serif text-2xl tabular-nums">{gbp(pack.total)}</dd>
        </div>
        {over && (
          <div>
            <dt className="text-xs text-muted-foreground">Claimable (over £{MIN_CLAIM} each)</dt>
            <dd className="font-serif text-2xl tabular-nums">{gbp(pack.claimable)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted-foreground">Entries</dt>
          <dd className="font-serif text-2xl tabular-nums">{pack.rows.length}</dd>
        </div>
        {pack.earliest && (
          <div>
            <dt className="text-xs text-muted-foreground">First deadline</dt>
            <dd className={cn("font-serif text-2xl tabular-nums", pack.earliest.daysLeft < 90 && "text-bad")}>{pack.earliest.deadline}</dd>
          </div>
        )}
      </dl>

      <section className="space-y-2">
        <h3 className="font-serif text-lg">How to file it</h3>
        {over ? (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>
              Sign in to HMRC&apos;s{" "}
              <a href={LINKS.claimService} target="_blank" rel="noreferrer" className="text-link hover:underline">
                Claim back import duty and VAT
              </a>{" "}
              service with the importer&apos;s Government Gateway (EORI holders). Use{" "}
              <a href={LINKS.c285} target="_blank" rel="noreferrer" className="text-link hover:underline">form C285</a> if the importer has no EORI.
            </li>
            <li>Make one claim per declaration (MRN). Add the MRN from your CDS records to each row below.</li>
            <li>
              Claim within 3 years of the debt being notified (
              <a href={LINKS.timeLimit} target="_blank" rel="noreferrer" className="text-link hover:underline">reg 59, S.I. 2018/1248</a>
              ). HMRC only repays claims over £{MIN_CLAIM}. VAT-registered importers recover overpaid import VAT on their VAT return instead.
            </li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>
              Tell HMRC by amending each cleared declaration (
              <a href={LINKS.amend} target="_blank" rel="noreferrer" className="text-link hover:underline">post-clearance amendment, form C2001</a>
              ). HMRC then issues a C18 demand for the difference.
            </li>
            <li>Disclosing before HMRC opens an enquiry is the strongest evidence of reasonable care when penalties are considered.</li>
          </ol>
        )}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Import date</th>
              <th className="py-2 pr-3 font-medium">Goods</th>
              <th className="py-2 pr-3 font-medium">Declared</th>
              <th className="py-2 pr-3 font-medium">Correct</th>
              <th className="py-2 pr-3 text-right font-medium">{over ? "Overpaid" : "Underpaid"}</th>
              <th className="py-2 text-right font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {pack.rows.map((r, i) => (
              <tr key={i} className="border-b border-border align-top last:border-b-0">
                <td className="py-2.5 pr-3 font-mono text-xs">{r.entryDate}</td>
                <td className="py-2.5 pr-3">
                  {r.text}
                  <span className="block text-xs text-muted-foreground">{r.basis}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <Code code={r.declaredCode} className="text-xs" />
                  <span className="block text-xs text-muted-foreground">{r.declaredRate ?? "rate unknown"}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <Code code={r.correctCode} className="text-xs" />
                  <span className="block text-xs text-muted-foreground">{r.correctRate ?? "rate unknown"}</span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {gbp(Math.abs(r.difference))}
                  {r.belowMinimum && <span className="block text-xs text-muted-foreground">under £{MIN_CLAIM}</span>}
                </td>
                <td className={cn("py-2.5 text-right tabular-nums", r.daysLeft < 90 && "text-bad")}>
                  {r.deadline}
                  <span className="block text-xs text-muted-foreground">{r.daysLeft} days left</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-2">
        <h3 className="font-serif text-lg">Evidence to attach</h3>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <li>The MRN and the original declaration</li>
          <li>The commercial invoice for each entry</li>
          <li>The classification record for the correct code</li>
          <li>The duty calculation (in the CSV)</li>
          <li>Written authority to act for the importer</li>
          {over && <li>The UK bank account for the repayment</li>}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button onClick={() => download(`${broker}-${over ? "repayment-claim" : "disclosure"}-${new Date().toISOString().slice(0, 10)}.csv`, packCsv(pack))}>
          <Download /> Download CSV
        </Button>
        <Button variant="outline" asChild>
          <a href={over ? LINKS.claimGuidance : LINKS.amend} target="_blank" rel="noreferrer">
            HMRC guidance <ExternalLink />
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">A draft for you to check and file. Precedent never submits anything to HMRC.</p>
      </div>
    </div>
  );
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
        title="Duty reclaim"
        info="retroScan"
        description={
          <>
            Re-checks every import from the last 3 years ({years || "no dates"}) against today&apos;s precedents and the duty rate in force on
            each import date. Overpaid duty can be reclaimed; underpaid duty should be disclosed.
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
        <div className="grid divide-y divide-border rounded-lg border border-border bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Overpaid duty you can reclaim</p>
            <p className="mt-1 font-serif text-[40px] leading-tight tabular-nums text-good">{gbp(sum(over))}</p>
            <p className="text-sm text-muted-foreground">{over.length} {over.length === 1 ? "entry" : "entries"} · CDS repayment claim</p>
            <Button size="sm" className="mt-4" disabled={!over.length} onClick={() => setPack("over")}>
              <FileText /> Prepare claim pack
            </Button>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Underpaid duty to disclose</p>
            <p className="mt-1 font-serif text-[40px] leading-tight tabular-nums text-bad">{gbp(sum(under))}</p>
            <p className="text-sm text-muted-foreground">{under.length} {under.length === 1 ? "entry" : "entries"} · post-clearance amendment</p>
            <Button size="sm" variant="outline" className="mt-4" disabled={!under.length} onClick={() => setPack("under")}>
              <FileText /> Prepare disclosure pack
            </Button>
          </div>
        </div>
      )}

      {scanned && assumed > 0 && (
        <p className="text-xs text-muted-foreground">
          {assumed} rows use today&apos;s third-country rate because the rate on the import date was not available. Those rows say so in the trail.
        </p>
      )}

      {list.length > 0 && <div className="overflow-hidden rounded-lg border border-border bg-card">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{pack === "over" ? "Repayment claim pack" : "Disclosure pack"}</DialogTitle>
            <DialogDescription>Everything needed to file by hand, ordered by deadline.</DialogDescription>
          </DialogHeader>
          {pack && <ClaimPack kind={pack} entries={pack === "over" ? over : under} broker={broker} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
