"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, ShoppingBag, FileSpreadsheet, Landmark, Download, Cpu, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "@/components/info";
import { PageHeader } from "@/components/page";
import { DeclarationPreview, type DeclarationSummary } from "@/components/declaration-preview";

type Batch = { batchId: string; lines: number; createdAt: string };
type Hmrc = {
  appReady: boolean;
  redirectUri: string | null;
  connected: boolean;
  eori: string | null;
  badgeId: string | null;
  testUser: { userId: string; password: string; name?: string } | null;
  lastSubmission: { at: string; status: number; conversationId: string | null; body: string; lrn: string } | null;
};

function Card({ icon: Icon, title, info, status, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  info?: Parameters<typeof Info>[0]["id"];
  status: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/60">
            <Icon className="size-[18px]" />
          </span>
          <h2 className="flex items-center gap-1.5 font-serif text-[22px] leading-tight">
            {title} {info && <Info id={info} />}
          </h2>
        </div>
        {status}
      </header>
      {children}
    </section>
  );
}

// HMRC's XML error, as one readable sentence.
function hmrcErrorText(body: string) {
  const msg = (tag: string) => body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))?.map((m) => m.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/\{"[^"]*":(\w+)\}/g, "$1").trim());
  const detail = msg("message")?.slice(1).join(" ");
  return [msg("message")?.[0], detail].filter(Boolean).join(": ") || "HMRC rejected the declaration.";
}

// A failed route can answer with an empty body; turn that into a readable error.
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : { error: `Server error ${res.status}` };
  } catch {
    return { error: `Server error ${res.status}: ${text.slice(0, 120)}` };
  }
}

const On = ({ children = "Connected" }: { children?: React.ReactNode }) => (
  <Badge className="bg-good/15 text-good hover:bg-good/15"><Check /> {children}</Badge>
);
const Off = ({ children = "Not connected" }: { children?: React.ReactNode }) => <Badge variant="outline">{children}</Badge>;

