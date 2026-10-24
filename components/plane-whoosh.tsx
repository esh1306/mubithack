"use client";

import { useEffect, useRef } from "react";
import { CargoCraftMark } from "@/components/cargo-craft";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

/** Cinematic intro swoosh. ~2s, then exits. Skipped when reduced-motion. */
export function PlaneWhoosh({ reduced }: { reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    registerLandingMotion();
    const trail = el.querySelector<HTMLElement>("[data-trail]");
    const craft = el.querySelector<HTMLElement>("[data-craft]");
    const tl = gsap.timeline();
    gsap.set(el, { x: "-38vw", y: "22vh", scale: 0.4, rotate: -22, opacity: 0 });
    tl.to(el, { opacity: 1, duration: 0.12, ease: "none" }, 0);
    tl.to(
      el,
      { x: "16vw", y: "10vh", scale: 1.22, rotate: -8, duration: 0.75, ease: "power3.out" },
      0,
    );
    if (trail) {
      tl.fromTo(trail, { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 0.85, duration: 0.35, ease: "power2.out" }, 0.05);
    }
    tl.to(el, { x: "58vw", y: "28vh", scale: 0.92, rotate: 14, duration: 0.7, ease: "power2.inOut" });
    if (craft) tl.to(craft, { rotate: -6, duration: 0.7, ease: "power2.inOut" }, "<");
    tl.to(el, { x: "118vw", y: "6vh", scale: 0.32, rotate: 6, opacity: 0, duration: 0.55, ease: "power2.in" });
    if (trail) tl.to(trail, { opacity: 0, duration: 0.3 }, "<");
    return () => {
      tl.kill();
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div ref={root} className="plane-whoosh" aria-hidden>
      <div data-trail className="plane-whoosh-trail" />
      <div data-craft>
        <CargoCraftMark className="w-[7.5rem] sm:w-40" />
      </div>
    </div>
  );
}
