"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ArrowRightLeft,
  Download,
  Cpu,
  Building2,
  Inbox,
  BookMarked,
  Landmark,
  Loader2,
  Plus,
  ExternalLink,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV } from "@/components/sidebar";

const EVENT = "precedent:command-menu";

export function openCommandMenu() {
  window.dispatchEvent(new Event(EVENT));
}

type Sample = { id: string; name: string; supplier: string };
type Client = { id: number | string; name: string; eori: string | null; invoices: number; lines: number };
type Batch = { batchId: string; lines: number; createdAt: string; client: string | null };
type Correction = { id: number | string; lineText: string; oldCode: string; newCode: string; reason: string | null };
type Candidate = { code: string; description: string };
type Desk = { clients: Client[]; batches: Batch[]; corrections: Correction[] };

const EMPTY_DESK: Desk = { clients: [], batches: [], corrections: [] };

// "3924100011" → "3924 10 00 11"
function formatCode(code: string) {
  const d = (code ?? "").replace(/\D/g, "");
  if (d.length < 6) return d;
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(" ");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

// ⌘K: search clients, invoices, corrections and HMRC's tariff; jump to pages; switch firm.
export function CommandMenu({ broker, brokers }: { broker: string; brokers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [desk, setDesk] = useState<Desk>(EMPTY_DESK);
  // Tariff results are tagged with the query they answer, so stale ones never show.
  const [tariff, setTariff] = useState<{ q: string; items: Candidate[] }>({ q: "", items: [] });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENT, onOpen);
    };
  }, []);

  // Fresh desk data once per open.
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([
      getJson<Client[]>(`/api/${broker}/clients`, []),
      getJson<Batch[]>(`/api/${broker}/batch?list=1`, []),
      getJson<Correction[]>(`/api/${broker}/precedents`, []),
      getJson<Sample[]>("/api/sample", []),
    ]).then(([clients, batches, corrections, s]) => {
      if (!live) return;
      setDesk({
        clients: Array.isArray(clients) ? clients : [],
        batches: Array.isArray(batches) ? batches : [],
        corrections: Array.isArray(corrections) ? corrections : [],
      });
      setSamples(Array.isArray(s) ? s : []);
    });
    return () => {
      live = false;
    };
  }, [open, broker]);

  const query = search.trim();
  const wantsTariff = open && query.length >= 3;

  // Debounced HMRC tariff lookup.
  useEffect(() => {
    if (!wantsTariff) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/tariff/candidates?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { candidates: [] }))
        .then((d: { candidates?: Candidate[] }) => setTariff({ q: query, items: (d.candidates ?? []).slice(0, 5) }))
        .catch(() => {
          if (!ctrl.signal.aborted) setTariff({ q: query, items: [] });
        });
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [wantsTariff, query]);

  const tariffLoading = wantsTariff && tariff.q !== query;
  const tariffItems = wantsTariff && tariff.q === query ? tariff.items : [];

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) setSearch("");
  };

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const openTariff = (code: string) => {
    onOpenChange(false);
    window.open(`https://www.trade-tariff.service.gov.uk/commodities/${code}`, "_blank", "noopener,noreferrer");
  };

  const pages = [
    ...NAV.flatMap((g) => g.items).map(({ href, label, icon }) => ({ href: `/${broker}/${href}`, label, icon, keywords: [] as string[] })),
    { href: `/${broker}/classify?new=1`, label: "New invoice", icon: Plus, keywords: ["upload", "classify", "add"] },
    { href: `/${broker}/export`, label: "Export", icon: Download, keywords: ["csv", "declaration", "software"] },
    { href: `/${broker}/mubit`, label: "Mubit", icon: Cpu, keywords: ["memory", "examples"] },
  ];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search clients, invoices, corrections or HMRC commodity codes"
    >
      <CommandInput
        placeholder="Search clients, invoices, corrections or HMRC codes…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {!tariffLoading && (
          <CommandEmpty>Nothing matches. Try a product description to search HMRC&apos;s tariff.</CommandEmpty>
        )}

        {desk.clients.length > 0 && (
          <CommandGroup heading="Clients">
            {desk.clients.map((c) => (
              <CommandItem
                key={`client-${c.id}`}
                value={`client ${c.id} ${c.name}`}
                keywords={[c.eori ?? ""]}
                onSelect={() => go(`/${broker}/clients`)}
              >
                <Building2 />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {c.eori ? <span className="font-mono">{c.eori}</span> : null}
                  {c.eori ? " · " : ""}
                  {c.invoices} {c.invoices === 1 ? "invoice" : "invoices"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {desk.batches.length > 0 && (
          <CommandGroup heading="Invoices">
            {desk.batches.map((b) => {
              const date = formatDate(b.createdAt);
              return (
                <CommandItem
                  key={`batch-${b.batchId}`}
                  value={`invoice ${b.batchId} ${b.client ?? "unassigned"}`}
                  keywords={[date]}
                  onSelect={() => go(`/${broker}/classify?batch=${b.batchId}`)}
                >
                  <Inbox />
                  <span className="truncate">{b.client ?? "Unassigned invoice"}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {b.lines} {b.lines === 1 ? "line" : "lines"}
                    {date ? ` · ${date}` : ""}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {desk.corrections.length > 0 && (
          <CommandGroup heading="Corrections">
            {desk.corrections.map((p) => (
              <CommandItem
                key={`correction-${p.id}`}
                value={`correction ${p.id} ${p.lineText}`}
                keywords={[p.oldCode, p.newCode, p.reason ?? ""]}
                onSelect={() => go(`/${broker}/precedents`)}
              >
                <BookMarked />
                <span className="truncate">{p.lineText}</span>
                <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                  {formatCode(p.oldCode)} → {formatCode(p.newCode)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(tariffLoading || tariffItems.length > 0) && (
          <CommandGroup heading="UK Trade Tariff (HMRC)">
            {tariffLoading ? (
              <CommandItem
                value={`tariff loading ${search}`}
                disabled
                className="text-muted-foreground"
              >
                <Loader2 className="animate-spin" /> Searching HMRC&apos;s tariff…
              </CommandItem>
            ) : (
              tariffItems.map((t) => (
                // Server-ranked results: the value carries the live query so cmdk's filter keeps them.
                <CommandItem
                  key={`tariff-${t.code}`}
                  value={`tariff ${t.code} ${search}`}
                  keywords={[t.description]}
                  onSelect={() => openTariff(t.code)}
                >
                  <Landmark />
                  <span className="shrink-0 font-mono text-xs">{formatCode(t.code)}</span>
                  <span className="truncate">{t.description}</span>
                  <ExternalLink className="ml-auto size-3.5 text-muted-foreground" />
                </CommandItem>
              ))
            )}
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Go to">
          {pages.map(({ href, label, icon: Icon, keywords }) => (
            <CommandItem key={href} value={`go ${label}`} keywords={keywords} onSelect={() => go(href)}>
              <Icon /> {label}
            </CommandItem>
          ))}
        </CommandGroup>

        {samples.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Classify a sample invoice">
              {samples.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`sample ${s.id} ${s.name}`}
                  keywords={[s.supplier]}
                  onSelect={() => go(`/${broker}/classify?sample=${s.id}`)}
                >
                  <FileText /> <span className="truncate">{s.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{s.supplier}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {brokers.some((b) => b.id !== broker) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Switch firm">
              {brokers
                .filter((b) => b.id !== broker)
                .map((b) => (
                  <CommandItem key={b.id} value={`firm ${b.id} ${b.name}`} onSelect={() => go(`/${b.id}/home`)}>
                    <ArrowRightLeft /> {b.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
