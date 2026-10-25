"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, PencilLine } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Code } from "@/components/code";
import { Button } from "@/components/ui/button";
import { FixForm } from "@/components/fix-form";
import { ProcessLog } from "@/components/process-log";
import { parseCalls, pretty } from "@/lib/steps";
import { cn } from "@/lib/utils";

export type Suggestion = {
  id: number;
  code: string;
  reason: string;
  confidence: number;
  flagged: boolean;
  question: string | null;
  status: string;
  precedentId: number | null;
  mubitRequestId: string | null; // JSON array of mreq_ ids
  model: string;
  toolCalls: string; // JSON array of { tool, input, output }
  createdAt?: string;
};

type Precedent = { id: number; lineText: string; oldCode: string; newCode: string; reason: string };

type TariffInfo = {
  code: string;
  source: "live" | "local";
  pathParts: string[];
  declarable: boolean;
  dutyRate: string | null;
  vat: string | null;
  flags: string[];
  url: string;
  origin: string | null;
  preference: { rate: string; scheme: string } | null;
  rules: { scheme: string; rule: string; proofs: string[] }[];
  amounts: { value: number; duty: number; dutyWithPreference: number | null; vat: number | null } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
const ATAR_URL = "https://www.gov.uk/guidance/apply-for-an-advance-tariff-ruling";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border py-6 sm:grid-cols-[2.25rem_1fr]">
      <span className="font-serif text-lg text-muted-foreground tabular-nums">{n}.</span>
      <div className="min-w-0 space-y-3">
        <h3 className="font-serif text-[19px] leading-tight">{title}</h3>
        {children}
      </div>
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px]">{children}</dd>
    </div>
  );
}

// The signed-off seal: the one decorative element in the workspace, used only when a person has signed.
function Seal({ status, date }: { status: string; date?: string }) {
  const signed = status === "approved" || status === "corrected";
  if (!signed)
    return (
      <div className="flex size-[92px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-input text-center text-[11px] leading-tight text-muted-foreground">
        Awaiting
        <br />
        sign-off
      </div>
    );
  return (
    <div className="relative flex size-[92px] shrink-0 -rotate-6 items-center justify-center rounded-full border-[2.5px] border-brand text-brand">
      <span className="absolute inset-[5px] rounded-full border border-brand/60" />
      <span className="text-center font-serif leading-none">
        <span className="block text-[13px] font-semibold">{status === "corrected" ? "Corrected" : "Signed off"}</span>
        <span className="mt-1 block text-[10px]">{date ?? "by broker"}</span>
      </span>
    </div>
  );
}

