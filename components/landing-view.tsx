"use client";

import { useEffect, useRef } from "react";
import { SiteNav } from "@/components/site-nav";
import { PrecedentMascot } from "@/components/precedent-mascot";
import { VantaBackdrop } from "@/components/vanta-backdrop";
import { gsap, registerLandingMotion, SplitText } from "@/components/landing-motion";

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
    <h1 ref={ref} className="landing-display max-w-[12ch] overflow-visible">
      Code it once.
      <br />
      Never again.
    </h1>
  );
}

export function LandingView() {
  return (
    <div className="landing bg-background text-foreground">
      <section className="relative isolate min-h-[100svh]">
        <VantaBackdrop />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/15"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[100svh] flex-col">
          <SiteNav current="home" overlay />
          <div className="flex flex-1 flex-col justify-center gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="max-w-xl">
              <Headline />
              <p className="mt-2 max-w-md text-[15px] font-medium leading-snug text-foreground/75">
                A desk for UK brokers. Suggestions only — the broker signs every code.
              </p>
            </div>
            <PrecedentMascot className="mx-auto w-[200px] sm:w-[236px] lg:mx-0 lg:w-[280px]" />
          </div>
        </div>
      </section>
    </div>
  );
}
