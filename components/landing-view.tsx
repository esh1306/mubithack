"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_HREF } from "@/components/site-nav";
import { LandingStats } from "@/components/landing-stats";
import { MubitShowcase } from "@/components/mubit-showcase";
import { LogoLoop } from "@/components/bits/logo-loop";
import { AuroraField } from "@/components/bits/aurora-field";
import { TiltCard } from "@/components/bits/tilt-card";
import { Wordmark } from "@/components/mark";
import { HmrcMark, MubitMark, QwenMark, ShopifyMark } from "@/components/partner-marks";
import { gsap, registerLandingMotion, ScrollTrigger, SplitText } from "@/components/landing-motion";
import { JOURNEY_STEPS } from "@/lib/landing-steps";
import type { EarthApi } from "@/components/earth-globe";

const EarthGlobe = dynamic(() => import("@/components/earth-globe"), {
  ssr: false,
  loading: () => null,
});

function StepMark({ mark }: { mark: (typeof JOURNEY_STEPS)[number]["mark"] }) {
  if (mark === "shopify") return <ShopifyMark size={22} />;
  if (mark === "precedent") return <Wordmark size={18} />;
  if (mark === "fix") return <span className="text-[12px] font-bold text-primary">FIX</span>;
  if (mark === "mubit")
    return <MubitMark size={14} className="text-foreground [&_rect]:fill-foreground [&_path]:fill-background" />;
  return <HmrcMark className="text-[12px] text-foreground/80" />;
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
      const tw = gsap.from(split.chars, {
        y: 14,
        opacity: 0,
        duration: 0.5,
        stagger: 0.012,
        ease: "power3.out",
      });
      /* The gradient line can't be split per-char without losing background-clip:text */
      const tw2 = gsap.from(accent.current, {
        y: 28,
        opacity: 0,
        filter: "blur(10px)",
        duration: 0.9,
        delay: 0.25,
        ease: "power3.out",
      });
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
        <span ref={ref}>Code it once.</span>
        <br />
        <span ref={accent} className="landing-hero-accent">
          Never again.
        </span>
      </h1>
      <p className="landing-lede mt-6 max-w-md">
        We suggest the commodity code. You sign it. Then we scan 3 years of past imports for duty you overpaid and can
        reclaim.
      </p>
      <ul className="landing-chips">
        <li>Never files for you: you sign every code</li>
        <li>Receipt for every code</li>
        <li>3-year duty reclaim scan</li>
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

function Credits() {
  return (
    <footer className="border-t border-[#0b1f4d]/10 px-5 py-8 text-[11px] leading-relaxed text-foreground/55 sm:px-8 lg:px-10">
      <p>
        Globe: react-globe.gl / three.js (MIT). Land: Natural Earth via world-atlas (public domain). Airliner stills are
        original photoreal renders (no logos).
      </p>
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
      const tw = gsap.to(step, {
        y: 0,
        opacity: 1,
        duration: 0.65,
        ease: "power3.out",
        scrollTrigger: {
          trigger: step,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      });
      tweens.push(tw);
    });
    return () => tweens.forEach((tw) => tw.revert());
  }, [reduce]);

  return (
    <div className="landing">
      <AuroraField reduced={reduce} className="landing-bg" />

      {/* ─── Hero ─── */}
      <section ref={hero} className="landing-hero relative min-h-[100svh]">
        <div className="relative mx-auto grid min-h-[100svh] max-w-[86rem] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-10">
          <div className="relative z-30">
            <Headline />
          </div>
          <div className="relative flex flex-col items-center justify-center">
            <div className="globe-slot">
              <EarthGlobe mobile={mobile} reduced={reduce} onApi={onGlobeApi} onReady={onGlobeReady} />
            </div>
            <p className="landing-lane mt-4 text-center opacity-80">Every lane into the UK</p>
          </div>
        </div>
      </section>

      {/* ─── Journey ─── */}
      <section id="journey" className="relative z-20 border-t border-[#0b1f4d]/10">
        <div className="mx-auto grid max-w-[86rem] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-10 lg:py-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="landing-kicker text-[#b45309]">Store to sandbox</p>
            <h2 className="landing-display mt-2 max-w-[16ch] overflow-visible">The parcel&apos;s journey.</h2>
            <p className="mt-3 max-w-md text-[15px] font-medium text-foreground/75">
              Five steps from the Shopify store to the HMRC sandbox.
            </p>
          </div>

          <div className="journey-timeline">
            {JOURNEY_STEPS.map((s) => (
              <div key={s.id} className="journey-step" data-journey-step>
                <div className="journey-marker">
                  <span>{s.n}</span>
                </div>
                <TiltCard className="journey-card">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <StepMark mark={s.mark} />
                    <span className="landing-stamp-type text-[11px] text-[#b45309]">{s.n}</span>
                  </div>
                  <p className="landing-stamp-type text-[11px] tracking-[0.14em] text-[#4338ca]">{s.place}</p>
                  <h3 className="mt-2 font-[family-name:var(--font-display-face)] text-[1.35rem] font-extrabold uppercase leading-none text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-primary">
                    {s.label}
                  </p>
                  <p className="mt-2 text-[14px] font-medium leading-snug text-foreground/70">{s.body}</p>
                </TiltCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingStats />
      <MubitShowcase />

      <section className="border-t border-[#0b1f4d]/10 px-5 py-12 sm:px-8 lg:px-10">
        <p className="landing-kicker text-foreground/55">Works with</p>
        <p className="mt-2 text-[13px] font-medium text-foreground/55">Names for orientation. Not a partnership.</p>
        <div className="mt-5">
          <LogoLoop>
            <ShopifyMark size={26} />
            <span className="text-[15px] font-extrabold tracking-tight">Shopify</span>
            <MubitMark size={16} className="text-foreground [&_rect]:fill-foreground [&_path]:fill-background" />
            <QwenMark size={24} className="[&_path]:fill-foreground" />
            <span className="text-[15px] font-extrabold tracking-tight">Qwen</span>
            <HmrcMark className="text-[14px] text-foreground/80" />
          </LogoLoop>
        </div>
      </section>
      <Credits />
    </div>
  );
}
