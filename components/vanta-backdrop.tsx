"use client";

import { useEffect, useRef, useState } from "react";

type VantaEffect = { destroy: () => void };

function skipVanta() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 1) return true;
  return false;
}

/** Client-only Vanta NET. Paper + stamp-red. Destroyed on unmount. */
export function VantaBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (skipVanta()) {
      setFallback(true);
      return;
    }
    let effect: VantaEffect | null = null;
    let cancelled = false;

    const start = async () => {
      const THREE = await import("three");
      const mod = await import("vanta/dist/vanta.net.min");
      const NET = (mod as { default: (opts: Record<string, unknown>) => VantaEffect }).default;
      if (cancelled || !ref.current) return;
      effect = NET({
        el: ref.current,
        THREE,
        mouseControls: true,
        touchControls: false,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        color: 0xc43d32,
        backgroundColor: 0xf5f3ef,
        points: 10,
        maxDistance: 20,
        spacing: 16,
        showDots: true,
      });
    };

    void start().catch(() => {
      if (!cancelled) setFallback(true);
    });

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0"
      style={
        fallback
          ? { background: "radial-gradient(ellipse at 72% 38%, #edd4cd 0%, #f5f3ef 58%)" }
          : { background: "#f5f3ef" }
      }
    />
  );
}
