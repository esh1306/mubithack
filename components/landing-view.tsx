"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpenCheck, FileInput, Landmark, PenLine, RotateCcw, type LucideIcon } from "lucide-react";
import { DEMO_HREF, DESK_HREF } from "@/components/site-nav";
import { MubitShowcase } from "@/components/mubit-showcase";
import { AuroraField } from "@/components/bits/aurora-field";
import { TiltCard } from "@/components/bits/tilt-card";
import { ConnectorLogo, CONNECTORS, type ConnectorId } from "@/components/connector-logos";
import { gsap, registerLandingMotion, ScrollTrigger, SplitText } from "@/components/landing-motion";
import { JOURNEY_STEPS } from "@/lib/landing-steps";
import type { EarthApi } from "@/components/earth-globe";

const EarthGlobe = dynamic(() => import("@/components/earth-globe"), {
  ssr: false,
  loading: () => null,
});

const TARIFF = "https://www.trade-tariff.service.gov.uk";

const STEP_ICON: Record<(typeof JOURNEY_STEPS)[number]["icon"], LucideIcon> = {
  invoice: FileInput,
  tariff: BookOpenCheck,
  signoff: PenLine,
  declare: Landmark,
  reclaim: RotateCcw,
};

function BrandBar() {
  return (
    <div className="relative z-40 mx-auto flex w-full max-w-[86rem] items-center justify-between gap-4 px-5 pt-6 sm:px-8 lg:px-10">
      <Link href="/" className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b1f4d]">
        <span className="leading-none">
          <span className="block font-[family-name:var(--font-ruling)] text-[26px] font-bold tracking-[-0.015em] text-[#0b1f4d]">Precedent</span>
          <span className="mt-1 block text-[12px] font-medium text-[#1e3a6e]">Customs classification for UK brokers</span>
        </span>
      </Link>
      <Link href={DESK_HREF} className="text-[14px] font-medium text-[#1e3a6e] hover:text-[#0b1f4d]">
        Open the desk
      </Link>
    </div>
  );
}

function Headline() {
  const ref = useRef<HTMLSpanElement>(null);
  const accent = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    registerLandingMotion();
    try {
      const split = SplitText.create(el, { type: "chars,words" });
      for (const node of el.querySelectorAll("*")) {
        (node as HTMLElement).style.overflow = "visible";
      }
      const tw = gsap.from(split.chars, { y: 14, opacity: 0, duration: 0.5, stagger: 0.012, ease: "power3.out" });
      /* The gradient line can't be split per-char without losing background-clip:text */
      const tw2 = gsap.from(accent.current, { y: 28, opacity: 0, filter: "blur(10px)", duration: 0.9, delay: 0.25, ease: "power3.out" });
      return () => {
        tw.revert();
        tw2.revert();
        split.revert();
      };
    } catch {
      return undefined;
    }
  }, []);

  return (
    <div className="max-w-xl">
      <h1 className="landing-display landing-hero-title overflow-visible">
        <span ref={ref}>The right commodity code.</span>
        <br />
        <span ref={accent} className="landing-hero-accent">
          Every UK import.
        </span>
      </h1>
      <p className="landing-lede mt-6 max-w-lg">
        Precedent classifies each product on your client&apos;s invoice against HMRC&apos;s UK Trade Tariff and its legal notes, shows the
        reasoning in a record you sign, and remembers every correction your team makes. Then it finds the duty overpaid in the last three
        years.
      </p>
      <ul className="landing-chips">
        <li>Checked against HMRC&apos;s tariff</li>
        <li>You sign every code</li>
        <li>3-year duty reclaim</li>
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href={DEMO_HREF} className="landing-cta landing-cta-primary">
          Try the demo
        </Link>
        <Link href="#journey" className="landing-cta landing-cta-ghost">
          See how it works
        </Link>
      </div>
    </div>
  );
}

