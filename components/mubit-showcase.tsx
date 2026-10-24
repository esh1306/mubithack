"use client";

import { useEffect, useRef, useState } from "react";
import { MubitMark } from "@/components/partner-marks";
import { gsap, registerLandingMotion, ScrollTrigger } from "@/components/landing-motion";
import { DEMO_BAMBOO_CODE } from "@/lib/demo";

const TRAIN_AFTER = 25;
const VARIANTS = [
  "Bamboo kids' dinner set, plate bowl cup",
  "Bamboo children's dinner set, plate bowl cup",
  "Bamboo kids' tableware set, plate bowl cup",
  "Bamboo fibre kids' dinner set, plate bowl cup",
  "Bamboo-melamine kids' dinner set, plate bowl cup",
  "Bamboo kids' dinner kit, plate bowl cup",
  "Imported Bamboo kids' dinner set, plate bowl cup",
  "Bamboo kids' dinner set, plate bowl cup (retail pack)",
  "Bamboo kids' dinner set, plate bowl cup, as sold to consumers",
  "Household Bamboo kids' dinner set, plate bowl cup",
  "Tableware: Bamboo kids' dinner set, plate bowl cup",
  "Bamboo kids' dinner set — kitchen or table use",
  "Bamboo kids' dinner set, not of solid wood",
  "Melamine-bound Bamboo kids' dinner set, plate bowl cup",
  "Fibre-composite Bamboo kids' dinner set, plate bowl cup",
  "Children's Bamboo kids' dinner set, plate bowl cup",
  "Bamboo kids' dinner set for everyday meals",
  "UK import: Bamboo kids' dinner set, plate bowl cup",
  "Bamboo kids' dinner set / matching pieces",
  "Supplier listing: Bamboo kids' dinner set, plate bowl cup",
];
const SCRIPT_IDS = [
  "mubit_7c2e91a4",
  "mubit_11d0bf38",
  "mubit_9a44e0c1",
  "mubit_e3b17d06",
  "mubit_52fa88c9",
  "mubit_c0d14e7b",
];

function pretty(code: string) {
  return `${code.slice(0, 4)} ${code.slice(4, 6)} ${code.slice(6, 8)} ${code.slice(8)}`;
}

export function MubitShowcase() {
  const root = useRef<HTMLElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const [count, setCount] = useState(0);
  const [idTick, setIdTick] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    registerLandingMotion();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chips = el.querySelectorAll<HTMLElement>("[data-chip]");
    const r = 42;
    const circ = 2 * Math.PI * r;

    if (reduce) {
      setCount(VARIANTS.length);
      gsap.set(chips, { opacity: 0.35 });
      if (ring.current) {
        ring.current.style.strokeDasharray = `${circ}`;
        ring.current.style.strokeDashoffset = `${circ * (1 - VARIANTS.length / TRAIN_AFTER)}`;
      }
      return;
    }

    const obj = { n: 0 };
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 1.4,
      scrollTrigger: { trigger: el, start: "top 78%", toggleActions: "play pause play pause" },
    });

    gsap.set(chips, { x: 0, y: 0, opacity: 1, scale: 1 });
    if (ring.current) {
      gsap.set(ring.current, { strokeDasharray: circ, strokeDashoffset: circ });
    }

    tl.call(() => setCount(0));
    tl.fromTo(
      chips,
      { x: 0, opacity: 1, scale: 1 },
      {
        x: () => (window.innerWidth >= 1024 ? 420 : 72),
        y: (_, t) => {
          const i = Number((t as HTMLElement).dataset.i ?? 0);
          return (10 - i) * 3;
        },
        scale: 0.15,
        opacity: 0,
        duration: 1.05,
        stagger: 0.07,
        ease: "power2.in",
        onUpdate: () => {
          /* count driven below */
        },
      },
      0,
    );
    tl.to(
      obj,
      {
        n: VARIANTS.length,
        duration: 1.6,
        ease: "none",
        onUpdate: () => setCount(Math.round(obj.n)),
      },
      0,
    );
    if (ring.current) {
      tl.to(
        ring.current,
        { strokeDashoffset: circ * (1 - VARIANTS.length / TRAIN_AFTER), duration: 1.6, ease: "power1.out" },
        0,
      );
    }

    const idTimer = window.setInterval(() => setIdTick((n) => n + 1), 700);

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
      window.clearInterval(idTimer);
    };
  }, []);

  return (
    <section ref={root} id="mubit" className="relative border-t border-foreground/10 px-5 py-16 sm:px-8 lg:px-10">
      <p className="landing-kicker text-primary">Taught in Mubit</p>
      <h2 className="landing-display landing-shine mt-2 max-w-[16ch] overflow-visible">Learns your broker.</h2>
      <p className="mt-3 max-w-xl text-[15px] font-medium leading-snug text-foreground/70">
        One correction becomes ~20 paraphrases, sent through this firm&apos;s Mubit task. We count examples toward{" "}
        {TRAIN_AFTER}. We cannot see if an adapter is live.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="relative overflow-hidden rounded-xl border-2 border-foreground/20 bg-card p-4">
          <div className="mb-4 inline-block border-2 border-primary px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">
            Fix · {pretty(DEMO_BAMBOO_CODE)}
          </div>
          <ul className="relative flex flex-col items-start gap-1.5">
            {VARIANTS.map((v, i) => (
              <li
                key={v}
                data-chip
                data-i={i}
                className="max-w-full truncate rounded-md border border-foreground/15 bg-background/70 px-2 py-0.5 text-[12px] font-medium leading-5 text-foreground/85"
              >
                {v}
              </li>
            ))}
          </ul>
        </div>

        <div
          data-gate
          className="relative overflow-hidden rounded-xl border-2 border-primary bg-card px-5 py-6 text-center shadow-[0_0_48px_-12px_var(--primary)]"
        >
          <p className="landing-kicker text-secondary">Gateway</p>
          <div className="mt-3 flex justify-center">
            <MubitMark size={22} className="text-foreground [&_rect]:fill-foreground [&_path]:fill-background" />
          </div>
          <div className="relative mx-auto mt-5 h-[7.5rem] w-[7.5rem]">
            <svg viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-foreground/10" />
              <circle
                ref={ring}
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-[family-name:var(--font-display-face)] text-4xl font-extrabold leading-none">{count}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-foreground/55">of {TRAIN_AFTER}</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] font-semibold text-foreground/80">examples sent · not live</p>
          <p className="mt-4 font-mono text-[11px] text-secondary">
            {SCRIPT_IDS[idTick % SCRIPT_IDS.length]}
            <span className="block text-foreground/40">scripted request ids</span>
          </p>
        </div>
      </div>
    </section>
  );
}
