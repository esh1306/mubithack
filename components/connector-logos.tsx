import { BookOpen, Landmark, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShopifyMark } from "@/components/partner-marks";

// App-tile logos for everything Precedent connects to, drawn as square tiles like a connector directory.
// Brand marks are used to name the integration; HMRC is shown by name with a neutral icon, never its crest.
export type ConnectorId = "shopify" | "excel" | "csv" | "tariff" | "cds" | "mubit" | "software";

export const CONNECTORS: Record<ConnectorId, { name: string; what: string }> = {
  shopify: { name: "Shopify", what: "Client product catalogues in; codes written back to each item" },
  excel: { name: "Excel", what: "Supplier commercial invoices, any column layout" },
  csv: { name: "CSV", what: "Invoices and product exports from any system" },
  tariff: { name: "UK Trade Tariff", what: "HMRC's live codes, legal notes, duty, VAT and origin rules" },
  mubit: { name: "Mubit", what: "Each firm's corrections, learned as its own model" },
  cds: { name: "HMRC CDS", what: "Import declarations, straight to the Customs Declaration Service" },
  software: { name: "Declaration software", what: "ASM, CargoWise and Descartes import the signed codes" },
};

export function ConnectorLogo({ id, size = 40, className }: { id: ConnectorId; size?: number; className?: string }) {
  const tile = cn("flex shrink-0 items-center justify-center rounded-[22%] shadow-[inset_0_0_0_1px_rgba(14,26,47,0.08)]", className);
  const s = { width: size, height: size };
  const icon = Math.round(size * 0.5);
  switch (id) {
    case "shopify":
      return (
        <span className={cn(tile, "bg-white")} style={s}>
          <ShopifyMark size={icon + 4} />
        </span>
      );
    case "excel":
      return (
        <span className={cn(tile, "bg-[#107C41]")} style={s}>
          <svg viewBox="0 0 24 24" width={icon + 2} height={icon + 2} aria-hidden>
            <rect x="9" y="3" width="13" height="18" rx="1.5" fill="#21A366" />
            <path d="M15 3h5.5A1.5 1.5 0 0 1 22 4.5V9h-7z" fill="#33C481" />
            <path d="M15 15h7v4.5a1.5 1.5 0 0 1-1.5 1.5H15z" fill="#185C37" />
            <rect x="2" y="6" width="12" height="12" rx="1.5" fill="#185C37" />
            <path d="M5 9h2.1l1.3 2.3L9.7 9h2l-2.2 3 2.3 3H9.7l-1.4-2.4L6.9 15H5l2.3-3z" fill="#fff" />
          </svg>
        </span>
      );
    case "csv":
      return (
        <span className={cn(tile, "bg-[#eef1f6]")} style={s}>
          <FileText className="text-[#4a5872]" style={{ width: icon, height: icon }} />
        </span>
      );
    case "tariff":
      return (
        <span className={cn(tile, "bg-[#0b3b60]")} style={s}>
          <BookOpen className="text-white" style={{ width: icon, height: icon }} />
        </span>
      );
    case "cds":
      return (
        <span className={cn(tile, "bg-[#13306b]")} style={s}>
          <Landmark className="text-white" style={{ width: icon, height: icon }} />
        </span>
      );
    case "mubit":
      return (
        <span className={cn(tile, "bg-[#111]")} style={s}>
          <svg viewBox="0 0 20 20" width={icon} height={icon} aria-hidden>
            <path d="M3 16V4h2.8l4.2 7.2L14.2 4H17v12h-2.6V8.6l-3.6 6.1H9.2L5.6 8.6V16z" fill="#fff" />
          </svg>
        </span>
      );
    case "software":
      return (
        <span className={cn(tile, "bg-[#f3eadb]")} style={s}>
          <Download className="text-[#7a4b12]" style={{ width: icon, height: icon }} />
        </span>
      );
  }
}

export type ConnectorStatus = "on" | "ready" | "off" | "warn";

const PILL: Record<ConnectorStatus, string> = {
  on: "bg-good/12 text-good",
  ready: "bg-good/12 text-good",
  off: "bg-muted text-muted-foreground",
  warn: "bg-warn/15 text-warn",
};

// One connector as a directory card: tile, name, what it does, a status pill.
export function ConnectorCard({ id, status, label, className }: { id: ConnectorId; status: ConnectorStatus; label: string; className?: string }) {
  const c = CONNECTORS[id];
  return (
    <div className={cn("flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[0_8px_24px_-16px_rgba(19,48,107,0.5)]", className)}>
      <ConnectorLogo id={id} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium leading-tight">{c.name}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PILL[status])}>{label}</span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{c.what}</p>
      </div>
    </div>
  );
}