// The customs artefact the product produces, shown on the hero so the page says "customs" at a glance.
function RecordCard() {
  return (
    <figure className="record-card" aria-label="Example classification record">
      <div className="flex items-baseline justify-between gap-3 border-b border-[#0b1f4d]/12 pb-2 text-[11px] text-[#4a5872]">
        <span>Classification record</span>
        <span className="font-[family-name:var(--font-plex-mono)]">PRC-HAR-000214</span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-ruling)] text-[17px] font-semibold leading-snug text-[#0e1a2f]">
            Bamboo kids&apos; dinner set, plate bowl cup
          </p>
          <p className="mt-0.5 text-[12px] text-[#4a5872]">Origin China · customs value £4,800</p>
        </div>
        <div className="record-seal" aria-hidden>
          <span>Signed off</span>
        </div>
      </div>
      <p className="mt-3 font-[family-name:var(--font-plex-mono)] text-[22px] font-semibold tracking-[0.02em] text-[#0e1a2f]">
        3924 <span className="font-normal text-[#4a5872]">10 00 11</span>
      </p>
      <p className="text-[12px] text-[#4a5872]">Plastics › Tableware and kitchenware › Other</p>
      <dl className="mt-3 grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1.5 text-[12px]">
        <dt className="text-[#4a5872]">Rule</dt>
        <dd className="text-[#0e1a2f]">GIR 3(b): the melamine resin gives the set its essential character</dd>
        <dt className="text-[#4a5872]">Ruled out</dt>
        <dd className="text-[#0e1a2f]">
          <span className="font-[family-name:var(--font-plex-mono)]">4419 19 00 00</span> bamboo tableware, 0%
        </dd>
        <dt className="text-[#4a5872]">Duty</dt>
        <dd className="text-[#0e1a2f]">6.00% · £288.00, plus import VAT at 20%</dd>
      </dl>
      <figcaption className="mt-3 border-t border-[#0b1f4d]/12 pt-2 text-[11px] text-[#4a5872]">Source: UK Trade Tariff, HMRC</figcaption>
    </figure>
  );
}

const WHY = [
  {
    title: "One code, a different bill",
    body: "The same bamboo dinner set is 0% duty as bamboo tableware (4419 19 00 00) and 6% as melamine tableware from China (3924 10 00 11). The legal notes decide which is right.",
    source: { label: "UK Trade Tariff", href: `${TARIFF}/commodities/3924100011` },
  },
  {
    title: "Overpay, and the clock runs",
    body: "Overpaid import duty can be reclaimed, but only within three years of the debt being notified. After that it is gone.",
    source: { label: "Reg 59, S.I. 2018/1248", href: "https://www.legislation.gov.uk/uksi/2018/1248/regulation/59" },
  },
  {
    title: "Underpay, and HMRC sends the bill",
    body: "Underpaid duty is recovered with a post-clearance demand, and an inaccurate declaration can draw a customs civil penalty.",
    source: { label: "HMRC customs civil penalties", href: "https://www.gov.uk/government/publications/customs-civil-penalties" },
  },
  {
    title: "The broker can be liable too",
    body: "A customs agent acting as an indirect representative is jointly liable for the duty. Showing reasonable care is the broker's best protection.",
    source: { label: "HMRC customs debt liability", href: "https://www.gov.uk/guidance/customs-debt-liability" },
  },
];

const IMPACT = [
  { value: "£384", tone: "text-[#15803d]", label: "Overpaid duty to claim back", body: "LED bulbs declared as light fittings at 4% are LED lamps at 0% on HMRC's tariff. Five past imports, still inside the 3-year window." },
  { value: "£766", tone: "text-[#b91c1c]", label: "Underpayment caught", body: "Melamine \"bamboo\" tableware declared at 0% should pay 6%. Caught on this invoice and disclosed for past ones, before an audit." },
  { value: "£576", tone: "text-[#15803d]", label: "Saved with a trade preference", body: "Cotton T-shirts made in Bangladesh pay 0% instead of 12% under the Developing Countries Trading Scheme, with proof of origin." },
];

const AUDIENCE = [
  { who: "For the broker", points: ["Invoice to signed codes in minutes", "Corrections remembered for every client", "An evidence trail that shows reasonable care"] },
  { who: "For the importer", points: ["Overpaid duty found and claimed back", "No surprise demand from HMRC", "Trade preferences used when goods qualify"] },
  { who: "For HMRC and customs", points: ["Codes taken from HMRC's own tariff", "Every line arrives with its reason and legal note", "Underpayments disclosed, not discovered"] },
];

const CONNECTOR_FLOW: { title: string; items: ConnectorId[] }[] = [
  { title: "Goods come in from", items: ["shopify", "excel", "csv"] },
  { title: "Every code is checked against", items: ["tariff", "mubit"] },
  { title: "Signed codes go out to", items: ["cds", "software"] },
];

function Footer() {
  return (
    <footer className="border-t border-[#0b1f4d]/10 px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[86rem] flex-wrap items-start justify-between gap-8">
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-ruling)] text-[18px] font-semibold text-[#0b1f4d]">Precedent</span>
        </div>
        <div className="max-w-2xl space-y-2 text-[12px] leading-relaxed text-[#3b4f7a]">
          <p>
            Tariff data from the UK Trade Tariff, © Crown copyright, used under the{" "}
            <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Open Government Licence v3.0
            </a>
            . Precedent is an independent product and is not affiliated with or endorsed by HMRC.
          </p>
          <p>Globe land outlines: Natural Earth via world-atlas (public domain). Rendering: three.js (MIT).</p>
        </div>
      </div>
    </footer>
  );
}

