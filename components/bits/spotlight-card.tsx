"use client";

import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** SpotlightCard — after React Bits (MIT, David Haz), simplified for this palette. */
export function SpotlightCard({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);

  return (
    <article
      ref={ref}
      {...rest}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--sx", `${e.clientX - r.left}px`);
        el.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "spotlight-card relative overflow-hidden rounded-xl border-2 border-foreground/20 bg-card p-4",
        className,
      )}
    >
      {children}
    </article>
  );
}
