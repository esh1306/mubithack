"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { Wordmark } from "@/components/mark";
import { DEMO_SAMPLE_ID } from "@/lib/demo";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "problem", num: "01" },
  { id: "how", num: "02" },
] as const;
const SECTION_IDS = SECTIONS.map((s) => s.id);

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

function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (on?.target.id) setActive(on.target.id);
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-15% 0px -35% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [ids]);
  return active;
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setOn(true);
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("landing-reveal", on && "is-on", className)}>
      {children}
    </div>
  );
}

function Section({
  id,
  num,
  kicker,
  title,
  children,
}: {
  id: string;
  num: string;
  kicker: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex min-h-[100svh] flex-col justify-center px-5 py-28 sm:px-10 md:px-16 lg:px-20">
      <Reveal>
        <p className="mb-6 flex items-baseline gap-4 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
          <span className="tabular-nums">{num}</span>
          <span>{kicker}</span>
        </p>
        <h2 className="landing-display max-w-[16ch]">{title}</h2>
        <div className="mt-10 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">{children}</div>
      </Reveal>
    </section>
  );
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
  const active = useActiveSection(SECTION_IDS);
  return (
    <div className="landing bg-background text-foreground">
      <ScrollProgress />
      <a
        href="#story"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to story
      </a>

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

      <nav
        aria-label="On this page"
        className="pointer-events-none fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cn(
              "pointer-events-auto text-[11px] tabular-nums tracking-[0.18em] transition-colors",
              active === s.id ? "text-primary" : "text-muted-foreground/70 hover:text-foreground",
            )}
          >
            {s.num}
          </a>
        ))}
      </nav>

      <div id="story">
        <Section id="problem" num="01" kicker="The problem" title={<>17,000 codes.</>}>
          <p>
            Every product into the UK needs a 10-digit commodity code. Small brokers pick them by hand. Guess wrong and
            you face a fine — or duty you already paid and may never get back.
          </p>
        </Section>

        <Section id="how" num="02" kicker="How it works" title={<>Correct it once.</>}>
          <p>
            Precedent suggests a code and a reason. You fix one line in your own words. That fix is saved as a precedent,
            and we send paraphrases of it through Mubit on this broker&apos;s task. The next similar product — even one
            this broker has never seen — comes back with the same code. Each firm&apos;s judgement stays theirs.
          </p>
        </Section>
      </div>
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
