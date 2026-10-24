"use client";

import { Code } from "@/components/code";

export type DeclarationSummary = {
  lrn: string;
  type: string;
  typeLabel: string;
  procedure: string;
  procedureLabel: string;
  declarant: string;
  importer: string;
  importerName?: string | null;
  representation: string;
  goodsLocation: string;
  currency: string;
  total: number;
  lines: { seq: number; description: string; cn: string; taric: string; value: number; origin: string; packages: number }[];
};

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

function Field({ de, label, children }: { de: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">
        <span className="font-mono">DE {de}</span> · {label}
      </dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

// The declaration as a broker would read it on a customs form: header fields, then one row per goods item.
export function DeclarationPreview({ summary, xml }: { summary: DeclarationSummary; xml: string }) {
  return (
    <div className="space-y-4 rounded-lg border">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-muted/40 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Customs declaration · CDS</p>
          <p className="font-medium">{summary.typeLabel}</p>
        </div>
        <p className="font-mono text-sm">{summary.lrn}</p>
      </div>

      <dl className="grid gap-4 px-4 sm:grid-cols-3">
        <Field de="1/1 1/2" label="Declaration type">
          <span className="font-mono">{summary.type}</span>
        </Field>
        <Field de="2/5" label="LRN">
          <span className="font-mono">{summary.lrn}</span>
        </Field>
        <Field de="1/10" label="Procedure">
          <span className="font-mono">{summary.procedure}</span> <span className="font-normal text-muted-foreground">{summary.procedureLabel}</span>
        </Field>
        <Field de="3/18" label="Declarant EORI">
          <span className="font-mono">{summary.declarant}</span>
        </Field>
        <Field de="3/16" label="Importer">
          {summary.importerName && <span className="block">{summary.importerName}</span>}
          <span className="font-mono">{summary.importer}</span>
        </Field>
        <Field de="3/21" label="Representation">{summary.representation}</Field>
        <Field de="5/23" label="Location of goods">{summary.goodsLocation}</Field>
        <Field de="1/9" label="Goods items">{summary.lines.length}</Field>
        <Field de="4/11" label="Invoice total">{gbp(summary.total)}</Field>
      </dl>

      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium"><span className="font-mono">1/6</span> #</th>
              <th className="px-3 py-2 text-left font-medium"><span className="font-mono">6/8</span> Description</th>
              <th className="px-3 py-2 text-left font-medium"><span className="font-mono">6/14 + 6/15</span> Commodity code</th>
              <th className="px-3 py-2 text-left font-medium"><span className="font-mono">5/15</span> Origin</th>
              <th className="px-3 py-2 text-right font-medium"><span className="font-mono">6/10</span> Pkgs</th>
              <th className="px-3 py-2 text-right font-medium"><span className="font-mono">8/6</span> Value</th>
            </tr>
          </thead>
          <tbody>
            {summary.lines.map((l) => (
              <tr key={l.seq} className="border-t">
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{l.seq}</td>
                <td className="px-3 py-2">{l.description}</td>
                <td className="px-3 py-2 whitespace-nowrap"><Code code={l.cn + l.taric} className="text-xs" /></td>
                <td className="px-3 py-2 font-mono">{l.origin}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.packages}</td>
                <td className="px-3 py-2 text-right tabular-nums">{gbp(l.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="border-t">
        <summary className="cursor-pointer px-4 py-2 text-sm text-muted-foreground">Show the XML sent to HMRC (WCO DEC-DMS)</summary>
        <pre className="max-h-80 overflow-auto border-t bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">{xml}</pre>
      </details>
    </div>
  );
}