export function IntegrationsView({ broker }: { broker: string }) {
  const search = useSearchParams();

  const [tariff, setTariff] = useState<{ codes: number; chapters: number; live: boolean; mubitKey?: boolean } | null>(null);
  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<{ code: string; path: string; dutyRate: string | null }[] | null>(null);

  const [storeCount, setStoreCount] = useState(0);
  const [shopifySetup, setShopifySetup] = useState<string | null>(null);

  const [hmrc, setHmrc] = useState<Hmrc | null>(null);
  const [hmrcBusy, setHmrcBusy] = useState<string | null>(null);
  const [hmrcError, setHmrcError] = useState<string | null>(search.get("hmrc") === "error" ? search.get("message") : null);
  const [decl, setDecl] = useState<{ summary: DeclarationSummary; xml: string } | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, s, h, b, shop] = await Promise.all([
      fetch("/api/tariff/status").then((r) => r.json()),
      fetch(`/api/${broker}/clients`).then((r) => r.json()),
      fetch(`/api/${broker}/hmrc`).then((r) => r.json()),
      fetch(`/api/${broker}/batch?list=1`).then((r) => r.json()),
      fetch(`/api/${broker}/shopify`).then((r) => r.json()),
    ]);
    setTariff(t);
    setStoreCount((s as { store: unknown }[]).filter((c) => c.store).length);
    setShopifySetup(shop.setup ?? null);
    setHmrc(h);
    setBatches(b);
    setBatchId((cur) => cur ?? b[0]?.batchId ?? null);
  }, [broker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetches resolve
    load();
  }, [load]);

  async function lookupLive() {
    setLookupResult(null);
    const res = await (await fetch(`/api/tariff/candidates?q=${encodeURIComponent(lookup)}`)).json();
    setLookupResult((res.candidates ?? []).map((c: { code: string; description: string }) => ({ code: c.code, path: c.description, dutyRate: null })));
    setTariff(await (await fetch("/api/tariff/status")).json());
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
      const data = await safeJson(res);
      if (data.xml && data.summary) setDecl({ summary: data.summary, xml: data.xml });
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
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Integrations"
        info="integrations"
        description="The systems a broker already works in: where codes come from, where products live, and where declarations go."
      />

      <Card
        icon={BookOpen}
        title="UK Trade Tariff · HMRC"
        status={tariff ? (tariff.live ? <On>Connected</On> : <Off>Not answering · using saved copy</Off>) : null}
      >
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every code is checked against HMRC&apos;s own tariff through its public API (Open Government Licence, no key needed). These are
          the same endpoints HMRC&apos;s official Trade Tariff MCP server uses for AI assistants.
        </p>
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Classification search", "Ranked candidate codes for a product description", "Step 2 of every line"],
              ["Chapter notes", "The legal exclusions and definitions for each chapter", "Rules a heading in or out"],
              ["Commodity measures", "Hierarchy, duty, VAT, quotas and trade remedies, on any date", "Receipts and the 3-year reclaim"],
              ["Rules of origin", "Preferential rates and the product-specific rule per agreement", "Duty savings on receipts"],
            ].map(([name, what, use]) => (
              <tr key={name} className="border-b border-border last:border-b-0 align-top">
                <td className="w-48 py-2.5 pr-4 font-medium">{name}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{what}</td>
                <td className="hidden py-2.5 text-right text-muted-foreground sm:table-cell">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-2">
          <p className="text-sm font-medium">Try HMRC&apos;s classification search</p>
          <div className="flex gap-2">
            <Input
              placeholder="Describe a product, e.g. bamboo kids' dinner set"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupLive()}
            />
            <Button variant="outline" onClick={lookupLive} disabled={!lookup.trim()}>
              Search
            </Button>
          </div>
        </div>
        {lookupResult && (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {lookupResult.length === 0 && <li className="px-3 py-2 text-muted-foreground">No candidates. Try describing the material and use.</li>}
            {lookupResult.slice(0, 6).map((r) => (
              <li key={r.code} className="flex items-start justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <Code code={r.code} className="text-[13px]" />
                  <span className="block text-xs text-muted-foreground">{r.path}</span>
                </span>
                <a
                  href={`https://www.trade-tariff.service.gov.uk/commodities/${r.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-link hover:underline"
                >
                  Open on the tariff
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Results are a shortlist, not a decision: the top hit is often in the wrong heading, which is why each line is then checked against the
          chapter notes and signed off by you.
        </p>
      </Card>

      <Card
        icon={ShoppingBag}
        title="Shopify · client stores"
        info="shopify"
        status={storeCount > 0 ? <On>{`${storeCount} connected`}</On> : <Off>Not connected</Off>}
      >
        <p className="text-sm text-muted-foreground">
          Each client connects its own store. Approved codes write back as the 6-digit HS code and the 10-digit GB code on the inventory item.
          No live store? Import a Shopify product CSV on the client card.
        </p>
        {shopifySetup && <p className="text-sm text-destructive">{shopifySetup}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${broker}/clients`}>Manage client stores</Link>
          </Button>
          <Button variant="ghost" asChild>
            <a href="/api/sample/shopify-csv">
              <Download /> Sample Shopify CSV
            </a>
          </Button>
        </div>
      </Card>

      <Card icon={FileSpreadsheet} title="Excel and CSV invoices" status={<On>Ready</On>}>
        <p className="text-sm text-muted-foreground">
          Drop the supplier&apos;s commercial invoice straight in on{" "}
          <Link href={`/${broker}/classify`} className="text-primary hover:underline">Classify</Link>. Title rows and totals are skipped, and the
          description, quantity, value and origin columns are found whatever they&apos;re called.
        </p>
        <Button variant="outline" asChild>
          {/* A file download, not a page, so a plain link. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/sample/xlsx"><Download /> Sample Excel invoice</a>
        </Button>
      </Card>

      <Card
        icon={Landmark}
        title="HMRC Customs Declarations (sandbox)"
        info="hmrc"
        status={hmrc?.connected ? <On>Signed in</On> : <Off />}
      >
        <p className="text-sm text-muted-foreground">
          Files a classified invoice as an H1 import declaration (WCO DEC-DMS XML) through HMRC&apos;s Customs Declarations API. Sign in once:
          the app keeps the HMRC sign-in for every broker and refreshes it automatically.
        </p>

        {hmrc && !hmrc.appReady && (
          <p className="text-sm text-destructive">Precedent&apos;s HMRC app isn&apos;t set up on this server (HMRC_CLIENT_ID / HMRC_CLIENT_SECRET in .env.local).</p>
        )}

        {hmrc?.appReady && (
          <>
            {hmrc.testUser && !hmrc.connected && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Sandbox test company{hmrc.testUser.name ? ` · ${hmrc.testUser.name}` : ""}</p>
                <p className="text-muted-foreground">Sign in to HMRC with this test user.</p>
                <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-y-1 font-mono text-xs">
                  <dt className="text-muted-foreground">User ID</dt><dd>{hmrc.testUser.userId}</dd>
                  <dt className="text-muted-foreground">Password</dt><dd>{hmrc.testUser.password}</dd>
                  <dt className="text-muted-foreground">EORI</dt><dd>{hmrc.eori}</dd>
                </dl>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {hmrc.connected ? (
                <>
                  <span className="text-sm">
                    Declaring as <span className="font-mono">{hmrc.eori}</span>
                    {hmrc.testUser?.name && <span className="text-muted-foreground"> · {hmrc.testUser.name}</span>}
                  </span>
                  <Button variant="ghost" size="sm" disabled={!!hmrcBusy} onClick={async () => { const d = await hmrcCall("sign-out"); if (d) setHmrc(d); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    disabled={!!hmrcBusy}
                    onClick={async () => {
                      const d = await hmrcCall("sign-in");
                      if (d?.authorizeUrl) window.location.assign(d.authorizeUrl);
                    }}
                  >
                    {hmrcBusy === "sign-in" && <Loader2 className="animate-spin" />} Sign in with HMRC
                  </Button>
                  {!hmrc.testUser && (
                    <Button variant="outline" disabled={!!hmrcBusy} onClick={async () => { const d = await hmrcCall("test-user"); if (d) setHmrc(d); }}>
                      {hmrcBusy === "test-user" && <Loader2 className="animate-spin" />} Create sandbox test company
                    </Button>
                  )}
                </>
              )}
            </div>

            {batches.length > 0 && (
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
                  <Button variant="outline" disabled={!batchId || !hmrc.eori || !!hmrcBusy} onClick={() => hmrcCall("preview", { batchId })}>
                    Preview declaration
                  </Button>
                  <Button disabled={!batchId || !hmrc.connected || !!hmrcBusy} onClick={async () => { if (await hmrcCall("submit", { batchId })) load(); }}>
                    {hmrcBusy === "submit" && <Loader2 className="animate-spin" />} Submit to HMRC sandbox
                  </Button>
                </div>
                {hmrc.lastSubmission && (
                  <div className={`space-y-1 rounded-md border p-3 text-sm ${hmrc.lastSubmission.status === 202 ? "border-good/30 bg-good/5" : "border-bad/30 bg-bad/5"}`}>
                    <p>
                      Last submission <span className="font-mono">{hmrc.lastSubmission.lrn}</span> ·{" "}
                      <span className={hmrc.lastSubmission.status === 202 ? "text-good" : "text-destructive"}>HTTP {hmrc.lastSubmission.status}</span>
                      {hmrc.lastSubmission.status === 202 && " accepted for processing"}
                      {hmrc.lastSubmission.conversationId && <> · conversation <span className="font-mono text-xs">{hmrc.lastSubmission.conversationId}</span></>}
                    </p>
                    {hmrc.lastSubmission.status === 202 ? (
                      <p className="text-muted-foreground">HMRC has the declaration. CDS checks it next and sends its decision (accepted, cleared, or a query) as a notification.</p>
                    ) : (
                      hmrc.lastSubmission.body && (
                        <>
                          <p className="text-muted-foreground">{hmrcErrorText(hmrc.lastSubmission.body)}</p>
                          <details>
                            <summary className="cursor-pointer text-xs text-muted-foreground">HMRC&apos;s full response</summary>
                            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">{hmrc.lastSubmission.body}</pre>
                          </details>
                        </>
                      )
                    )}
                  </div>
                )}
                {decl && <DeclarationPreview summary={decl.summary} xml={decl.xml} />}
              </div>
            )}
          </>
        )}
        {hmrcError && <p className="text-sm text-destructive">{hmrcError}</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card icon={Download} title="Declaration software" info="export" status={<On>CSV ready</On>}>
          <p className="text-sm text-muted-foreground">
            A CSV with the 10-digit code split into DE 6/14 and DE 6/15. ASM, CargoWise and Descartes can import it.
            Live push into those systems is coming soon.
          </p>
          <Button variant="outline" asChild><Link href={`/${broker}/export`}>Go to Export</Link></Button>
        </Card>
        <Card icon={Cpu} title="Mubit" info="mubit" status={tariff?.mubitKey ? <On>Key present</On> : <Off>No key</Off>}>
          <p className="text-sm text-muted-foreground">
            Every classify call goes through Mubit as this broker&apos;s task. Mubit can train an adapter after about 25 kept examples;
            this app does not observe whether one is trained or live.
          </p>
          <Button variant="outline" asChild><Link href={`/${broker}/mubit`}>See examples sent</Link></Button>
        </Card>
      </div>
    </div>
  );
}
