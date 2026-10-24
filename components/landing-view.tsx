"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { SiteNav } from "@/components/site-nav";
import { StaticGlobe } from "@/components/static-globe";
import { CargoCraftMark } from "@/components/cargo-craft";
import { PaperMap } from "@/components/paper-map";
import { LandingStats } from "@/components/landing-stats";
import { MubitShowcase } from "@/components/mubit-showcase";
import { LogoLoop } from "@/components/bits/logo-loop";
import { HmrcMark, MubitMark, QwenMark, ShopifyMark } from "@/components/partner-marks";
import { gsap, registerLandingMotion, ScrollTrigger, SplitText } from "@/components/landing-motion";
import { SCENE_AT, sceneFromProgress } from "@/lib/landing-geo";
import type { EarthApi } from "@/components/earth-globe";

const EarthGlobe = dynamic(() => import("@/components/earth-globe"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <StaticGlobe className="h-[min(64vh,560px)] w-[min(64vh,560px)]" />
    </div>
  ),
});

function Headline({ show }: { show: boolean }) {
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
    <div className="pointer-events-none max-w-xl transition-opacity duration-500" style={{ opacity: show ? 1 : 0 }}>
      <h1 ref={ref} className="landing-display max-w-[12ch] overflow-visible">
        Code it once.
        <br />
        Never again.
      </h1>
      <p className="mt-3 max-w-md text-[15px] font-medium leading-snug text-[#F3EAD3]/75">
        A desk for UK brokers. Suggestions only — the broker signs every code.
      </p>
    </div>
  );
}

function Credits() {
  return (
    <footer className="border-t border-[#F3EAD3]/10 px-5 py-8 text-[11px] leading-relaxed text-[#F3EAD3]/40 sm:px-8 lg:px-10">
      <p>
        Globe: react-globe.gl / three.js (MIT). Land: Natural Earth via world-atlas (public domain). Plane and parcel are
        procedural low-poly stand-ins — intended swap-ins for Akash Rudra&apos;s Very cute airplane (CC-BY,{" "}
        <a className="underline decoration-[#E63B2E]/50" href="https://poly.pizza/m/3UtIosDm9u-">
          poly.pizza/m/3UtIosDm9u-
        </a>
        ) and Kenney Cardboard Box Closed / Open (CC0).
      </p>
    </footer>
  );
}

