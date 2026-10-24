"use client";

import { useEffect, useRef } from "react";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

const SIDE = "/plane-side.webp";
const BANKING = "/plane-banking.webp";

/** Side-view airliner that follows an SVG route. No dangling crate. */
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
      <image href={SIDE} x={-46} y={-13} width={92} height={26} preserveAspectRatio="xMidYMid meet" />
    </g>
  );
}

export function AirlinerSide({ className = "" }: { className?: string }) {
  return <img src={SIDE} alt="" draggable={false} className={className} />;
}

export function AirlinerBanking({ className = "" }: { className?: string }) {
  return <img src={BANKING} alt="" draggable={false} className={className} />;
}

/** Small parcel mark on the paper route — not hung off the plane. */
export function RouteParcel({ x, y, show }: { x: number; y: number; show: boolean }) {
  return (
    <g transform={`translate(${x},${y})`} opacity={show ? 1 : 0} aria-hidden>
      <rect x={-8} y={-7} width={16} height={13} rx={1.6} fill="#C4A574" stroke="#8B5A2B" strokeWidth={0.9} />
      <path d="M-8 -1.5 H8 M0 -7 V6" stroke="#8B5A2B" strokeWidth={0.8} />
    </g>
  );
}
