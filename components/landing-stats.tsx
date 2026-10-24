"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, registerLandingMotion } from "@/components/landing-motion";
import { DEMO_DISCLOSE_GBP, LOOKBACK_YEARS, SEEDED_UK_CODES, TRAIN_AFTER, VARIANT_COUNT } from "@/lib/landing-stats";

const STATS = [
  { id: "codes", to: SEEDED_UK_CODES, suffix: "", label: "UK codes on this desk", note: "from the seeded tariff, not a market figure" },
  { id: "variants", to: VARIANT_COUNT, suffix: "", label: "variants per correction", note: "lib/variants.ts" },
  { id: "train", to: TRAIN_AFTER, suffix: "", label: "examples to train", note: "Mubit adapter gate" },
  { id: "years", to: LOOKBACK_YEARS, suffix: "", label: "year look-back", note: "retro-scan window" },
  { id: "disclose", to: DEMO_DISCLOSE_GBP, prefix: "£", suffix: "", label: "demo disclose", note: "Harbourline bamboo, 0% → 6%" },
] as const;

function Count({
  to,
  prefix = "",
  play,
}: {
  to: number;
  prefix?: string;
  play: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!play) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    const obj = { n: 0 };
    const tw = gsap.to(obj, {
      n: to,
      duration: 1.15,
      ease: "power2.out",
      onUpdate: () => setN(Math.round(obj.n)),
    });
    return () => {
      tw.kill();
    };
  }, [play, to]);
  return (
    <span>
      {prefix}
      {n.toLocaleString("en-GB")}
    </span>
  );
}

export function LandingStats() {
  const root = useRef<HTMLElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    registerLandingMotion();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setPlay(true);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="stats" ref={root} className="border-t border-[#F3EAD3]/10 px-5 py-16 sm:px-8 lg:px-10">
      <p className="landing-kicker text-[#C9A227]">From this desk</p>
      <h2 className="landing-display mt-2 max-w-[14ch] overflow-visible">Numbers we can show.</h2>
      <p className="mt-3 max-w-xl text-[15px] font-medium text-[#F3EAD3]/70">
        Counted from the seeded tariff, the demo broker&apos;s past entries, and the code constants. No invented market or customer stats.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STATS.map((s) => (
          <article key={s.id} className="stat-card">
            <p className="font-[family-name:var(--font-display-face)] text-[2.6rem] font-extrabold uppercase leading-none text-[#F3EAD3]">
              <Count to={s.to} prefix={"prefix" in s ? s.prefix : ""} play={play} />
            </p>
            <p className="mt-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#E63B2E]">{s.label}</p>
            <p className="mt-1 text-[12px] font-medium text-[#F3EAD3]/50">{s.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
