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

/** Scripted bamboo sample. Classify writes invoices — this page never calls it. */
export function LandingStage() {
  const reduce = usePrefersReducedMotion();
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("type");
  const [sure, setSure] = useState(0);
  const suggestRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);

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
        await wait(200);
        setPhase("suggest");
        await wait(1200);
        if (cancelled) return;
        setPhase("correct");
        await wait(700);
        if (cancelled) return;
        setPhase("stamp");
        await wait(2000);
      }
    };
    void play();
    return () => {
      cancelled = true;
    };
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    if (phase === "suggest" && suggestRef.current) {
      gsap.fromTo(suggestRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
      const obj = { n: 0 };
      gsap.to(obj, { n: 72, duration: 0.5, ease: "power2.out", onUpdate: () => setSure(Math.round(obj.n)) });
    }
    if (phase === "correct" && afterRef.current) {
      gsap.fromTo(afterRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
    }
    if (phase === "stamp" && stampRef.current) {
      gsap.fromTo(
        stampRef.current,
        { scale: 1.2, rotate: -12, opacity: 0 },
        { scale: 1, rotate: -4, opacity: 1, duration: 0.4, ease: "back.out(1.6)" },
      );
    }
  }, [phase, reduce]);

  const showSuggest = phase !== "type";
  const showCorrect = phase === "correct" || phase === "stamp";
  const showStamp = phase === "stamp";

  return (
    <div className="rounded-md border-2 border-foreground/20 bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="landing-kicker text-primary">Scripted sample</p>
        <p className="text-[12px] font-medium text-foreground/70">Bamboo line from the 3-minute demo</p>
      </div>

      <p className="mt-3 min-h-[2.6em] text-[1.2rem] font-extrabold leading-[1.15] tracking-[-0.04em] sm:text-[1.35rem]">
        {typed}
        {phase === "type" && <span className="ml-0.5 inline-block h-[1em] w-[0.45ch] bg-primary align-[-0.1em]" aria-hidden />}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div
          ref={suggestRef}
          className={cn("rounded-md border-2 border-foreground/15 bg-background px-3 py-2.5", !showSuggest && "opacity-40")}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-foreground/70">Suggested</p>
          <p className={cn("mt-1 font-mono text-[1.05rem] font-bold tracking-tight", showCorrect && "line-through opacity-50")}>
            {showSuggest ? pretty(OLD) : "—"}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-foreground/80">{showSuggest ? `${sure}% sure · 0% duty` : "Waiting"}</p>
        </div>
        <div
          ref={afterRef}
          className={cn(
            "rounded-md border-2 px-3 py-2.5",
            showCorrect ? "border-primary bg-primary/[0.06]" : "border-foreground/15 bg-background opacity-40",
          )}
        >
          <p className={cn("text-[11px] font-extrabold uppercase tracking-wide", showCorrect ? "text-primary" : "text-foreground/70")}>
            Corrected
          </p>
          <p className={cn("mt-1 font-mono text-[1.05rem] font-bold tracking-tight", showCorrect && "text-primary")}>
            {showCorrect ? pretty(NEW) : "—"}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-foreground/80">{showCorrect ? "6% · plastics, not wood" : "Broker fix"}</p>
        </div>
      </div>

      <div className="mt-3 rounded-md border-2 border-foreground/15 bg-background px-3 py-2.5">
        <p className="landing-kicker text-foreground/70">Mini receipt</p>
        <dl className="mt-2 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1 text-[13px] font-semibold leading-snug">
          <dt className="text-foreground/55">Tariff notes</dt>
          <dd>{showSuggest ? "Read" : "—"}</dd>
          <dt className="text-foreground/55">Duty</dt>
          <dd>{showCorrect ? "6%" : showSuggest ? "0%" : "—"}</dd>
          <dt className="text-foreground/55">Precedent</dt>
          <dd>{showCorrect ? "#1 this firm" : "None yet"}</dd>
          <dt className="text-foreground/55">Source</dt>
          <dd>Scripted · not classified here</dd>
        </dl>
        <div
          ref={stampRef}
          className={cn(
            "mt-3 inline-block border-2 border-primary px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-primary",
            !showStamp && "invisible",
          )}
        >
          Precedent saved
        </div>
      </div>
    </div>
  );
}
