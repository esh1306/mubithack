"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { PaperMap } from "@/components/paper-map";
import { LandingStats } from "@/components/landing-stats";
import { MubitShowcase } from "@/components/mubit-showcase";
import { LogoLoop } from "@/components/bits/logo-loop";
import { HmrcMark, MubitMark, QwenMark, ShopifyMark } from "@/components/partner-marks";
import { gsap, registerLandingMotion, ScrollTrigger, SplitText } from "@/components/landing-motion";

const GlobeHero = dynamic(() => import("@/components/globe-hero"), {
  ssr: false,
  loading: () => <div className="globe-hero" aria-hidden />,
});

function Headline() {
  const ref = useRef<HTMLHeadingElement>(null);

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
      return () => {
        tw.kill();
        split.revert();
      };
    } catch {
      return undefined;
    }
  }, []);

  return (
    <div className="pointer-events-none max-w-lg">
      <h1 ref={ref} className="landing-display max-w-[12ch] overflow-visible">
        Code it once.
        <br />
        Never again.
      </h1>
      <p className="landing-lede mt-5 max-w-md">
        We suggest the commodity code. You sign it. Then we scan 3 years of past imports for duty you overpaid and can
        reclaim.
      </p>
      <ul className="landing-chips">
        <li>Never files for you: you sign every code</li>
        <li>Receipt for every code</li>
        <li>3-year duty reclaim scan</li>
      </ul>
    </div>
  );
}

function Credits() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 text-[11px] leading-relaxed text-foreground/55 sm:px-8 lg:px-10">
      <p>
        Globe: three.js (MIT). Land mask: Natural Earth via world-atlas (public domain).
      </p>
    </footer>
  );
}

export function LandingView() {
  const journey = useRef<HTMLElement>(null);
  const [reduce, setReduce] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mapT, setMapT] = useState(0);

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
    registerLandingMotion();
    const refresh = () => ScrollTrigger.refresh();
    const journeyEl = journey.current;
    const triggers: ScrollTrigger[] = [];

    if (journeyEl && !reduce && !mobile) {
      triggers.push(
        ScrollTrigger.create({
          trigger: journeyEl,
          start: "top top",
          end: "bottom top",
          scrub: 0.55,
          onUpdate: (self) => setMapT(self.progress),
        }),
      );
    } else {
      setMapT(1);
    }

    window.addEventListener("load", refresh);
    requestAnimationFrame(refresh);
    return () => {
      window.removeEventListener("load", refresh);
      for (const st of triggers) st.kill();
    };
  }, [reduce, mobile]);

  return (
    <div className="landing">
      <SiteNav current="home" overlay />
      <section className="landing-hero relative min-h-[100svh]">
        <div className="relative mx-auto flex min-h-[100svh] max-w-[86rem] flex-col justify-center gap-8 px-5 pb-10 pt-28 lg:flex-row lg:items-center lg:justify-center lg:gap-10 sm:px-8 lg:px-10">
          <div className="relative z-30 pointer-events-none lg:max-w-lg">
            <Headline />
            <p className="landing-lane mt-7">Every lane into the UK</p>
          </div>
          <div className="globe-slot">
            <GlobeHero />
          </div>
        </div>
      </section>

      <section
        id="journey"
        ref={journey}
        className={`landing-journey relative z-20 border-t border-white/10 ${mobile ? "px-5 py-16 sm:px-8 lg:px-10" : ""}`}
      >
        <div className={mobile ? "" : "landing-journey-stick px-5 py-16 sm:px-8 lg:px-10"}>
          <p className="landing-kicker text-[#FDE68A]">Store to sandbox</p>
          <h2 className="landing-display mt-2 max-w-[16ch] overflow-visible">The parcel&apos;s journey.</h2>
          <p className="mt-3 max-w-xl text-[15px] font-medium text-foreground/75">
            Pins drop in order from the Shopify store to the HMRC sandbox.
          </p>
          <div className="mt-8">
            <PaperMap mobile={mobile} reduced={reduce} progress={mobile || reduce ? 1 : mapT} />
          </div>
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
