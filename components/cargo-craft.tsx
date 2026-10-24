"use client";

import { useEffect, useRef } from "react";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

/** Flat SVG plane + dangling parcel. GSAP MotionPathPlugin, autoRotate. Used on mobile and on the paper map. */
export function CargoCraft({
  progress,
  pathId,
  className = "",
}: {
  progress: number;
  pathId: string;
  className?: string;
}) {
  const ref = useRef<SVGGElement>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const el = ref.current;
    const path = document.getElementById(pathId) as SVGPathElement | null;
    if (!el || !path) return;
    registerLandingMotion();
    tween.current?.kill();
    tween.current = gsap.to(el, {
      motionPath: {
        path,
        align: path,
        alignOrigin: [0.5, 0.55],
        autoRotate: true,
      },
      ease: "none",
      duration: 1,
      paused: true,
    });
    tween.current.progress(progress);
    return () => {
      tween.current?.kill();
      tween.current = null;
    };
  }, [pathId]);

  useEffect(() => {
    tween.current?.progress(progress);
  }, [progress]);

  return (
    <g ref={ref} className={className} style={{ offsetAnchor: "center" }}>
      <g transform="translate(-28,-18)">
        <path d="M2 22 C 10 20, 18 22, 22 28" stroke="#8B5A2B" strokeWidth="1.2" fill="none" />
        <g className="parcel-swing">
          <rect x="16" y="26" width="12" height="10" rx="1.2" fill="#C4A574" stroke="#8B5A2B" strokeWidth="0.8" />
          <path d="M16 29.5 H28 M22 26 V36" stroke="#8B5A2B" strokeWidth="0.7" />
        </g>
        <path d="M8 16 L50 12 L54 16 L48 20 L8 18 Z" fill="#F3EAD3" stroke="#1A1A1A" strokeWidth="0.7" />
        <path d="M22 16 L36 4 L42 6 L32 16 Z" fill="#E63B2E" />
        <path d="M22 18 L36 28 L42 26 L32 18 Z" fill="#E63B2E" />
        <path d="M8 16 L2 12 L2 20 L8 18 Z" fill="#C9A227" />
        <circle cx="52" cy="15" r="2.2" fill="#2F6F73" />
      </g>
    </g>
  );
}

/** Same craft, free-positioned (hero overlay when no MotionPath target). */
export function CargoCraftMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden>
      <path d="M8 28 C 16 26, 24 28, 28 34" stroke="#8B5A2B" strokeWidth="1.2" fill="none" />
      <g className="parcel-swing">
        <rect x="22" y="32" width="12" height="10" rx="1.2" fill="#C4A574" stroke="#8B5A2B" strokeWidth="0.8" />
        <path d="M22 35.5 H34 M28 32 V42" stroke="#8B5A2B" strokeWidth="0.7" />
      </g>
      <path d="M4 18 L50 12 L55 17 L48 22 L4 20 Z" fill="#F3EAD3" stroke="#1A1A1A" strokeWidth="0.8" />
      <path d="M20 17 L36 2 L43 5 L32 17 Z" fill="#E63B2E" />
      <path d="M20 20 L36 34 L43 31 L32 20 Z" fill="#E63B2E" />
      <path d="M4 18 L0 13 L0 23 L4 20 Z" fill="#C9A227" />
      <circle cx="53" cy="16" r="2.4" fill="#2F6F73" />
    </svg>
  );
}
