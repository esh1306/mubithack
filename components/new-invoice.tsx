"use client";

import { useState } from "react";
import { Building2, Check, ClipboardPaste, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConnectorLogo } from "@/components/connector-logos";
import { ClientToolbar, sortClients, useClientSort } from "@/components/client-sort";
import { cn } from "@/lib/utils";

type Client = { id: number; name: string; eori: string | null; invoices?: number };
type Sample = { id: string; name: string; supplier: string; about: string };
type Source = "excel" | "shopify" | "paste" | "sample";

// A new invoice in two decisions: who it's for (nothing chosen yet), then where the goods come from.
export function NewInvoice({
  clients,
  clientId,
  setClientId,
  addClient,
  samples,
  busy,
  error,
  onFile,
  onShopify,
  onPaste,
  onSample,
}: {
  clients: Client[];
  clientId: number | null;
  setClientId: (id: number | null) => void;
  addClient: (name: string, eori: string) => Promise<void>;
  samples: Sample[];
  busy: boolean;
  error: string | null;
  onFile: (f: File) => void;
  onShopify: (f: File) => void;
  onPaste: (lines: string[]) => void;
  onSample: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [eori, setEori] = useState("");
  const [source, setSource] = useState<Source | null>(null);
  const [paste, setPaste] = useState("");
  const client = clients.find((c) => c.id === clientId);
  const { sort, setSort, q, setQ } = useClientSort();
  const shown = sortClients(clients, sort, q);

  const sources: { id: Source; title: string; text: string; logo: React.ReactNode }[] = [
    { id: "excel", title: "Upload Excel or CSV", text: "The supplier's commercial invoice. Columns are found automatically.", logo: <ConnectorLogo id="excel" size={36} /> },
    { id: "shopify", title: "Shopify product export", text: "The client's catalogue. Codes can be written back to the store.", logo: <ConnectorLogo id="shopify" size={36} /> },
    { id: "paste", title: "Paste product lines", text: "One product per line, straight from an email or PDF.", logo: <span className="flex size-9 items-center justify-center rounded-[22%] bg-[#eef1f6]"><ClipboardPaste className="size-[18px] text-[#4a5872]" /></span> },
    { id: "sample", title: "Use a sample invoice", text: "Real product lines to try it with.", logo: <ConnectorLogo id="csv" size={36} /> },
  ];

  return (
    <div className="w-full max-w-4xl space-y-10">
      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary text-sm font-medium text-primary">1</span>
          <div>
            <h2 className="font-serif text-[24px] leading-tight">Who is this invoice for?</h2>
            <p className="text-sm text-muted-foreground">The importer you&apos;re declaring for. Their EORI goes on the declaration.</p>
          </div>
        </div>
        {clients.length > 4 && <ClientToolbar q={q} setQ={setQ} sort={sort} setSort={setSort} shown={shown.length} total={clients.length} />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setClientId(c.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 bg-card p-4 text-left transition-all hover:border-primary/50",
                clientId === c.id ? "border-primary shadow-[0_0_0_4px_rgba(19,48,107,0.1)]" : "border-border",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug">{c.name}</span>
                <span className="block text-xs text-muted-foreground">EORI {c.eori ?? "not set"}</span>
              </span>
              {clientId === c.id && <Check className="size-4 text-primary" />}
            </button>
          ))}
          {adding ? (
            <div className="space-y-2 rounded-xl border-2 border-primary/40 bg-card p-4">
              <Input placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <Input placeholder="EORI, e.g. GB123456789000" value={eori} onChange={(e) => setEori(e.target.value)} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!name.trim()}
                  onClick={async () => {
                    await addClient(name, eori);
                    setAdding(false);
                    setName("");
                    setEori("");
                  }}
                >
                  Add client
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-[4.5rem] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="size-4" /> Add a new client
            </button>
          )}
        </div>
      </section>

      <section className={cn("space-y-4 transition-opacity", !client && "pointer-events-none opacity-40")}>
        <div className="flex items-baseline gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary text-sm font-medium text-primary">2</span>
          <div>
            <h2 className="font-serif text-[24px] leading-tight">Where are the goods coming from?</h2>
            <p className="text-sm text-muted-foreground">{client ? `Bring in ${client.name}'s invoice.` : "Choose a client first."}</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSource(s.id)}
                className={cn("relative flex flex-col gap-2 p-5 text-left transition-colors hover:bg-accent/40", source === s.id && "bg-primary/[0.05]")}
              >
                {s.logo}
                <span className="font-medium">{s.title}</span>
                <span className="text-sm text-muted-foreground">{s.text}</span>
                {source === s.id && <Check className="absolute right-4 top-4 size-4 text-primary" />}
              </button>
            ))}
          </div>

          {source && (
            <div className="border-t border-border/70 bg-muted/30 p-5">
              {(source === "excel" || source === "shopify") && (
                <label
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-6 py-10 text-center transition-colors hover:border-primary/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) (source === "shopify" ? onShopify : onFile)(f);
                  }}
                >
                  <span className="font-serif text-xl">{source === "shopify" ? "Drop the Shopify product export" : "Drop the supplier's invoice"}</span>
                  <span className="text-sm text-muted-foreground">{source === "shopify" ? "products_export.csv from Shopify admin" : ".xlsx or .csv"} · or click to choose</span>
                  <input
                    type="file"
                    accept={source === "shopify" ? ".csv" : ".xlsx,.csv"}
                    hidden
                    onChange={(e) => e.target.files?.[0] && (source === "shopify" ? onShopify : onFile)(e.target.files[0])}
                  />
                </label>
              )}
              {source === "paste" && (
                <div className="space-y-2">
                  <Textarea rows={4} placeholder={"One product per line, e.g.\nBamboo kids' dinner set, plate bowl cup\nLED bulb, GU10, 5W"} value={paste} onChange={(e) => setPaste(e.target.value)} />
                  <Button
                    disabled={busy || !paste.trim()}
                    onClick={() => onPaste(paste.split("\n").map((l) => l.trim()).filter(Boolean))}
                  >
                    Check {paste.split("\n").filter((l) => l.trim()).length || ""} lines with HMRC
                  </Button>
                </div>
              )}
              {source === "sample" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {samples.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onSample(s.id)}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/40"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block font-medium">{s.name}</span>
                        <span className="block text-sm text-muted-foreground">{s.about}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="mt-3 text-sm text-bad">{error}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
