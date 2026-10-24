"use client";

import { useRef, type ReactNode } from "react";

/** ClickSpark — after React Bits (MIT, David Haz). Small burst on click. */
export function ClickSpark({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onClick={(e) => {
        const host = ref.current;
        if (!host) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        for (let i = 0; i < 8; i++) {
          const s = document.createElement("i");
          const a = (i / 8) * Math.PI * 2;
          s.className = "click-spark";
          s.style.setProperty("--dx", `${Math.cos(a) * 22}px`);
          s.style.setProperty("--dy", `${Math.sin(a) * 22}px`);
          s.style.left = `${e.nativeEvent.offsetX}px`;
          s.style.top = `${e.nativeEvent.offsetY}px`;
          host.appendChild(s);
          window.setTimeout(() => s.remove(), 420);
        }
      }}
    >
      {children}
    </span>
  );
}