export function LandingView() {
  const story = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const earth = useRef<EarthApi | null>(null);
  const [reduce, setReduce] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scene, setScene] = useState(0);

  const pinOn = ready && !reduce && !mobile;

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)");
    const n = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      setReduce(r.matches);
      setMobile(n.matches);
      setReady(true);
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
    if (!pinOn) return;
    const root = story.current;
    const pin = viewport.current;
    if (!root || !pin) return;
    registerLandingMotion();

    const lenis = new Lenis({ autoRaf: false });
    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);

    const st = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "+=720%",
      pin,
      scrub: 0.55,
      anticipatePin: 1,
      onUpdate: (self) => {
        earth.current?.setProgress(self.progress);
        setProgress(self.progress);
        const s = sceneFromProgress(self.progress);
        setScene((prev) => (prev === s ? prev : s));
      },
    });

    const go = (dir: number) => {
      const i = Math.max(0, Math.min(SCENE_AT.length - 1, sceneFromProgress(st.progress) + dir));
      const y = st.start + (st.end - st.start) * SCENE_AT[i];
      lenis.scrollTo(y, { duration: 0.7 });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };

    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onEnd = (e: TouchEvent) => {
      const y = e.changedTouches[0]?.clientY ?? startY;
      const dy = y - startY;
      if (Math.abs(dy) > 80) go(dy < 0 ? 1 : -1);
    };

    window.addEventListener("keydown", onKey);
    pin.addEventListener("touchstart", onStart, { passive: true });
    pin.addEventListener("touchend", onEnd);

    if (window.location.hash === "#journey") {
      lenis.scrollTo(st.start + (st.end - st.start) * 0.5, { immediate: true });
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      pin.removeEventListener("touchstart", onStart);
      pin.removeEventListener("touchend", onEnd);
      st.kill();
      gsap.ticker.remove(ticker);
      lenis.destroy();
    };
  }, [pinOn]);

  const mapOn = pinOn ? progress >= 0.46 : true;
  const globeFade = pinOn ? (progress < 0.46 ? 1 : Math.max(0, 1 - (progress - 0.46) / 0.08)) : 1;
  const showHead = !pinOn || scene <= 1;

  return (
    <div className="landing">
      <section ref={story} className="relative">
        <div ref={viewport} className="relative isolate min-h-[100svh] overflow-hidden">
          <div className="absolute inset-0" style={{ opacity: globeFade }}>
            <EarthGlobe
              mobile={mobile}
              reduced={reduce}
              onApi={(api) => {
                earth.current = api;
              }}
            />
          </div>
          {pinOn && (
            <div
              id="journey"
              className="absolute inset-0 z-20 flex flex-col justify-end px-5 pb-8 pt-24 sm:px-8 lg:px-10"
              style={{
                opacity: mapOn ? 1 : 0,
                pointerEvents: mapOn ? "auto" : "none",
                background: `rgba(11,31,51,${mapOn ? 0.28 : 0})`,
              }}
            >
              <p className="landing-kicker text-[#E63B2E]">Store to sandbox</p>
              <h2 className="landing-display mt-2 max-w-[16ch] overflow-visible text-[#F3EAD3]">The parcel&apos;s journey.</h2>
              <div className="mt-5 max-h-[min(64vh,620px)]">
                <PaperMap mobile={false} reduced={false} progress={progress} />
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B1F33] via-[#0B1F33]/55 to-transparent" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B1F33] to-transparent" aria-hidden />
          <div className="pointer-events-none relative z-30 flex min-h-[100svh] flex-col">
            <div className="pointer-events-auto">
              <SiteNav current="home" overlay />
            </div>
            <div className="relative flex flex-1 flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
              <Headline show={showHead} />
              {showHead && (
                <div className="pointer-events-none absolute right-[8%] top-[18%] hidden sm:block lg:right-[12%]">
                  <CargoCraftMark className="w-32 cargo-drift drop-shadow-[0_10px_18px_rgba(11,31,51,0.45)]" />
                </div>
              )}
              {mobile && (
                <div className="mt-8 flex justify-end">
                  <CargoCraftMark className="w-28 cargo-drift" />
                </div>
              )}
            </div>
            <p className="px-5 pb-5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#F3EAD3]/40 sm:px-8 lg:px-10">
              {pinOn ? "Scroll · arrows step the route" : "Shenzhen → London"}
            </p>
          </div>
        </div>
      </section>

      {ready && !pinOn && (
        <section id="journey" className="relative z-20 border-t border-[#F3EAD3]/10 px-5 py-16 sm:px-8 lg:px-10">
          <p className="landing-kicker text-[#E63B2E]">Store to sandbox</p>
          <h2 className="landing-display mt-2 max-w-[16ch] overflow-visible">The parcel&apos;s journey.</h2>
          <p className="mt-3 max-w-xl text-[15px] font-medium text-[#F3EAD3]/70">
            Pins drop in order from the Shopify store to the HMRC sandbox.
          </p>
          <div className="mt-8">
            <PaperMap mobile reduced={reduce} progress={1} />
          </div>
        </section>
      )}

      <LandingStats />
      <MubitShowcase />

      <section className="border-t border-[#F3EAD3]/10 px-5 py-12 sm:px-8 lg:px-10">
        <p className="landing-kicker text-[#F3EAD3]/50">Works with</p>
        <p className="mt-2 text-[13px] font-medium text-[#F3EAD3]/50">Names for orientation. Not a partnership.</p>
        <div className="mt-5">
          <LogoLoop>
            <ShopifyMark size={26} />
            <span className="text-[15px] font-extrabold tracking-tight">Shopify</span>
            <MubitMark size={16} className="text-[#F3EAD3] [&_rect]:fill-[#F3EAD3] [&_path]:fill-[#0B1F33]" />
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