export function ReceiptSheet({
  row,
  broker,
  preferredCode,
  defaultReason,
  onClose,
  onFix,
  onApprove,
}: {
  row: { text: string; suggestion?: Suggestion; origin?: string | null; value?: number | null; qty?: number | null } | null;
  broker?: string;
  preferredCode?: string;
  defaultReason?: string;
  onClose: () => void;
  onFix: (suggestion: Suggestion, code: string, reason: string) => void;
  onApprove: (suggestion: Suggestion) => void;
}) {
  const s = row?.suggestion;
  const code = s?.code;
  const [fixing, setFixing] = useState(false);
  const [tariff, setTariff] = useState<TariffInfo | null>(null);
  const [precedent, setPrecedent] = useState<Precedent | null>(null);

  const origin = row?.origin ?? "";
  const value = row?.value ?? "";
  useEffect(() => {
    if (!code) return;
    const q = new URLSearchParams();
    if (origin) q.set("origin", origin);
    if (value) q.set("value", String(value));
    fetch(`/api/tariff/${code}?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setTariff);
  }, [code, origin, value]);
  useEffect(() => {
    if (!broker || !s?.precedentId) {
      setPrecedent(null);
      return;
    }
    fetch(`/api/${broker}/precedents`)
      .then((r) => r.json())
      .then((list: Precedent[]) => setPrecedent(list.find((p) => p.id === s.precedentId) ?? null));
  }, [broker, s?.precedentId]);

  // Only show tariff details that belong to the code on screen.
  const info = tariff?.code === code ? tariff : null;
  const calls = parseCalls(s?.toolCalls);
  const decision = calls.find((c) => c.tool === "decision")?.output as Any;
  const shortlist = (calls.find((c) => c.tool === "hmrc_classification_search")?.output as Any)?.candidates as Any[] | undefined;
  const rejected = new Map<string, string>(((decision?.rejected ?? []) as Any[]).map((r) => [String(r.code).replace(/\D/g, ""), r.why]));
  const mreqs: string[] = s?.mubitRequestId ? JSON.parse(s.mubitRequestId) : [];
  const decided = s?.createdAt ? new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined;
  const reference = s ? `PRC-${(broker ?? "x").slice(0, 3).toUpperCase()}-${String(s.id).padStart(6, "0")}` : "";
  const basisBy =
    s?.model === "broker" ? "Set by your team" : s?.model === "precedent" ? "Applied from your precedent" : s?.model === "hmrc-search" ? "HMRC search only, not reasoned" : "AI-assisted, for broker review";

  return (
    <Sheet
      open={!!s}
      onOpenChange={(o) => {
        if (!o) {
          setFixing(false);
          onClose();
        }
      }}
    >
      <SheetContent className="overflow-y-auto bg-card data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {s && (
          <>
            <SheetHeader className="gap-4 border-b-4 border-double border-border px-8 pb-6 pt-8">
              <SheetDescription className="flex flex-wrap items-baseline justify-between gap-x-4 text-[13px]">
                <span>Classification record</span>
                <span className="font-mono">{reference}</span>
              </SheetDescription>
              <div className="flex items-start justify-between gap-6">
                <SheetTitle className="font-serif text-[28px] leading-tight">{row!.text}</SheetTitle>
                <Seal status={s.status} date={decided} />
              </div>
            </SheetHeader>

            <div className="px-8 pb-10">
              <Section n={1} title="The goods">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label="Description as invoiced" className="col-span-2 sm:col-span-3">
                    {row!.text}
                  </Field>
                  <Field label="Country of origin">{origin || "Not on the invoice"}</Field>
                  <Field label="Customs value">{row!.value ? gbp(row!.value) : "Not on the invoice"}</Field>
                  <Field label="Quantity">{row!.qty ?? "Not on the invoice"}</Field>
                </dl>
              </Section>

              <Section n={2} title="Classification">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <Code code={s.code} className="text-[26px]" />
                  {info && <span className="text-sm text-muted-foreground">{info.declarable ? "Declarable 10-digit import code" : "Not a declarable code"}</span>}
                </div>
                {info ? (
                  <ol className="space-y-1 text-sm">
                    {info.pathParts.map((p, i) => (
                      <li key={i} className={cn("border-l-2 border-border py-0.5 pl-3", i === info.pathParts.length - 1 && "border-primary font-medium")} style={{ marginLeft: `${i * 0.85}rem` }}>
                        {p}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading the tariff hierarchy…</p>
                )}
                {info && (
                  <a href={info.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-link hover:underline">
                    View {pretty(s.code)} on the UK Trade Tariff <ExternalLink className="size-3.5" />
                  </a>
                )}
              </Section>

              <Section n={3} title="Basis for the decision">
                <p className="text-[15px] leading-relaxed">{s.reason}</p>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {decision?.rule && <Field label="Rule applied">{decision.rule}</Field>}
                  {(decision?.notesCited ?? []).length > 0 && <Field label="Legal notes relied on">{(decision.notesCited as string[]).join("; ")}</Field>}
                  <Field label="Decided by">{basisBy}</Field>
                  {s.model !== "broker" && s.model !== "precedent" && s.model !== "hmrc-search" && <Field label="Model confidence">{Math.round(s.confidence * 100)}%</Field>}
                </dl>
                {precedent && (
                  <blockquote className="border-l-2 border-brand pl-4">
                    <p className="text-xs text-muted-foreground">Your precedent #{precedent.id} · {precedent.lineText}</p>
                    <p className="mt-1 font-serif text-[16px] italic leading-snug">“{precedent.reason}”</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {pretty(precedent.oldCode)} corrected to {pretty(precedent.newCode)}
                    </p>
                  </blockquote>
                )}
                {s.question && s.status === "pending" && (
                  <p className="rounded-md bg-[#fdf3e3] px-3 py-2 text-sm">
                    <span className="font-medium text-warn">Open question for the importer: </span>
                    {s.question}
                  </p>
                )}
              </Section>

              {shortlist && shortlist.length > 0 && (
                <Section n={4} title="Codes considered">
                  <table className="w-full text-sm">
                    <tbody>
                      {shortlist.slice(0, 6).map((c) => {
                        const chosen = c.code === s.code.replace(/\D/g, "");
                        const why = rejected.get(c.code);
                        return (
                          <tr key={c.code} className="border-b border-border last:border-b-0 align-top">
                            <td className="w-32 py-2 pr-3">
                              <Code code={c.code} className={cn("text-[13px]", chosen && "font-semibold")} />
                            </td>
                            <td className="py-2">
                              <span className={cn(!chosen && "text-muted-foreground")}>{c.description}</span>
                              {why && <span className="mt-0.5 block text-xs text-bad">Ruled out: {why}</span>}
                            </td>
                            <td className="w-20 py-2 text-right text-xs">{chosen ? <span className="font-medium text-good">Chosen</span> : null}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-xs text-muted-foreground">Shortlist from HMRC&apos;s UK Trade Tariff classification search, in its ranked order.</p>
                </Section>
              )}

              <Section n={shortlist?.length ? 5 : 4} title="Duty and VAT">
                {info ? (
                  <>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <Field label="Third-country duty">{info.dutyRate ?? "Not ad valorem"}</Field>
                      <Field label="Import VAT">{info.vat ?? "20.00%"}</Field>
                      <Field label={origin ? `Preference for ${origin}` : "Preference"}>
                        {info.preference ? `${info.preference.rate} under ${info.preference.scheme}` : origin ? "None for this origin" : "Origin needed"}
                      </Field>
                    </dl>
                    {info.amounts && (
                      <table className="w-full max-w-md text-sm">
                        <tbody className="[&_td]:py-1.5">
                          <tr className="border-b border-border"><td>Customs value</td><td className="text-right tabular-nums">{gbp(info.amounts.value)}</td></tr>
                          <tr className="border-b border-border"><td>Duty at {info.dutyRate}</td><td className="text-right tabular-nums">{gbp(info.amounts.duty)}</td></tr>
                          {info.amounts.dutyWithPreference !== null && (
                            <tr className="border-b border-border text-good"><td>Duty with preference proof</td><td className="text-right tabular-nums">{gbp(info.amounts.dutyWithPreference)}</td></tr>
                          )}
                          {info.amounts.vat !== null && <tr><td>Import VAT on value plus duty</td><td className="text-right tabular-nums">{gbp(info.amounts.vat)}</td></tr>}
                        </tbody>
                      </table>
                    )}
                    {info.flags.map((f) => (
                      <p key={f} className="text-sm text-warn">{f}</p>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Rates from the UK Trade Tariff{info.source === "local" ? " (local copy; live service unavailable)" : ", today"}. The VAT base on a real entry also includes freight and insurance to the UK border.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading rates…</p>
                )}
              </Section>

              {info && info.rules.length > 0 && (
                <Section n={shortlist?.length ? 6 : 5} title="Rules of origin">
                  <p className="text-sm text-muted-foreground">The preferential rate only applies if the goods meet the product-specific rule and the importer holds proof.</p>
                  <ul className="space-y-4">
                    {info.rules.map((r) => (
                      <li key={r.scheme} className="space-y-1">
                        <p className="font-medium">{r.scheme}</p>
                        <p className="text-sm leading-relaxed">{r.rule || "See the scheme's product-specific rules."}</p>
                        {r.proofs.length > 0 && <p className="text-xs text-muted-foreground">Proof accepted: {r.proofs.join(", ")}</p>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section n={(shortlist?.length ? 6 : 5) + (info?.rules.length ? 1 : 0)} title="Evidence trail">
                {calls.length ? <ProcessLog calls={calls} /> : <p className="text-sm text-muted-foreground">Set by your team; no automated steps.</p>}
                {mreqs.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Model calls recorded by Mubit: <span className="font-mono">{mreqs.join(", ")}</span>
                  </p>
                )}
              </Section>

              <section className="space-y-4 border-t-4 border-double border-border pt-6">
                {fixing ? (
                  <div className="rounded-lg border border-border p-4">
                    <FixForm
                      currentCode={s.code}
                      toolCalls={s.toolCalls}
                      preferredCode={preferredCode}
                      defaultReason={defaultReason}
                      onCancel={() => setFixing(false)}
                      onSubmit={(newCode, reason) => {
                        setFixing(false);
                        onFix(s, newCode, reason);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {s.status === "pending" && (
                      <Button onClick={() => onApprove(s)}>
                        <Check /> Sign off this code
                      </Button>
                    )}
                    {s.status !== "corrected" && (
                      <Button variant="outline" onClick={() => setFixing(true)}>
                        <PencilLine /> Correct the code
                      </Button>
                    )}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This record documents reasonable care in classifying the goods. It is not a binding HMRC decision. For legal certainty on a
                  product you import often, the importer can{" "}
                  <a href={ATAR_URL} target="_blank" rel="noreferrer" className="text-link hover:underline">
                    apply for an Advance Tariff Ruling
                  </a>
                  .
                </p>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
