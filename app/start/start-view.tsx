"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/mark";
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

  return (
    <div className="desk min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/">
          <Wordmark size={22} />
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to the website
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10">
        <h1 className="font-serif text-[44px] leading-[1.05] tracking-[-0.015em]">Which firm are you working for?</h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Each customs firm gets its own desk: its own clients, its own corrections and its own learning in Mubit. Nothing is shared between firms.
        </p>

        {last && firms?.some((f) => f.id === last) && (
          <Link
            href={`/${last}/${next}`}
            className="mt-8 flex items-center justify-between gap-4 rounded-xl border-2 border-primary/30 bg-primary/[0.04] p-5 transition-colors hover:border-primary/60"
          >
            <span>
              <span className="block text-sm text-muted-foreground">Welcome back</span>
              <span className="block font-serif text-[22px]">Continue as {firms.find((f) => f.id === last)!.name}</span>
            </span>
            <ArrowRight className="size-5 text-primary" />
          </Link>
        )}

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Open an existing firm</h2>
            {firms === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {firms?.map((f) => (
              <Link
                key={f.id}
                href={`/${f.id}/${next}`}
                onClick={() => rememberFirm(f.id)}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[0_8px_24px_-16px_rgba(19,48,107,0.5)]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-[16px] font-semibold text-primary-foreground">{f.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{f.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {f.clients} client{f.clients === 1 ? "" : "s"} · {f.pastEntries} past imports on file
                    {["harbourline", "northgate"].includes(f.id) && " · demo firm"}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </section>

          <section className="rounded-xl border-2 border-primary/25 bg-card p-5">
            <h2 className="flex items-center gap-2 font-serif text-[22px]">
              <Plus className="size-5 text-primary" /> Set up your firm
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Starts empty. Add your clients and your first invoice from there.</p>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Firm name</span>
                <Input placeholder="e.g. Thames Gateway Customs Ltd" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && create()} />
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-sm">
                <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
                <span>
                  <span className="font-medium">Add 3 years of sample imports</span>
                  <span className="block text-muted-foreground">So the duty reclaim check has something to find. Clearly marked as sample data.</span>
                </span>
              </label>
              {error && <p className="text-sm text-bad">{error}</p>}
              <Button className="w-full" disabled={!name.trim() || busy} onClick={create}>
                {busy ? <Loader2 className="animate-spin" /> : <Building2 />} Create firm and open the desk
              </Button>
            </div>
          </section>
        </div>

        {next === "tour" && (
          <p className="mt-8 rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm">
            Pick a firm and the product tour starts straight away. A demo firm already has 3 years of imports for the duty check.
          </p>
        )}
      </main>
    </div>
  );
}
