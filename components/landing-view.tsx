"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpenCheck, FileInput, Landmark, PenLine, RotateCcw, type LucideIcon } from "lucide-react";
import { DEMO_HREF, DESK_HREF } from "@/components/site-nav";
import { MubitShowcase } from "@/components/mubit-showcase";
import { CustomsScene } from "@/components/customs-scene";
import { AuroraField } from "@/components/bits/aurora-field";
import { TiltCard } from "@/components/bits/tilt-card";
import { ConnectorLogo, type ConnectorId } from "@/components/connector-logos";
import { EndToEndFlow } from "@/components/landing-flow";
import { gsap, registerLandingMotion, ScrollTrigger, SplitText } from "@/components/landing-motion";
import { ProblemBand, RoiBlock } from "@/components/landing-stats";
import { JOURNEY_STEPS } from "@/lib/landing-steps";
import { LOOKBACK_YEARS } from "@/lib/landing-stats";
import { MANUAL_MIN_PER_LINE, REVIEW_MIN_PER_LINE } from "@/lib/savings";
import type { EarthApi } from "@/components/earth-globe";

const EarthGlobe = dynamic(() => import("@/components/earth-globe"), {
  ssr: false,
  loading: () => null,
});

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

function HeroLogos({ ids }: { ids: ConnectorId[] }) {
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {ids.map((id) => (
        <ConnectorLogo key={id} id={id} size={26} className="ring-2 ring-white" />
      ))}
    </span>
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
        <span ref={ref}>Stop coding invoices by hand.</span>
        <br />
        <span ref={accent} className="landing-hero-accent">
          Just sign them.
        </span>
      </h1>
      <p className="landing-lede mt-6 max-w-lg">
        One wrong commodity code means overpaid duty, an HMRC demand or a penalty. Prue codes every line against HMRC&apos;s live tariff,
        shows the legal reasoning, and remembers your firm&apos;s corrections. You review in a minute and sign.
      </p>
      <ul className="landing-chips">
        <li>{MANUAL_MIN_PER_LINE} min → {REVIEW_MIN_PER_LINE} min a line</li>
        <li>HMRC&apos;s live tariff</li>
        <li>{LOOKBACK_YEARS}-year duty reclaim</li>
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href={DEMO_HREF} className="landing-cta landing-cta-primary">
          Try the live demo
        </Link>
        <Link href="#problem" className="landing-cta landing-cta-ghost">
          See the cost
        </Link>
      </div>
      <Link href="#end-to-end" className="hero-e2e" aria-label="Shopify in, HMRC out, one desk: see how it connects">
        <HeroLogos ids={["shopify", "excel", "csv"]} />
        <span className="hero-e2e-arrow" aria-hidden>→</span>
        <HeroLogos ids={["tariff", "mubit"]} />
        <span className="hero-e2e-arrow" aria-hidden>→</span>
        <HeroLogos ids={["cds", "software"]} />
        <span className="text-[13px] font-semibold text-[#0b1f4d]">Shopify in, HMRC out. One desk.</span>
      </Link>
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

  /* Staggered scroll reveal for every [data-reveal] block, batched so siblings arrive together */
  useEffect(() => {
    registerLandingMotion();
    const els = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    if (reduce || els.length === 0) return;
    gsap.set(els, { opacity: 0, y: 36 });
    const triggers = ScrollTrigger.batch(els, {
      start: "top 88%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power3.out", overwrite: true }),
    });
    return () => {
      triggers.forEach((st) => st.kill());
      gsap.set(els, { clearProps: "opacity,transform" });
    };
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

      {/* ─── The problem, in numbers ─── */}
      <ProblemBand />

      {/* ─── The answer: from invoice to border ─── */}
      <section id="journey" className="relative z-20">
        <div className="mx-auto grid max-w-[86rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-10 lg:py-32">
          <div className="lg:sticky lg:top-16 lg:self-start">
            <p className="landing-kicker text-[#c2362b]">The answer</p>
            <h2 className="landing-display landing-section-title mt-3 max-w-[12ch] overflow-visible">From invoice to border.</h2>
            <p className="mt-4 max-w-md text-[17px] font-medium leading-relaxed text-[#1e3a6e]">
              The five steps you already follow. Prue does the tariff work; you keep the signature.
            </p>
            {/* One line through the gate: checked against the tariff, stamped with its code, on to the border. */}
            <figure className="mt-8 max-w-md overflow-hidden rounded-xl border border-[#0b1f4d]/10 bg-white/80 backdrop-blur-md">
              <CustomsScene code="8539 52 00 00" className="aspect-[520/150] w-full" />
              <figcaption className="flex items-baseline justify-between gap-3 border-t border-[#0b1f4d]/10 px-4 py-2.5 text-[12px] text-[#4a5872]">
                <span>LED bulb, E27, 9W, warm white</span>
                <span className="font-[family-name:var(--font-plex-mono)] text-[#0e1a2f]">Duty 0%</span>
              </figcaption>
            </figure>
          </div>

          <div className="journey-timeline">
            {JOURNEY_STEPS.map((s) => {
              const Icon = STEP_ICON[s.icon];
              return (
                <div key={s.id} className="journey-step" data-reveal>
                  <div className="journey-marker">
                    <span>{s.n}</span>
                  </div>
                  <TiltCard className="journey-card">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[#4338ca]">
                      <Icon className="size-4" aria-hidden />
                      {s.place}
                    </div>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                      <h3 className="font-[family-name:var(--font-ruling)] text-[22px] font-semibold leading-tight text-[#0b1f4d]">{s.title}</h3>
                      <p className="journey-metric">
                        {s.metric}
                        <span>{s.unit}</span>
                      </p>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#1e3a6e]">{s.body}</p>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Everything, end to end ─── */}
      <EndToEndFlow />

      {/* ─── Proof: it gets better every week ─── */}
      <MubitShowcase />

      {/* ─── Value for the firm ─── */}
      <RoiBlock />

      {/* ─── Final call ─── */}
      <section className="relative z-20 border-t border-[#0b1f4d]/10">
        <div className="mx-auto flex max-w-[86rem] flex-col items-center px-5 py-28 text-center sm:px-8 lg:px-10 lg:py-36">
          <p className="landing-kicker text-[#c2362b]" data-reveal>
            Your next invoice is already waiting
          </p>
          <h2 className="landing-display landing-section-title mt-4 max-w-[16ch] overflow-visible" data-reveal>
            Code your first invoice in <span className="landing-hero-accent">60 seconds.</span>
          </h2>
          <p className="mt-5 max-w-lg text-[17px] font-medium leading-relaxed text-[#1e3a6e]" data-reveal>
            From Shopify to HMRC in one desk. Pick a demo firm and watch Prue code a real invoice against HMRC&apos;s live tariff. No sign-up, no card.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3" data-reveal>
            <Link href={DEMO_HREF} className="landing-cta landing-cta-primary">
              Try the live demo
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
