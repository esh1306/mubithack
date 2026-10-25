"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Loader2, Plus, Trash2, Check, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConnectorLogo } from "@/components/connector-logos";
import { PrueSpot } from "@/components/prue-spot";
import { PRUE } from "@/lib/prue-tips";
import { ClientToolbar, sortClients, useClientSort } from "@/components/client-sort";
import { readSse } from "@/lib/sse";

type Client = {
  id: number;
  name: string;
  eori: string | null;
  lines: number;
  invoices: number;
  store: { shop: string; name: string | null; token: string | null } | null;
};

async function call(url: string, body?: object) {
  const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data;
}

function StoreConnect({ broker, client, oauthReady, onChange }: { broker: string; client: Client; oauthReady: boolean; onChange: () => void }) {
  const router = useRouter();
  const [shop, setShop] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/${broker}/clients/${client.id}/shopify`;

  async function run(action: string, extra: object = {}) {
    setBusy(action);
    setError(null);
    try {
      return await call(base, { action, ...extra });
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  // Import the catalogue, start classifying it for this client, and go to Classify once the invoice exists.
  async function importAndClassify() {
    const data = await run("import");
    if (!data) return;
    if (data.lines.length === 0) return setError("The store has no products yet.");
    setBusy("classify");
    const ctrl = new AbortController();
    const res = await fetch(`/api/${broker}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: data.lines, clientId: client.id }),
      signal: ctrl.signal,
    });
    await readSse(res, (event) => {
      if (event === "batch") {
        ctrl.abort();
        router.push(`/${broker}/classify`);
      }
    }).catch(() => {});
  }

  if (client.store) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">
          <ShoppingBag className="mr-1 inline size-3.5" />
          {client.store.name ?? client.store.shop} <span className="text-muted-foreground">· {client.store.shop}</span>
        </span>
        <Button size="sm" onClick={importAndClassify} disabled={!!busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ShoppingBag />} Import catalogue and classify
        </Button>
        <Button size="sm" variant="ghost" disabled={!!busy} onClick={async () => { if (await run("disconnect")) onChange(); }}>
          Disconnect
        </Button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        <CsvImport broker={broker} clientId={client.id} busy={busy} setBusy={setBusy} setError={setError} />
      </div>
    );
  }

  const storeForm = (
    <div className="flex flex-wrap gap-2">
      <Input className="max-w-64" placeholder="client-store.myshopify.com" value={shop} onChange={(e) => setShop(e.target.value)} />
      {oauthReady && (
        <Button
          size="sm"
          variant="outline"
          disabled={!shop || !!busy}
          onClick={async () => {
            const d = await run("oauth", { shop });
            if (d?.authorizeUrl) window.location.assign(d.authorizeUrl);
          }}
        >
          {busy === "oauth" && <Loader2 className="animate-spin" />} Connect with Shopify
        </Button>
      )}
      <Input className="max-w-64" type="password" placeholder="Admin API token (shpat_…)" value={token} onChange={(e) => setToken(e.target.value)} />
      <Button size="sm" variant="outline" disabled={!shop || !token || !!busy} onClick={async () => { if (await run("connect", { shop, token })) onChange(); }}>
        {busy === "connect" && <Loader2 className="animate-spin" />} Connect store
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Bring in this client&apos;s products: import their Shopify product export and every item gets a code.
      </p>
      <CsvImport broker={broker} clientId={client.id} busy={busy} setBusy={setBusy} setError={setError} />
      {oauthReady ? (
        storeForm
      ) : (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Connect a live store with an access token</summary>
          <div className="mt-2">{storeForm}</div>
        </details>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function CsvImport({
  broker,
  clientId,
  busy,
  setBusy,
  setError,
}: {
  broker: string;
  clientId: number;
  busy: string | null;
  setBusy: (v: string | null) => void;
  setError: (v: string | null) => void;
}) {
  const router = useRouter();

  async function onFile(file: File) {
    setBusy("csv");
    setError(null);
    try {
      const csv = await file.text();
      const data = await call(`/api/${broker}/clients/${clientId}/shopify`, { action: "import-csv", csv });
      if (data.lines.length === 0) return setError("No product rows in that CSV.");
      const ctrl = new AbortController();
      const res = await fetch(`/api/${broker}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: data.lines, clientId }),
        signal: ctrl.signal,
      });
      await readSse(res, (event) => {
        if (event === "batch") {
          ctrl.abort();
          router.push(`/${broker}/classify`);
        }
      }).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Button size="sm" variant="ghost" disabled={!!busy} asChild>
        <label className="cursor-pointer">
          {busy === "csv" ? <Loader2 className="animate-spin" /> : null}
          Import Shopify product CSV
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onFile(f);
            }}
          />
        </label>
      </Button>
      <a href="/api/sample/shopify-csv" className="text-foreground/60 underline-offset-4 hover:underline">
        Sample CSV
      </a>
    </div>
  );
}

export function ClientsView({ broker }: { broker: string }) {
  const search = useSearchParams();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [oauthReady, setOauthReady] = useState(false);
  const [form, setForm] = useState({ name: "", eori: "" });
  const [adding, setAdding] = useState(false);
  const [notice] = useState(
    search.get("shopify") === "connected" ? "Store connected." : search.get("shopify") === "error" ? search.get("message") : null,
  );

  const load = useCallback(async () => {
    const [list, shop] = await Promise.all([call(`/api/${broker}/clients`), call(`/api/${broker}/shopify`)]);
    setClients(list);
    setOauthReady(!!shop.oauthReady);
  }, [broker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves
    load();
  }, [load]);

  async function add() {
    setAdding(true);
    try {
      await call(`/api/${broker}/clients`, form);
      setForm({ name: "", eori: "" });
      setAddOpen(false);
      load();
    } finally {
      setAdding(false);
    }
  }

  const { sort, setSort, q, setQ } = useClientSort();
  const shown = clients ? sortClients(clients, sort, q) : null;
  const [addOpen, setAddOpen] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const open = clients?.find((c) => c.id === openId) ?? null;

  async function remove(id: number) {
    await fetch(`/api/${broker}/clients/${id}`, { method: "DELETE" });
    setOpenId(null);
    load();
  }

  const totals = {
    clients: clients?.length ?? 0,
    invoices: clients?.reduce((s, c) => s + c.invoices, 0) ?? 0,
    lines: clients?.reduce((s, c) => s + c.lines, 0) ?? 0,
    stores: clients?.filter((c) => c.store).length ?? 0,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="desk-display">Clients</h1>
          <p className="max-w-2xl text-[15px] text-muted-foreground">The importers you declare for. Each one&apos;s EORI goes on its declarations.</p>
        </div>
        <div className="flex items-end gap-4">
          <Button onClick={() => setAddOpen(true)}>
            <Plus /> Add client
          </Button>
          <PrueSpot state={PRUE.clients.pose} say={PRUE.clients.say} side="right" className="-mb-8" />
        </div>
      </header>

      {notice && <p className="rounded-md border px-3 py-2 text-sm">{notice}</p>}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {[
          ["Clients", totals.clients],
          ["Invoices coded", totals.invoices],
          ["Product lines coded", totals.lines],
          ["Shopify stores connected", totals.stores],
        ].map(([k, v]) => (
          <div key={k} className="bg-card px-5 py-4">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="mt-1 font-serif text-[30px] leading-none tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3">
          <ClientToolbar q={q} setQ={setQ} sort={sort} setSort={setSort} shown={shown?.length ?? 0} total={clients?.length ?? 0} />
        </div>

        {clients === null && <p className="px-5 py-8 text-sm text-muted-foreground">Loading clients…</p>}
        {clients?.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="font-serif text-xl">No clients yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Add the importers you work for. You&apos;ll pick one each time you bring in an invoice.</p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Add your first client
            </Button>
          </div>
        )}
        {shown && clients && clients.length > 0 && shown.length === 0 && <p className="px-5 py-8 text-sm text-muted-foreground">No client matches “{q}”.</p>}

        {shown && shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-[14.5px]">
              <thead>
                <tr className="border-b border-border/70 bg-muted/50 text-left text-[12.5px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">EORI</th>
                  <th className="px-3 py-2.5 text-right font-medium">Invoices</th>
                  <th className="px-3 py-2.5 text-right font-medium">Lines coded</th>
                  <th className="px-3 py-2.5 font-medium">Shopify store</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setOpenId(c.id)}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40"
                  >
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[13px] font-semibold text-primary">
                          {c.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")}
                        </span>
                        <span className="font-medium">{c.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[13px] text-muted-foreground">{c.eori ?? "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.invoices}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.lines}</td>
                    <td className="px-3 py-3">
                      {c.store ? (
                        <span className="inline-flex items-center gap-1.5 text-good">
                          <ConnectorLogo id="shopify" size={20} /> {c.store.name ?? c.store.shop}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not connected</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a client</DialogTitle>
            <DialogDescription>The importer you&apos;ll declare goods for.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Company name</span>
              <Input autoFocus placeholder="e.g. Sunrise Homeware Ltd" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">EORI number</span>
              <Input placeholder="GB followed by 12 digits" value={form.eori} onChange={(e) => setForm({ ...form, eori: e.target.value })} />
              <span className="block text-xs text-muted-foreground">Optional now, needed before you file a declaration.</span>
            </label>
            <Button className="w-full" onClick={add} disabled={!form.name.trim() || adding}>
              {adding && <Loader2 className="animate-spin" />} Add client
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!open} onOpenChange={(o) => { if (!o) { setOpenId(null); setConfirmRemove(false); } }}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="border-b border-border/70 p-6">
                <SheetTitle className="font-serif text-[26px] font-normal">{open.name}</SheetTitle>
                <SheetDescription>EORI <span className="font-mono">{open.eori ?? "not set"}</span></SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    ["Invoices coded", open.invoices],
                    ["Product lines coded", open.lines],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-muted/60 px-4 py-3">
                      <dt className="text-sm text-muted-foreground">{k}</dt>
                      <dd className="font-serif text-[26px] leading-tight tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Button className="w-full" asChild>
                  <Link href={`/${broker}/classify?new=1&client=${open.id}`}>
                    <Plus /> New invoice for {open.name}
                  </Link>
                </Button>
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 font-medium">
                    <ConnectorLogo id="shopify" size={24} /> Shopify store
                    {open.store ? (
                      <Badge className="bg-good/15 text-good hover:bg-good/15"><Check /> Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not connected</Badge>
                    )}
                  </h3>
                  <StoreConnect broker={broker} client={open} oauthReady={oauthReady} onChange={load} />
                </section>
                <section className="border-t border-border/70 pt-5">
                  <Button
                    variant="ghost"
                    className={confirmRemove ? "text-bad hover:text-bad" : "text-muted-foreground"}
                    onClick={() => (confirmRemove ? remove(open.id) : setConfirmRemove(true))}
                  >
                    <Trash2 /> {confirmRemove ? "Click again to remove this client" : "Remove client"}
                  </Button>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
