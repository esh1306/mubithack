"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import type Lenis from "lenis";

let registered = false;

export function registerLandingMotion() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

/** Lenis is the scroll source; ScrollTrigger reads from it on every Lenis tick. */
export function wireLenisToScrollTrigger(lenis: Lenis) {
  const onScroll = () => ScrollTrigger.update();
  lenis.on("scroll", onScroll);
  return () => {
    lenis.off("scroll", onScroll);
  };
}

export { gsap, ScrollTrigger, SplitText };
