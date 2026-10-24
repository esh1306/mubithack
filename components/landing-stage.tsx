"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, registerLandingMotion } from "@/components/landing-motion";
import { DEMO_BAMBOO_CODE } from "@/lib/demo";
import { uk10 } from "@/lib/codes";
import { cn } from "@/lib/utils";

const SAMPLE = "Bamboo kids' dinner set, plate bowl cup";
const OLD = "4419190000";
const NEW = DEMO_BAMBOO_CODE;

function pretty(code: string) {
  const d = uk10(code) ?? code;
  return `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const on = () => setReduce(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduce;
}

type Phase = "type" | "suggest" | "correct" | "stamp";

/** Scripted bamboo sample. Classify writes invoices to the desk — not used from this public page. */
export function LandingStage() {
  const reduce = usePrefersReducedMotion();
  const [typed, setTyped] = useState(SAMPLE);
  const [phase, setPhase] = useState<Phase>("stamp");
  const [sure, setSure] = useState(72);
  const suggestRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduce) {
      setTyped(SAMPLE);
      setPhase("stamp");
      setSure(72);
      return;
    }
    let cancelled = false;
    registerLandingMotion();

    const play = async () => {
      while (!cancelled) {
        setPhase("type");
        setSure(0);
        for (let i = 1; i <= SAMPLE.length; i++) {
          if (cancelled) return;
          setTyped(SAMPLE.slice(0, i));
          await wait(22);
        }
        if (cancelled) return;
        await wait(240);
        setPhase("suggest");
        await wait(1300);
        if (cancelled) return;
        setPhase("correct");
        await wait(800);
        if (cancelled) return;
        setPhase("stamp");
        await wait(2200);
      }
    };
    void play();
    return () => {
      cancelled = true;
    };
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    if (phase === "suggest") {
      if (suggestRef.current) {
        gsap.fromTo(suggestRef.current, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" });
      }
      const obj = { n: 0 };
      gsap.to(obj, {
        n: 72,
        duration: 0.55,
        ease: "power2.out",
        onUpdate: () => setSure(Math.round(obj.n)),
      });
    }
    if (phase === "correct" && afterRef.current) {
      gsap.fromTo(afterRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, ease: "power3.out" });
    }
    if (phase === "stamp" && stampRef.current) {
      gsap.fromTo(
        stampRef.current,
        { scale: 1.55, rotate: -20, opacity: 0 },
        { scale: 1, rotate: -6, opacity: 1, duration: 0.48, ease: "back.out(1.7)" },
      );
    }
  }, [phase, reduce]);

  const showSuggest = phase !== "type";
  const showCorrect = phase === "correct" || phase === "stamp";
  const showStamp = phase === "stamp";

  return (
    <div className="landing-stage flex h-full min-h-[22rem] flex-col justify-between rounded-md border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="landing-kicker text-primary">Scripted sample</p>
        <p className="text-[11px] font-medium text-muted-foreground">Bamboo line from the 3-minute demo</p>
      </div>

      <p className="landing-lede mt-4 min-h-[2.4em] text-[1.35rem] sm:text-[1.6rem]">
        {typed}
        {phase === "type" && <span className="ml-0.5 inline-block w-[0.55ch] animate-pulse bg-primary align-[-0.08em]">&nbsp;</span>}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div
          ref={suggestRef}
          className={cn(
            "rounded-md border border-border/80 bg-background px-3 py-2.5",
            !showSuggest && "invisible",
          )}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Suggested</p>
          <p className={cn("mt-1 font-mono text-lg font-semibold tracking-tight", showCorrect && "line-through opacity-45")}>
            {pretty(OLD)}
          </p>
          <p className="text-sm text-muted-foreground">{sure}% sure · 0% duty</p>
        </div>
        <div
          ref={afterRef}
          className={cn(
            "rounded-md border border-primary/35 bg-primary/[0.04] px-3 py-2.5",
            !showCorrect && "invisible",
          )}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">Corrected</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-primary">{pretty(NEW)}</p>
          <p className="text-sm text-muted-foreground">6% · plastics, not wood</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border/70 pt-3">
        <p className={cn("max-w-[34ch] text-[13px] leading-snug text-muted-foreground", !showSuggest && "invisible")}>
          Receipt: decided just now · tariff notes read · {showCorrect ? "Precedent #1" : "no precedent yet"} · not classified
          from this page.
        </p>
        <span
          ref={stampRef}
          className={cn(
            "inline-flex items-center rounded-sm border-2 border-primary px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary",
            !showStamp && "invisible",
          )}
          style={{ rotate: "-6deg" }}
        >
          Precedent saved
        </span>
      </div>
    </div>
  );
}
