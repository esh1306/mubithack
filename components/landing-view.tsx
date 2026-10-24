"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { Wordmark } from "@/components/mark";
import { DEMO_SAMPLE_ID } from "@/lib/demo";

const DEMO_HREF = `/harbourline/classify?sample=${DEMO_SAMPLE_ID}&demo=1`;
const DESK_HREF = "/harbourline/home";

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

function ScrollProgress() {
  const [p, setP] = useState(0);
  useLenis((lenis) => setP(lenis.progress));
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px bg-border" aria-hidden>
      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, p * 100))}%` }} />
    </div>
  );
}

function LandingBody() {
  return (
    <div className="landing bg-background text-foreground">
      <ScrollProgress />

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-background/70 px-5 py-5 backdrop-blur-sm sm:px-10 md:px-16 lg:px-20">
        <Link href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Wordmark size={26} />
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-5">
          <Link href={DESK_HREF} className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Open the desk
          </Link>
          <Link
            href={DEMO_HREF}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try the demo
          </Link>
        </nav>
      </header>

      <section className="flex min-h-[100svh] flex-col justify-end px-5 pb-16 pt-28 sm:px-10 sm:pb-24 md:px-16 lg:px-20">
        <p className="mb-7 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">A desk for UK brokers</p>
        <h1 className="landing-display">
          Teach it
          <br />
          once.
        </h1>
        <p className="mt-8 font-serif text-2xl italic text-foreground sm:text-3xl">It remembers.</p>
      </section>
    </div>
  );
}

export function LandingView() {
  const reduce = usePrefersReducedMotion();
  const [smooth, setSmooth] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setSmooth(true);
  }, []);

  if (!smooth || reduce) return <LandingBody />;

  return (
    <ReactLenis root options={{ autoRaf: true, lerp: 0.09, smoothWheel: true }}>
      <LandingBody />
    </ReactLenis>
  );
}
