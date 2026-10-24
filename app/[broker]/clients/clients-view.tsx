"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Loader2, Plus, Trash2, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page";
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

  return (
    <div className="space-y-2">
      {!oauthReady && (
        <p className="rounded-md border border-foreground/20 bg-muted/40 px-3 py-2 text-sm">
          Shopify app credentials are not on this server (<span className="font-mono">SHOPIFY_CLIENT_ID</span> /{" "}
          <span className="font-mono">SHOPIFY_CLIENT_SECRET</span> in <span className="font-mono">.env.local</span>).
          Paste a custom-app token, or import a product CSV. Setup: <span className="font-mono">docs/SHOPIFY.md</span>.
        </p>
      )}
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
      <CsvImport broker={broker} clientId={client.id} busy={busy} setBusy={setBusy} setError={setError} />
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
      load();
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: number) {
    await fetch(`/api/${broker}/clients/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Clients"
        info="clients"
        description="The importers you declare for. Connect a client's online store to classify their whole catalogue once and write the codes back to it."
      />

      {notice && <p className="rounded-md border px-3 py-2 text-sm">{notice}</p>}

      <section className="grid gap-2 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Client name, e.g. Sunrise Homeware Ltd" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Importer EORI (GB + 12 digits)" value={form.eori} onChange={(e) => setForm({ ...form, eori: e.target.value })} />
        <Button onClick={add} disabled={!form.name.trim() || adding}>
          <Plus /> Add client
        </Button>
      </section>

      {clients === null && <p className="text-sm text-muted-foreground">Loading clients…</p>}
      {clients?.length === 0 && (
        <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">No clients yet. Add the importers you work for above.</p>
      )}

      <ul className="space-y-3">
        {clients?.map((c) => (
          <li key={c.id} className="space-y-3 rounded-xl border border-border/70 bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <Building2 className="size-4" />
                </span>
                <div>
                  <p className="font-serif text-[22px] leading-tight">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    EORI <span className="font-mono">{c.eori ?? "not set"}</span> · {c.invoices} invoices · {c.lines} lines
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.store ? (
                  <Badge className="bg-good/15 text-good hover:bg-good/15"><Check /> Store connected</Badge>
                ) : (
                  <Badge variant="outline">No store</Badge>
                )}
                <Button size="icon" variant="ghost" title="Remove client" onClick={() => remove(c.id)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
            <StoreConnect broker={broker} client={c} oauthReady={oauthReady} onChange={load} />
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Invoices are tagged to a client when you classify them (pick the client on{" "}
        <Link href={`/${broker}/classify`} className="text-primary hover:underline">Classify</Link>). The client&apos;s EORI is the importer on its HMRC declarations.
      </p>
    </div>
  );
}
