"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, Sparkles, Flag, Check, Loader2, MessageCircleQuestion, RotateCw, PencilLine, GraduationCap, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Code } from "@/components/code";
import { Info } from "@/components/info";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FixForm } from "@/components/fix-form";
import { ReceiptSheet, type Suggestion } from "@/components/receipt-sheet";
import { LearningPanel, RAIL_TEMPLATE, type NeverSeenItem, type RailStep } from "@/components/learning-panel";
import { parseCsv } from "@/lib/csv";
import { readSse } from "@/lib/sse";

type InLine = { description: string; qty?: number; value?: number; origin?: string };
type Row = { id: number; text: string; status: "running" | "done" | "error"; suggestion?: Suggestion; error?: string };
type Broker = { id: string; name: string };
type Sample = { id: string; name: string; supplier: string; about: string };

const railKey = (broker: string) => `precedent:rail:${broker}`;

export function ClassifyView({ broker, brokers }: { broker: string; brokers: Broker[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [paste, setPaste] = useState("");
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [inlineFix, setInlineFix] = useState<Row | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [rail, setRail] = useState<RailStep[] | null>(null);
  const [items, setItems] = useState<NeverSeenItem[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);

  // Saved state: the latest invoice from the database, and the last rail from this browser.
  const loadBatch = useCallback(async () => {
    const res = await fetch(`/api/${broker}/batch`);
    const data = await res.json();
    setBatchId(data.batchId);
    setRows(data.rows);
    setLoaded(true);
  }, [broker]);

  useEffect(() => {
    // State is set after the fetch resolves, not synchronously; the lint rule can't see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBatch().then(() => {
      try {
        const saved = localStorage.getItem(railKey(broker));
        setRail(saved ? JSON.parse(saved) : null);
      } catch {}
    });
    fetch("/api/never-seen").then((r) => r.json()).then(setItems);
    fetch("/api/sample").then((r) => r.json()).then(setSamples);
  }, [broker, loadBatch]);

  async function loadSample(id: string) {
    classify(await (await fetch(`/api/sample?id=${id}`)).json());
  }

  // Lines still being classified server-side (e.g. after switching pages): poll until they land.
  const pending = !busy && rows.some((r) => r.status === "running");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(loadBatch, 3000);
    return () => clearInterval(t);
  }, [pending, loadBatch]);

  useEffect(() => {
    if (!rail) return;
    try {
      localStorage.setItem(railKey(broker), JSON.stringify(rail));
    } catch {}
  }, [rail, broker]);

  // Make sure every never-seen item has a "before" result, so the panel can show the flip.
  async function prepareBaseline() {
    const current: NeverSeenItem[] = await (await fetch("/api/never-seen")).json();
    setItems(current);
    if (current.every((i) => brokers.every((b) => i.brokers[b.id]?.before))) return;
    setPreparing(true);
    try {
      setItems(await (await fetch("/api/never-seen", { method: "POST" })).json());
    } finally {
      setPreparing(false);
    }
  }

  function openPanel() {
    setPanelOpen(true);
    prepareBaseline();
  }

  const updateRow = (lineId: number, suggestion: Suggestion) =>
    setRows((rs) => rs.map((r) => (r.id === lineId ? { ...r, status: "done", suggestion, error: undefined } : r)));

  // New lines replace the table; lineIds re-runs those rows in place.
  async function run(body: { lines: InLine[] } | { lineIds: number[] }) {
    setBusy(true);
    setShowInput(false);
    if ("lines" in body) setRows([]);
    else setRows((rs) => rs.map((r) => (body.lineIds.includes(r.id) ? { ...r, status: "running", error: undefined } : r)));
    try {
      const res = await fetch(`/api/${broker}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      await readSse(res, (event, data) => {
        if (event === "batch" && "lines" in body) {
          setBatchId(data.lines[0]?.batchId ?? null);
          setRows(data.lines.map((l: { id: number; text: string }) => ({ id: l.id, text: l.text, status: "running" })));
        }
        if (event === "result") updateRow(data.lineId, data.suggestion);
        if (event === "error")
          setRows((rs) => rs.map((r) => (r.id === data.lineId ? { ...r, status: "error", error: data.message } : r)));
      });
    } catch (e) {
      const message = (e as Error).message || "Connection lost";
      setRows((rs) => rs.map((r) => (r.status === "running" ? { ...r, status: "error", error: message } : r)));
    } finally {
      setRows((rs) => rs.map((r) => (r.status === "running" ? { ...r, status: "error", error: "No answer came back" } : r)));
      setBusy(false);
    }
  }

  function classify(lines: InLine[]) {
    if (lines.length > 0) run({ lines });
  }

  async function upload(file: File) {
    const parsed = parseCsv(await file.text());
    classify(
      parsed.map((r) => ({
        description: r.description ?? Object.values(r)[0],
        qty: r.qty ? Number(r.qty) : undefined,
        value: r.value_gbp ? Number(r.value_gbp) : undefined,
        origin: r.origin,
      })),
    );
  }

  async function approve(ids: number[]) {
    await Promise.all(
      ids.map((id) => fetch(`/api/suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) })),
    );
    setRows((rs) =>
      rs.map((r) => (r.suggestion && ids.includes(r.suggestion.id) ? { ...r, suggestion: { ...r.suggestion, status: "approved" } } : r)),
    );
  }

  async function fix(suggestion: Suggestion, code: string, reason: string) {
    setReceipt(null);
    setInlineFix(null);
    setPanelOpen(true);
    setFixing(true);
    setRail(RAIL_TEMPLATE.map((s) => ({ ...s })));
    try {
      const res = await fetch(`/api/${broker}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.id, code, reason }),
      });
      await readSse(res, (event, data) => {
        if (event === "step")
          setRail((r) => (r ?? RAIL_TEMPLATE).map((s) => (s.id === data.id ? { ...s, state: data.state, detail: data.detail } : s)));
        if (event === "line") updateRow(data.lineId, data.suggestion);
        if (event === "never-seen") setItems(data);
      });
    } finally {
      setFixing(false);
      setItems(await (await fetch("/api/never-seen")).json());
    }
  }

  const done = rows.filter((r) => r.status === "done");
  const unflaggedPending = done.filter((r) => !r.suggestion!.flagged && r.suggestion!.status === "pending");
  const flaggedCount = done.filter((r) => r.suggestion!.flagged && r.suggestion!.status === "pending").length;
  const failed = rows.filter((r) => r.status === "error");
  const allPending = done.filter((r) => r.suggestion!.status === "pending");
  const inputOpen = showInput || (loaded && rows.length === 0);

  return (
    <div className={panelOpen ? "lg:pr-[34rem]" : undefined}>
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
              Classify <Info id="classify" />
            </h1>
            <p className="text-sm text-muted-foreground">Drop in an invoice. Every line gets a code, a reason and a receipt.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openPanel}>
              <GraduationCap /> Learning
            </Button>
            {!inputOpen && (
              <Button variant="outline" onClick={() => setShowInput(true)} disabled={busy}>
                <Plus /> New invoice
              </Button>
            )}
            <div className="flex">
              <Button className="rounded-r-none" onClick={() => loadSample(samples[0]?.id ?? "01-ningbo-homeware")} disabled={busy}>
                <Sparkles /> Load sample invoice
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={busy}>
                  <Button className="rounded-l-none border-l border-primary-foreground/20 px-2" aria-label="Choose a sample invoice">
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Sample invoices · 10 lines each</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {samples.map((sm) => (
                    <DropdownMenuItem key={sm.id} onSelect={() => loadSample(sm.id)} className="flex-col items-start gap-0.5">
                      <span className="font-medium">{sm.name}</span>
                      <span className="text-xs text-muted-foreground">{sm.supplier}</span>
                      <span className="text-xs text-muted-foreground">{sm.about}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {inputOpen && (
          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">Upload CSV</TabsTrigger>
              <TabsTrigger value="paste">Paste lines</TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <label
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground hover:bg-muted/40"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) upload(f);
                }}
              >
                <FileUp className="size-5" />
                <span>Drop a CSV here, or click to choose one</span>
                <span className="text-xs">Columns: description, qty, value_gbp, origin</span>
                <input type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </TabsContent>
            <TabsContent value="paste" className="space-y-3">
              <Textarea
                rows={5}
                placeholder={"One product per line, e.g.\nBamboo kids' dinner set, plate bowl cup"}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={busy || !paste.trim()}
                onClick={() => classify(paste.split("\n").map((l) => l.trim()).filter(Boolean).map((description) => ({ description })))}
              >
                Classify lines
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {rows.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {done.length} of {rows.length} classified
                {flaggedCount > 0 && <> · <span className="text-foreground">{flaggedCount} need review</span></>}
                {batchId && <span className="ml-2 font-mono text-xs">#{batchId.slice(0, 8)}</span>}
              </p>
              <div className="flex gap-2">
                {failed.length > 0 && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ lineIds: failed.map((r) => r.id) })}>
                    <RotateCw /> Retry {failed.length} failed
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={unflaggedPending.length === 0}
                  onClick={() => approve(unflaggedPending.map((r) => r.suggestion!.id))}
                >
                  <Check /> Approve {unflaggedPending.length} unflagged
                </Button>
                {flaggedCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => approve(allPending.map((r) => r.suggestion!.id))}>
                    Approve all {allPending.length}
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Product line</TableHead>
                    <TableHead className="w-44">
                      <span className="flex items-center gap-1">Code <Info id="code" /></span>
                    </TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-24 text-right">
                      <span className="flex items-center justify-end gap-1">Confidence <Info id="confidence" /></span>
                    </TableHead>
                    <TableHead className="w-44 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className={r.suggestion ? "cursor-pointer" : undefined} onClick={() => r.suggestion && setReceipt(r)}>
                      <TableCell className="font-medium whitespace-normal">{r.text}</TableCell>
                      {r.status === "running" && (
                        <TableCell colSpan={4} className="text-muted-foreground">
                          <Loader2 className="mr-2 inline size-4 animate-spin" /> Checking precedents and the tariff…
                        </TableCell>
                      )}
                      {r.status === "error" && (
                        <TableCell colSpan={4}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm text-destructive">Couldn&apos;t classify: {r.error}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                run({ lineIds: [r.id] });
                              }}
                            >
                              <RotateCw /> Retry
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {r.status === "done" && r.suggestion && (
                        <>
                          <TableCell>
                            <button
                              type="button"
                              title="Fix this code"
                              className="group -mx-1.5 flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (r.suggestion!.status !== "corrected") setInlineFix(r);
                              }}
                            >
                              <Code code={r.suggestion.code} className={r.suggestion.status === "corrected" ? "text-primary" : undefined} />
                              {r.suggestion.status !== "corrected" && (
                                <PencilLine className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="whitespace-normal text-sm text-muted-foreground">
                            <span className="line-clamp-2">{r.suggestion.reason}</span>
                            {r.suggestion.question && r.suggestion.status === "pending" && (
                              <span className="mt-1 flex items-start gap-1.5 text-xs text-primary">
                                <MessageCircleQuestion className="mt-0.5 size-3.5 shrink-0" />
                                <span className="line-clamp-1">{r.suggestion.question}</span>
                              </span>
                            )}
                            {r.suggestion.precedentId && r.suggestion.status !== "corrected" && (
                              <span className="mt-1 block text-xs text-primary">Followed precedent #{r.suggestion.precedentId}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{Math.round(r.suggestion.confidence * 100)}%</TableCell>
                          <TableCell className="text-right">
                            {r.suggestion.status === "corrected" ? (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/10"><PencilLine /> Fixed</Badge>
                            ) : r.suggestion.status === "approved" ? (
                              <Badge variant="secondary"><Check /> Approved</Badge>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {r.suggestion.flagged && (
                                  <Badge variant="outline" className="border-primary/40 text-primary"><Flag /> Review</Badge>
                                )}
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-7"
                                  title="Approve as it is"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approve([r.suggestion!.id]);
                                  }}
                                >
                                  <Check />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-7"
                                  title="Fix the code"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineFix(r);
                                  }}
                                >
                                  <PencilLine />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Approve a code as it is (✓), fix it (✎), or click a row to see its receipt.</p>
          </section>
        )}
      </div>

      <ReceiptSheet
        row={receipt}
        onClose={() => setReceipt(null)}
        onFix={fix}
        onApprove={(sg) => {
          approve([sg.id]);
          setReceipt(null);
        }}
      />

      <Dialog open={!!inlineFix} onOpenChange={(o) => !o && setInlineFix(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="leading-snug">{inlineFix?.text}</DialogTitle>
            <DialogDescription>
              The AI said {inlineFix?.suggestion && <Code code={inlineFix.suggestion.code} />}. Pick the right code and say why.
            </DialogDescription>
          </DialogHeader>
          {inlineFix?.suggestion && (
            <FixForm
              currentCode={inlineFix.suggestion.code}
              toolCalls={inlineFix.suggestion.toolCalls}
              onCancel={() => setInlineFix(null)}
              onSubmit={(code, reason) => fix(inlineFix.suggestion!, code, reason)}
            />
          )}
        </DialogContent>
      </Dialog>

      {panelOpen && (
        <LearningPanel
          broker={broker}
          brokers={brokers}
          rail={rail}
          items={items}
          preparing={preparing || fixing}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
