"use client";

import { useEffect, useRef } from "react";
import { SiteNav } from "@/components/site-nav";
import { LandingStage } from "@/components/landing-stage";
import { HmrcMark, MubitMark, PartnerChip, ShopifyMark } from "@/components/partner-marks";
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
      y: 16,
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
    <h1 ref={ref} className="landing-display max-w-[16ch] overflow-visible">
      Code it once.
      <br />
      Never again.
    </h1>
  );
}

export function LandingView() {
  return (
    <div className="landing min-h-[100svh] bg-background text-foreground">
      <SiteNav current="home" />
      <main className="px-5 pb-12 sm:px-8 lg:px-10">
        <Headline />
        <p className="mt-2 max-w-xl text-[15px] font-medium leading-snug text-foreground/70">
          A desk for UK brokers. Suggestions only — the broker signs every code.
        </p>

        <div className="mt-6 max-w-3xl">
          <LandingStage />
        </div>

        <p className="landing-kicker mt-8 text-foreground/60">Works with</p>
        <ul className="mt-3 flex flex-wrap items-center gap-3">
          <li>
            <PartnerChip label="Shopify">
              <ShopifyMark size={22} />
              <span className="text-[14px] font-extrabold tracking-[-0.03em]">Shopify</span>
            </PartnerChip>
          </li>
          <li>
            <PartnerChip label="HM Revenue and Customs">
              <HmrcMark className="text-[14px]" />
            </PartnerChip>
          </li>
          <li>
            <PartnerChip label="Mubit">
              <MubitMark size={16} />
            </PartnerChip>
          </li>
        </ul>
      </main>
    </div>
  );
}
