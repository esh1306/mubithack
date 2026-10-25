"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code } from "@/components/code";
import { PageHeader } from "@/components/page";
import { DeclareButton } from "@/components/declare-button";

type Batch = { batchId: string; lines: number; createdAt: string };
type Row = { id: number; text: string; qty: number | null; value: number | null; origin: string | null; suggestion?: { code: string; status: string } };

export function ExportView({ broker }: { broker: string }) {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/${broker}/batch?list=1`)
      .then((r) => r.json())
      .then((b: Batch[]) => {
        setBatches(b);
        setBatchId(b[0]?.batchId ?? null);
      });
  }, [broker]);

  useEffect(() => {
    if (!batchId) return;
    fetch(`/api/${broker}/batch?id=${batchId}`)
      .then((r) => r.json())
      .then((d) => setRows(d.rows));
  }, [broker, batchId]);

  const notSignedOff = rows.filter((r) => !["approved", "corrected"].includes(r.suggestion?.status ?? "")).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Export"
        prue="export"
        info="export"
        description="Codes as a CSV for your declaration software: DE 6/14 (8 digits) and DE 6/15 (TARIC) split out. No retyping."
        actions={batchId && (
          <div className="flex flex-wrap items-start gap-2">
            <Button variant="outline" asChild title="Every code with its reason, precedent, agent steps and Mubit request IDs">
              <a href={`/api/${broker}/export?batch=${batchId}&audit=1`}>
                <FileCheck /> Audit log
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/${broker}/export?batch=${batchId}`}>
                <Download /> Download CSV
              </a>
            </Button>
            <DeclareButton key={batchId} broker={broker} batchId={batchId} label="Declare to HMRC" />
          </div>
        )}
      />

      {batches === null && <p className="text-sm text-muted-foreground">Loading invoices…</p>}
      {batches?.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          Nothing to export yet.{" "}
          <Link href={`/${broker}/classify`} className="text-primary underline-offset-4 hover:underline">
            Classify an invoice in the Inbox
          </Link>{" "}
          first.
        </div>
      )}

      {batches && batches.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={batchId ?? undefined} onValueChange={setBatchId}>
            <SelectTrigger className="w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {batches.map((b) => (
                <SelectItem key={b.batchId} value={b.batchId}>
                  #{b.batchId.slice(0, 8)} · {b.lines} lines · {new Date(b.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {notSignedOff > 0 && <span className="text-sm text-muted-foreground">{notSignedOff} lines not yet approved or fixed</span>}
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-40">Commodity code</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead>
                <TableHead className="w-24 text-right">Value</TableHead>
                <TableHead className="w-16">Origin</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                  <TableCell className="whitespace-normal">{r.text}</TableCell>
                  <TableCell>{r.suggestion ? <Code code={r.suggestion.code} className="text-xs" /> : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.qty ?? ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.value != null ? `£${r.value.toLocaleString("en-GB")}` : ""}</TableCell>
                  <TableCell>{r.origin}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={["approved", "corrected"].includes(r.suggestion?.status ?? "") ? "secondary" : "outline"}>
                      {r.suggestion?.status ?? "missing"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
