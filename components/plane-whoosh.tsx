"use client";

import { useEffect, useRef } from "react";
import { AirlinerBanking } from "@/components/cargo-craft";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

/** Intro whoosh: banking airliner enters off-screen, banks, scales for depth, leaves a contrail. */
export function PlaneWhoosh({ reduced }: { reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    registerLandingMotion();
    const trail = el.querySelector<HTMLElement>("[data-trail]");
    const streak = el.querySelector<HTMLElement>("[data-streak]");
    const craft = el.querySelector<HTMLElement>("[data-craft]");
    const tl = gsap.timeline();
    gsap.set(el, { x: "-52vw", y: "42vh", scale: 0.26, rotate: -34, opacity: 0 });
    gsap.set(craft, { rotate: -6, filter: "blur(1.2px)" });
    tl.to(el, { opacity: 1, duration: 0.1, ease: "none" }, 0);
    tl.to(
      el,
      { x: "6vw", y: "14vh", scale: 1.38, rotate: -10, duration: 0.72, ease: "power3.out" },
      0,
    );
    tl.to(craft, { rotate: 4, filter: "blur(0px)", duration: 0.72, ease: "power2.out" }, 0);
    if (trail) {
      tl.fromTo(
        trail,
        { scaleX: 0.12, opacity: 0 },
        { scaleX: 1.15, opacity: 0.95, duration: 0.38, ease: "power2.out" },
        0.04,
      );
    }
    if (streak) {
      tl.fromTo(
        streak,
        { scaleX: 0.2, opacity: 0 },
        { scaleX: 1, opacity: 0.7, duration: 0.42, ease: "power2.out" },
        0.08,
      );
    }
    tl.to(el, { x: "46vw", y: "24vh", scale: 1.02, rotate: 12, duration: 0.62, ease: "power2.inOut" });
    if (craft) tl.to(craft, { rotate: -10, duration: 0.62, ease: "power2.inOut" }, "<");
    tl.to(el, { x: "122vw", y: "2vh", scale: 0.34, rotate: 5, opacity: 0, duration: 0.52, ease: "power2.in" });
    if (trail) tl.to(trail, { opacity: 0, duration: 0.28 }, "<");
    if (streak) tl.to(streak, { opacity: 0, duration: 0.24 }, "<");
    return () => {
      tl.kill();
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div ref={root} className="plane-whoosh" aria-hidden>
      <div data-trail className="plane-whoosh-trail" />
      <div data-streak className="plane-whoosh-streak" />
      <div data-craft className="plane-whoosh-craft">
        <AirlinerBanking className="w-[min(58vw,22rem)] sm:w-[24rem]" />
      </div>
    </div>
  );
}
