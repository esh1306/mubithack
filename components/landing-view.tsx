"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { StaticGlobe } from "@/components/static-globe";
import { PlaneWhoosh } from "@/components/plane-whoosh";
import { PaperMap } from "@/components/paper-map";
import { LandingStats } from "@/components/landing-stats";
import { MubitShowcase } from "@/components/mubit-showcase";
import { LogoLoop } from "@/components/bits/logo-loop";
import { HmrcMark, MubitMark, QwenMark, ShopifyMark } from "@/components/partner-marks";
import { gsap, registerLandingMotion, ScrollTrigger, SplitText } from "@/components/landing-motion";
import type { EarthApi } from "@/components/earth-globe";

const EarthGlobe = dynamic(() => import("@/components/earth-globe"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <StaticGlobe className="h-[min(64vh,560px)] w-[min(64vh,560px)]" />
    </div>
  ),
});

function Headline() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    registerLandingMotion();
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
    return () => {
      tw.kill();
      split.revert();
    };
  }, []);

  return (
    <div className="pointer-events-none max-w-xl">
      <h1 ref={ref} className="landing-display max-w-[12ch] overflow-visible">
        Code it once.
        <br />
        Never again.
      </h1>
      <p className="mt-3 max-w-md text-[15px] font-medium leading-snug text-foreground/75">
        A desk for UK brokers. Suggestions only — the broker signs every code.
      </p>
    </div>
  );
}

function Credits() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 text-[11px] leading-relaxed text-foreground/55 sm:px-8 lg:px-10">
      <p>
        Globe: react-globe.gl / three.js (MIT). Land: Natural Earth via world-atlas (public domain). Airliner stills are
        original photoreal renders (no logos).
      </p>
    </footer>
  );
}

export function LandingView() {
  const story = useRef<HTMLElement>(null);
  const earth = useRef<EarthApi | null>(null);
  const [reduce, setReduce] = useState(false);
  const [mobile, setMobile] = useState(false);

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

  useEffect(() => {
    const root = story.current;
    if (!root) return;
    registerLandingMotion();
    const st = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom top",
      scrub: 0.45,
      onUpdate: (self) => {
        earth.current?.setProgress(self.progress);
      },
    });
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    requestAnimationFrame(refresh);
    return () => {
      window.removeEventListener("load", refresh);
      st.kill();
    };
  }, []);

  return (
    <div className="landing">
      <SiteNav current="home" overlay />
      <section ref={story} className="landing-hero relative min-h-[100svh]">
        <div className="absolute inset-0">
          <EarthGlobe
            mobile={mobile}
            reduced={reduce}
            onApi={(api) => {
              earth.current = api;
            }}
            onReady={() => {
              registerLandingMotion();
              ScrollTrigger.refresh();
            }}
          />
        </div>
        <PlaneWhoosh
          reduced={reduce}
          onFlight={(t) => {
            earth.current?.setWhoosh(t);
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1236A8]/80 via-[#1E4FD8]/30 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0F2A6B] to-transparent"
          aria-hidden
        />
        <div className="pointer-events-none relative z-30 flex min-h-[100svh] flex-col">
          <div className="relative flex flex-1 flex-col justify-center px-5 pb-8 pt-28 sm:px-8 lg:px-10">
            <Headline />
          </div>
          <p className="px-5 pb-5 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/50 sm:px-8 lg:px-10">
            Shenzhen → London
          </p>
        </div>
      </section>

      <section id="journey" className="relative z-20 border-t border-white/10 px-5 py-16 sm:px-8 lg:px-10">
        <p className="landing-kicker text-[#FDE68A]">Store to sandbox</p>
        <h2 className="landing-display mt-2 max-w-[16ch] overflow-visible">The parcel&apos;s journey.</h2>
        <p className="mt-3 max-w-xl text-[15px] font-medium text-foreground/75">
          Pins drop in order from the Shopify store to the HMRC sandbox.
        </p>
        <div className="mt-8">
          <PaperMap mobile={mobile} reduced={reduce} progress={1} />
        </div>
      </section>

      <LandingStats />
      <MubitShowcase />

      <section className="border-t border-white/10 px-5 py-12 sm:px-8 lg:px-10">
        <p className="landing-kicker text-foreground/55">Works with</p>
        <p className="mt-2 text-[13px] font-medium text-foreground/55">Names for orientation. Not a partnership.</p>
        <div className="mt-5">
          <LogoLoop>
            <ShopifyMark size={26} />
            <span className="text-[15px] font-extrabold tracking-tight">Shopify</span>
            <MubitMark size={16} />
            <QwenMark size={24} />
            <span className="text-[15px] font-extrabold tracking-tight">Qwen</span>
            <HmrcMark className="text-[14px]" />
          </LogoLoop>
        </div>
      </section>
      <Credits />
    </div>
  );
}
