"use client";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

let registered = false;

export function registerLandingMotion() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(SplitText);
  registered = true;
}

export { gsap, SplitText };
