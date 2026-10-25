"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/mark";
import { Prue } from "@/components/prue";
import { rememberFirm, savedFirm } from "@/components/firm-gate";

type Firm = { id: string; name: string; clients: number; lines: number; pastEntries: number };

// The way in: nothing is chosen for you. Open a firm's desk, or set up your own.
export function StartView() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next") ?? "home";
  const next = /^[a-z-]+$/.test(raw) ? raw : "home";
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the remembered firm once
    if (!params.get("switch")) setLast(savedFirm());
  }, [params]);
  const [firms, setFirms] = useState<Firm[] | null>(null);
  const [name, setName] = useState("");
  const [sample, setSample] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/firms")
      .then((r) => r.json())
      .then(setFirms)
      .catch(() => setFirms([]));
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/firms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, sampleHistory: sample }) });
    const d = await r.json();
    if (!r.ok) {
      setBusy(false);
      return setError(d.error);
    }
    rememberFirm(d.id);
    router.push(`/${d.id}/${next}`);
  }

  const lastFirm = last ? firms?.find((f) => f.id === last) : undefined;
  const demo = (id: string) => ["harbourline", "northgate"].includes(id);

  return (
    <div className="desk grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand side: what this is, said once, with Prue. */}
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#13306b_0%,#1d4ed8_120%)] p-10 text-white lg:flex lg:flex-col">
        <Link href="/" className="w-fit">
          <Wordmark size={26} className="text-white" />
        </Link>
        <div className="mt-auto max-w-md space-y-6">
          <h2 className="font-serif text-[36px] leading-[1.1]">The right commodity code, for every UK import.</h2>
          <ol className="space-y-4">
            {[
              ["Choose your firm", "Or set up your own. Each firm's desk is private."],
              ["Add a client", "The importer you declare for, with their EORI."],
              ["Bring in an invoice", "Excel, CSV or Shopify. Every line is checked against HMRC's live tariff."],
              ["Approve or correct", "Corrections are remembered and taught to your firm's Mubit model."],
              ["Claim back duty", "Re-check 3 years of imports for anything overpaid."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3.5">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${i === 0 ? "bg-white text-[#13306b]" : "border border-white/40 text-white/80"}`}
                >
                  {i + 1}
                </span>
                <span>
                  <span className={`block text-[15.5px] font-medium ${i === 0 ? "text-white" : "text-white/85"}`}>{t}</span>
                  <span className="block text-[14px] leading-snug text-white/65">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-10 flex items-end gap-4">
          <Prue state="hello" size={128} />
          <p className="mb-6 max-w-[15rem] rounded-2xl rounded-bl-sm bg-white/12 px-4 py-3 text-[14px] leading-snug text-white/90 backdrop-blur">
            Hi, I&apos;m Prue. Start with step 1 and I&apos;ll guide you through the rest.
          </p>
        </div>
      </aside>

      {/* Choice side. */}
      <main className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Wordmark size={22} />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to the website
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-xl space-y-8 py-10">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Step 1 of 5</p>
            <h1 className="font-serif text-[38px] leading-[1.08] tracking-[-0.01em]">Which firm are you working for?</h1>
            <p className="text-[16px] leading-relaxed text-muted-foreground">Each firm has its own desk: its own clients, corrections and Mubit learning. Nothing is shared.</p>
          </div>

          {params.get("reset") && (
            <p className="rounded-lg border border-good/30 bg-good/[0.06] px-4 py-3 text-sm">
              Demo data cleared. Pick a firm to start fresh, or{" "}
              <Link href="/start?next=tour" className="font-medium text-primary hover:underline">
                take the product tour
              </Link>{" "}
              first.
            </p>
          )}

          {lastFirm && (
            <Link
              href={`/${lastFirm.id}/${next}`}
              className="flex items-center justify-between gap-4 rounded-xl bg-primary px-5 py-4 text-primary-foreground transition-opacity hover:opacity-95"
            >
              <span>
                <span className="block text-[13px] text-primary-foreground/75">Welcome back</span>
                <span className="block text-[17px] font-medium">Continue as {lastFirm.name}</span>
              </span>
              <ArrowRight className="size-5" />
            </Link>
          )}

          <section className="space-y-2.5">
            <h2 className="text-sm font-medium text-muted-foreground">{lastFirm ? "Or open another firm" : "Open a firm"}</h2>
            {firms === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {firms?.map((f) => (
                <Link
                  key={f.id}
                  href={`/${f.id}/${next}`}
                  onClick={() => rememberFirm(f.id)}
                  className="group flex items-center gap-3.5 border-b border-border/70 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-accent/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[14px] font-semibold text-primary">{f.name[0].toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      {f.name}
                      {demo(f.id) && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">Demo</span>}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {f.clients} client{f.clients === 1 ? "" : "s"} · {f.pastEntries} past imports
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-5">
            <h2 className="flex items-center gap-2 text-[17px] font-medium">
              <Plus className="size-4 text-primary" /> Set up a new firm
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Firm name"
                placeholder="Your firm's name, e.g. Thames Gateway Customs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && create()}
                className="bg-card"
              />
              <Button disabled={!name.trim() || busy} onClick={create} className="shrink-0">
                {busy ? <Loader2 className="animate-spin" /> : <Building2 />} Create and open
              </Button>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-muted-foreground">
              <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>Include 3 years of sample imports, so the duty reclaim check has something to find. They&apos;re marked as sample data.</span>
            </label>
            {error && <p className="text-sm text-bad">{error}</p>}
          </section>

          {next === "tour" && (
            <p className="text-sm text-muted-foreground">Pick a firm and the product tour starts straight away.</p>
          )}
        </div>
      </main>
    </div>
  );
}
