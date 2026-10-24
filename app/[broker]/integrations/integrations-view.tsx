"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ShoppingBag, FileSpreadsheet, Landmark, Download, Cpu, Loader2, ExternalLink, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "@/components/info";
import { readSse } from "@/lib/sse";

type Batch = { batchId: string; lines: number; createdAt: string };
type Hmrc = {
  configured: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  eori?: string;
  badgeId?: string | null;
  connected?: boolean;
  lastSubmission?: { at: string; status: number; conversationId: string | null; body: string; lrn: string } | null;
};

function Card({ icon: Icon, title, info, status, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  info?: Parameters<typeof Info>[0]["id"];
  status: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4" />
          </span>
          <h2 className="flex items-center gap-1 font-medium">
            {title} {info && <Info id={info} />}
          </h2>
        </div>
        {status}
      </header>
      {children}
    </section>
  );
}

const On = ({ children = "Connected" }: { children?: React.ReactNode }) => (
  <Badge className="bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10"><Check /> {children}</Badge>
);
const Off = ({ children = "Not connected" }: { children?: React.ReactNode }) => <Badge variant="outline">{children}</Badge>;

export function IntegrationsView({ broker }: { broker: string }) {
  const router = useRouter();
  const search = useSearchParams();

  const [tariff, setTariff] = useState<{ codes: number; chapters: number; live: boolean } | null>(null);
  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<{ code: string; path: string; dutyRate: string | null }[] | null>(null);

  const [shop, setShop] = useState<{ connected: boolean; shop?: string; name?: string; token?: string } | null>(null);
  const [shopForm, setShopForm] = useState({ shop: "", token: "" });
  const [shopBusy, setShopBusy] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  const [hmrc, setHmrc] = useState<Hmrc | null>(null);
  const [hmrcForm, setHmrcForm] = useState({ clientId: "", clientSecret: "", eori: "", badgeId: "" });
  const [hmrcBusy, setHmrcBusy] = useState<string | null>(null);
  const [hmrcError, setHmrcError] = useState<string | null>(search.get("hmrc") === "error" ? search.get("message") : null);
  const [xml, setXml] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [t, s, h, b] = await Promise.all([
      fetch("/api/tariff/status").then((r) => r.json()),
      fetch(`/api/${broker}/shopify`).then((r) => r.json()),
      fetch(`/api/${broker}/hmrc`).then((r) => r.json()),
      fetch(`/api/${broker}/batch?list=1`).then((r) => r.json()),
    ]);
    setTariff(t);
    setShop(s);
    setHmrc(h);
    if (h.configured) setHmrcForm({ clientId: h.clientId, clientSecret: "", eori: h.eori, badgeId: h.badgeId ?? "" });
    setBatches(b);
    setBatchId((cur) => cur ?? b[0]?.batchId ?? null);
  }, [broker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetches resolve
    load();
  }, [load]);

  async function lookupLive() {
    setLookupResult(null);
    setLookupResult(await (await fetch(`/api/tariff/search?q=${encodeURIComponent(lookup)}`)).json());
    setTariff(await (await fetch("/api/tariff/status")).json());
  }

  async function shopify(action: string, extra: object = {}) {
    setShopBusy(action);
    setShopError(null);
    try {
      const res = await fetch(`/api/${broker}/shopify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    } catch (e) {
      setShopError((e as Error).message);
      return null;
    } finally {
      setShopBusy(null);
    }
  }

  // Import products, start classifying them, and go to Classify as soon as the invoice exists.
  async function importShopify() {
    const data = await shopify("import");
    if (!data) return;
    if (data.lines.length === 0) return setShopError("The store has no products yet.");
    setShopBusy("classify");
    // Classification carries on server-side after we stop listening.
    const ctrl = new AbortController();
    const res = await fetch(`/api/${broker}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: data.lines }),
      signal: ctrl.signal,
    });
    await readSse(res, (event) => {
      if (event === "batch") {
        ctrl.abort();
        router.push(`/${broker}/classify`);
      }
    }).catch(() => {});
  }

  async function hmrcCall(action: string, extra: object = {}) {
    setHmrcBusy(action);
    setHmrcError(null);
    try {
      const res = await fetch(`/api/${broker}/hmrc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.xml) setXml(data.xml);
      if (!res.ok) throw new Error(data.error);
      return data;
    } catch (e) {
      setHmrcError((e as Error).message);
      return null;
    } finally {
      setHmrcBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
          Integrations <Info id="integrations" />
        </h1>
        <p className="text-sm text-muted-foreground">The systems a broker already works in: where codes come from, where products live, and where declarations go.</p>
      </header>

      <Card
        icon={BookOpen}
        title="UK Trade Tariff (live)"
        status={tariff ? (tariff.live ? <On>Live</On> : <Off>Offline · using saved copy</Off>) : null}
      >
        <p className="text-sm text-muted-foreground">
          HMRC&apos;s public tariff API. {tariff?.codes ?? "…"} codes and {tariff?.chapters ?? "…"} chapters saved locally. Any heading the agent
          or a broker needs that isn&apos;t saved yet is fetched live, with its chapter notes and duty rate, and kept.
        </p>
        <div className="flex gap-2">
          <Input placeholder="Try a code or words, e.g. 8471 or laptop" value={lookup} onChange={(e) => setLookup(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupLive()} />
          <Button variant="outline" onClick={lookupLive} disabled={!lookup.trim()}>Look up</Button>
        </div>
        {lookupResult && (
          <ul className="divide-y rounded-md border text-sm">
            {lookupResult.length === 0 && <li className="px-3 py-2 text-muted-foreground">No codes found.</li>}
            {lookupResult.slice(0, 6).map((r) => (
              <li key={r.code} className="flex items-start justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="font-mono font-semibold">{r.code}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.path}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.dutyRate ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card icon={ShoppingBag} title="Shopify" info="shopify" status={shop?.connected ? <On /> : <Off />}>
        {shop?.connected ? (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{shop.name}</span> · {shop.shop} · token {shop.token}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={importShopify} disabled={!!shopBusy}>
                {shopBusy ? <Loader2 className="animate-spin" /> : <ShoppingBag />} Import products and classify
              </Button>
              <Button variant="ghost" onClick={async () => setShop(await shopify("disconnect"))} disabled={!!shopBusy}>
                Disconnect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">After approving or fixing codes on Classify, use “Push to Shopify” to write them back to each product.</p>
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="your-store.myshopify.com" value={shopForm.shop} onChange={(e) => setShopForm({ ...shopForm, shop: e.target.value })} />
            <Input type="password" placeholder="Admin API access token (shpat_…)" value={shopForm.token} onChange={(e) => setShopForm({ ...shopForm, token: e.target.value })} />
            <Button
              disabled={!shopForm.shop || !shopForm.token || !!shopBusy}
              onClick={async () => {
                const d = await shopify("connect", shopForm);
                if (d) setShop(d);
              }}
            >
              {shopBusy === "connect" && <Loader2 className="animate-spin" />} Connect
            </Button>
          </div>
        )}
        {shopError && <p className="text-sm text-destructive">{shopError}</p>}
      </Card>

      <Card icon={FileSpreadsheet} title="Excel and CSV invoices" status={<On>Ready</On>}>
        <p className="text-sm text-muted-foreground">
          Drop the supplier&apos;s commercial invoice straight in on{" "}
          <Link href={`/${broker}/classify`} className="text-primary hover:underline">Classify</Link>. Title rows and totals are skipped, and the
          description, quantity, value and origin columns are found whatever they&apos;re called.
        </p>
        <Button variant="outline" asChild>
          <a href="/api/sample/xlsx"><Download /> Sample Excel invoice</a>
        </Button>
      </Card>

      <Card
        icon={Landmark}
        title="HMRC Customs Declarations (sandbox)"
        info="hmrc"
        status={hmrc?.connected ? <On>Signed in</On> : hmrc?.configured ? <Off>App saved · sign in</Off> : <Off />}
      >
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Files the classified invoice as an H1 import declaration (WCO DEC-DMS XML) to HMRC&apos;s Customs Declarations API in the sandbox.</p>
          <p className="flex flex-wrap items-center gap-2">
            Redirect URI for your Developer Hub app: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{hmrc?.redirectUri}</code>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={async () => {
                await navigator.clipboard.writeText(hmrc?.redirectUri ?? "");
                setCopied(true);
              }}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </p>
          <a href="https://developer.service.hmrc.gov.uk/developer/applications" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            HMRC Developer Hub <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Client ID" value={hmrcForm.clientId} onChange={(e) => setHmrcForm({ ...hmrcForm, clientId: e.target.value })} />
          <Input
            type="password"
            placeholder={hmrc?.clientSecret ? `Client secret (saved ${hmrc.clientSecret})` : "Client secret"}
            value={hmrcForm.clientSecret}
            onChange={(e) => setHmrcForm({ ...hmrcForm, clientSecret: e.target.value })}
          />
          <Input placeholder="Importer EORI, e.g. GB123456789000" value={hmrcForm.eori} onChange={(e) => setHmrcForm({ ...hmrcForm, eori: e.target.value })} />
          <Input placeholder="Badge ID (optional, CSP users)" value={hmrcForm.badgeId} onChange={(e) => setHmrcForm({ ...hmrcForm, badgeId: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!hmrcForm.clientId || (!hmrcForm.clientSecret && !hmrc?.clientSecret) || !hmrcForm.eori || !!hmrcBusy}
            onClick={async () => {
              const d = await hmrcCall("save", hmrcForm);
              if (d?.authorizeUrl) window.location.assign(d.authorizeUrl);
            }}
          >
            {hmrcBusy === "save" && <Loader2 className="animate-spin" />} {hmrc?.connected ? "Save and sign in again" : "Save and sign in to HMRC"}
          </Button>
          {hmrc?.configured && (
            <Button variant="ghost" onClick={async () => setHmrc(await hmrcCall("disconnect"))}>
              Disconnect
            </Button>
          )}
        </div>

        {hmrc?.configured && batches.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={batchId ?? undefined} onValueChange={setBatchId}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.batchId} value={b.batchId}>
                      #{b.batchId.slice(0, 8)} · {b.lines} lines · {new Date(b.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" disabled={!batchId || !!hmrcBusy} onClick={() => hmrcCall("preview", { batchId })}>
                Preview declaration
              </Button>
              <Button disabled={!batchId || !hmrc.connected || !!hmrcBusy} onClick={async () => { if (await hmrcCall("submit", { batchId })) load(); }}>
                {hmrcBusy === "submit" && <Loader2 className="animate-spin" />} Submit to HMRC sandbox
              </Button>
            </div>
            {hmrc.lastSubmission && (
              <div className="space-y-1 rounded-md border p-3 text-sm">
                <p>
                  Last submission <span className="font-mono">{hmrc.lastSubmission.lrn}</span> ·{" "}
                  <span className={hmrc.lastSubmission.status === 202 ? "text-emerald-700" : "text-destructive"}>HTTP {hmrc.lastSubmission.status}</span>
                  {hmrc.lastSubmission.status === 202 && " accepted for processing"}
                  {hmrc.lastSubmission.conversationId && <> · conversation <span className="font-mono text-xs">{hmrc.lastSubmission.conversationId}</span></>}
                </p>
                {hmrc.lastSubmission.body && (
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">{hmrc.lastSubmission.body}</pre>
                )}
              </div>
            )}
            {xml && (
              <details className="rounded-md border">
                <summary className="cursor-pointer px-3 py-2 text-sm">Declaration XML (WCO DEC-DMS)</summary>
                <pre className="max-h-80 overflow-auto border-t p-3 font-mono text-[11px] leading-relaxed">{xml}</pre>
              </details>
            )}
          </div>
        )}
        {hmrcError && <p className="text-sm text-destructive">{hmrcError}</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card icon={Download} title="Declaration software" info="export" status={<On>CSV</On>}>
          <p className="text-sm text-muted-foreground">ASM, CargoWise and Descartes import CSV worksheets. Export codes split into DE 6/14 and 6/15.</p>
          <Button variant="outline" asChild><Link href={`/${broker}/export`}>Go to Export</Link></Button>
        </Card>
        <Card icon={Cpu} title="Mubit" info="mubit" status={<On />}>
          <p className="text-sm text-muted-foreground">Every model call goes through Mubit, which trains this broker&apos;s own adapter.</p>
          <Button variant="outline" asChild><Link href={`/${broker}/mubit`}>See calls</Link></Button>
        </Card>
      </div>
    </div>
  );
}