export function LandingView() {
  const hero = useRef<HTMLElement>(null);
  const earth = useRef<EarthApi | null>(null);
  const [reduce, setReduce] = useState(false);
  const [mobile, setMobile] = useState(false);

  /* Stable callbacks so the globe's WebGL scene isn't rebuilt on every render */
  const onGlobeApi = useCallback((api: EarthApi) => {
    earth.current = api;
  }, []);
  const onGlobeReady = useCallback(() => {
    registerLandingMotion();
    ScrollTrigger.refresh();
  }, []);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)");
    const n = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      setReduce(r.matches);
      setMobile(n.matches);
    };
    apply();
    r.addEventListener("change", apply);
    n.addEventListener("change", apply);
    return () => {
      r.removeEventListener("change", apply);
      n.removeEventListener("change", apply);
    };
  }, []);

  /* 3D tilt of the globe toward the pointer */
  useEffect(() => {
    const heroEl = hero.current;
    if (!heroEl || reduce) return;
    const slot = heroEl.querySelector<HTMLElement>(".globe-slot");
    if (!slot) return;
    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5,
        y = e.clientY / window.innerHeight - 0.5;
      slot.style.setProperty("--tilt-x", `${(-y * 14).toFixed(2)}deg`);
      slot.style.setProperty("--tilt-y", `${(x * 18).toFixed(2)}deg`);
    };
    heroEl.addEventListener("pointermove", onMove, { passive: true });
    return () => heroEl.removeEventListener("pointermove", onMove);
  }, [reduce]);

  /* Globe parallax on hero scroll */
  useEffect(() => {
    registerLandingMotion();
    const heroEl = hero.current;
    const triggers: ScrollTrigger[] = [];
    if (heroEl) {
      triggers.push(
        ScrollTrigger.create({
          trigger: heroEl,
          start: "top top",
          end: "bottom top",
          scrub: 0.45,
          onUpdate: (self) => earth.current?.setProgress(self.progress),
        }),
      );
    }
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    requestAnimationFrame(refresh);
    return () => {
      window.removeEventListener("load", refresh);
      for (const st of triggers) st.kill();
    };
  }, []);

  /* Vertical journey step reveal */
  useEffect(() => {
    registerLandingMotion();
    const steps = document.querySelectorAll<HTMLElement>("[data-journey-step]");
    if (reduce || steps.length === 0) {
      steps.forEach((s) => {
        s.style.opacity = "1";
        s.style.transform = "none";
      });
      return;
    }
    const tweens: gsap.core.Tween[] = [];
    steps.forEach((step) => {
      gsap.set(step, { opacity: 0, y: 36 });
      tweens.push(
        gsap.to(step, {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: "power3.out",
          scrollTrigger: { trigger: step, start: "top 88%", toggleActions: "play none none none" },
        }),
      );
    });
    return () => tweens.forEach((tw) => tw.revert());
  }, [reduce]);

  return (
    <div className="landing">
      <AuroraField reduced={reduce} className="landing-bg" />

      {/* ─── Hero ─── */}
      <section ref={hero} className="landing-hero relative flex min-h-[100svh] flex-col">
        <BrandBar />
        <div className="relative mx-auto grid w-full max-w-[86rem] flex-1 items-center gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-10">
          <div className="relative z-30">
            <Headline />
          </div>
          <div className="relative flex flex-col items-center justify-center">
            <div className="globe-slot">
              <EarthGlobe mobile={mobile} reduced={reduce} onApi={onGlobeApi} onReady={onGlobeReady} />
            </div>
            <div className="record-anchor">
              <RecordCard />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why the code matters ─── */}
      <section className="relative z-20 border-t border-[#0b1f4d]/10">
        <div className="mx-auto max-w-[86rem] px-5 py-20 sm:px-8 lg:px-10">
          <h2 className="landing-display landing-section-title overflow-visible">Why the code matters.</h2>
          <p className="mt-3 max-w-2xl text-[16px] font-medium leading-relaxed text-[#1e3a6e]">
            A commodity code is a legal choice with money attached. It sets the duty, the VAT base, the trade-deal preference and who is
            liable when it is wrong.
          </p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[#0b1f4d]/10 bg-[#0b1f4d]/10 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <article key={w.title} className="flex flex-col bg-white/75 p-6 backdrop-blur-md">
                <h3 className="font-[family-name:var(--font-ruling)] text-[20px] font-semibold leading-snug text-[#0b1f4d]">{w.title}</h3>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[#1e3a6e]">{w.body}</p>
                <a href={w.source.href} target="_blank" rel="noreferrer" className="mt-4 text-[12px] font-medium text-[#1d4ed8] hover:underline">
                  Source: {w.source.label}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Impact ─── */}
      <section className="relative z-20 border-t border-[#0b1f4d]/10">
        <div className="mx-auto max-w-[86rem] px-5 py-20 sm:px-8 lg:px-10">
          <h2 className="landing-display landing-section-title overflow-visible">What one shipment finds.</h2>
          <p className="mt-3 max-w-2xl text-[16px] font-medium leading-relaxed text-[#1e3a6e]">
            One six-line invoice from Ningbo and Dhaka, run through Precedent against HMRC&apos;s live tariff and three years of the same
            broker&apos;s past imports.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {IMPACT.map((m) => (
              <article key={m.label} className="rounded-xl border border-[#0b1f4d]/10 bg-white/80 p-6 backdrop-blur-md">
                <p className={`font-[family-name:var(--font-ruling)] text-[44px] font-semibold leading-none tabular-nums ${m.tone}`}>{m.value}</p>
                <p className="mt-3 text-[15px] font-semibold text-[#0b1f4d]">{m.label}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#1e3a6e]">{m.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {AUDIENCE.map((a) => (
              <article key={a.who} className="rounded-xl border border-[#0b1f4d]/10 bg-white/60 p-6 backdrop-blur-md">
                <h3 className="font-[family-name:var(--font-ruling)] text-[20px] font-semibold text-[#0b1f4d]">{a.who}</h3>
                <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-[#1e3a6e]">
                  {a.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#c2362b]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Journey ─── */}
      <section id="journey" className="relative z-20 border-t border-[#0b1f4d]/10">
        <div className="mx-auto grid max-w-[86rem] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-10 lg:py-28">
          <div className="lg:sticky lg:top-16 lg:self-start">
            <h2 className="landing-display landing-section-title max-w-[12ch] overflow-visible">From invoice to border.</h2>
            <p className="mt-3 max-w-md text-[16px] font-medium leading-relaxed text-[#1e3a6e]">
              The same five steps a UK customs broker already follows, with the tariff work done and every decision on record.
            </p>
          </div>

          <div className="journey-timeline">
            {JOURNEY_STEPS.map((s) => {
              const Icon = STEP_ICON[s.icon];
              return (
                <div key={s.id} className="journey-step" data-journey-step>
                  <div className="journey-marker">
                    <span>{s.n}</span>
                  </div>
                  <TiltCard className="journey-card">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[#4338ca]">
                      <Icon className="size-4" aria-hidden />
                      {s.place}
                    </div>
                    <h3 className="mt-2 font-[family-name:var(--font-ruling)] text-[22px] font-semibold leading-tight text-[#0b1f4d]">{s.title}</h3>
                    <p className="mt-1 text-[13px] font-semibold text-[#c2362b]">{s.label}</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#1e3a6e]">{s.body}</p>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <MubitShowcase />

      {/* ─── Built on ─── */}
      <section className="relative z-20 border-t border-[#0b1f4d]/10">
        <div className="mx-auto max-w-[86rem] px-5 py-20 sm:px-8 lg:px-10">
          <h2 className="landing-display landing-section-title overflow-visible">Plugs into what you already use.</h2>
          <p className="mt-3 max-w-2xl text-[16px] font-medium leading-relaxed text-[#1e3a6e]">
            Goods come in from your clients&apos; systems, every code is checked against HMRC&apos;s own tariff and your firm&apos;s memory, and
            signed codes go out to the declaration. Names are for orientation, not a partnership.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {CONNECTOR_FLOW.map((col, i) => (
              <div key={col.title} className="relative space-y-3">
                <p className="text-[13px] font-semibold text-[#4338ca]">{col.title}</p>
                {col.items.map((id) => (
                  <div key={id} className="flex items-start gap-3.5 rounded-xl border border-[#0b1f4d]/10 bg-white/80 p-4 backdrop-blur-md">
                    <ConnectorLogo id={id} size={44} />
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-ruling)] text-[18px] font-semibold leading-tight text-[#0b1f4d]">{CONNECTORS[id].name}</p>
                      <p className="mt-1 text-[13px] leading-snug text-[#1e3a6e]">{CONNECTORS[id].what}</p>
                    </div>
                  </div>
                ))}
                {i < CONNECTOR_FLOW.length - 1 && <span className="connector-arrow" aria-hidden />}
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href={DEMO_HREF} className="landing-cta landing-cta-primary">
              Try the demo
            </Link>
            <Link href={DESK_HREF} className="landing-cta landing-cta-ghost">
              Open the desk
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
