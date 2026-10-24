"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

let registered = false;

export function registerLandingMotion() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin);
  registered = true;
}

export { gsap, ScrollTrigger, SplitText, MotionPathPlugin };
