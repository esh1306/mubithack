"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, ListFilter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Client lists everywhere share one search and one sort, the way CRM and broker tools do:
// filter by name or EORI, sort by name, activity or age, and remember the choice per viewer.
export const CLIENT_SORTS = [
  { id: "az", label: "Name A–Z" },
  { id: "za", label: "Name Z–A" },
  { id: "invoices", label: "Most invoices" },
  { id: "recent", label: "Recently added" },
] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number]["id"];

type Sortable = { id: number; name: string; eori: string | null; invoices?: number };

export function sortClients<T extends Sortable>(list: T[], sort: ClientSort, q = ""): T[] {
  const needle = q.trim().toLowerCase();
  const hit = needle ? list.filter((c) => c.name.toLowerCase().includes(needle) || (c.eori ?? "").toLowerCase().includes(needle)) : list;
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" });
  return [...hit].sort((a, b) => {
    if (sort === "za") return byName(b, a);
    if (sort === "invoices") return (b.invoices ?? 0) - (a.invoices ?? 0) || byName(a, b);
    if (sort === "recent") return b.id - a.id;
    return byName(a, b);
  });
}

export function useClientSort(storageKey = "precedent:client-sort") {
  const [sort, setSortState] = useState<ClientSort>("az");
  const [q, setQ] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as ClientSort | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restores a per-viewer preference once
      if (saved && CLIENT_SORTS.some((s) => s.id === saved)) setSortState(saved);
    } catch {}
  }, [storageKey]);
  const setSort = (s: ClientSort) => {
    setSortState(s);
    try {
      localStorage.setItem(storageKey, s);
    } catch {}
  };
  return { sort, setSort, q, setQ };
}

export function ClientToolbar({
  q,
  setQ,
  sort,
  setSort,
  shown,
  total,
  compact = false,
}: {
  q: string;
  setQ: (v: string) => void;
  sort: ClientSort;
  setSort: (s: ClientSort) => void;
  shown: number;
  total: number;
  compact?: boolean;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative min-w-[14rem] max-w-md flex-1">
        <ListFilter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Filter by name or EORI" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter clients" />
      </div>
      <Select value={sort} onValueChange={(v) => setSort(v as ClientSort)}>
        <SelectTrigger className="w-[11.5rem]" aria-label="Sort clients">
          <ArrowDownUp className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CLIENT_SORTS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!compact && (
        <span className="text-sm tabular-nums text-muted-foreground">
          {shown === total ? `${total} client${total === 1 ? "" : "s"}` : `${shown} of ${total}`}
        </span>
      )}
    </div>
  );
}
