"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/mark";
import { LandingStage } from "@/components/landing-stage";
import { gsap, registerLandingMotion, SplitText } from "@/components/landing-motion";
import { DEMO_SAMPLE_ID } from "@/lib/demo";

const DEMO_HREF = `/harbourline/classify?sample=${DEMO_SAMPLE_ID}&demo=1`;
const DESK_HREF = "/harbourline/home";

const BENTO = [
  {
    k: "01",
    title: "Shopify",
    flow: "Connect → listings in → codes back",
    body: "A client's store. Approved 10-digit codes write back to each product.",
  },
  {
    k: "02",
    title: "HMRC sandbox",
    flow: "Sign in → H1 XML → sandbox",
    body: "File a classified invoice. Sandbox only — not live CDS.",
  },
  {
    k: "03",
    title: "A receipt",
    flow: "When · notes · precedent · IDs",
    body: "Every code can show its working. The broker signs it.",
  },
  {
    k: "04",
    title: "3-year scan",
    flow: "Reclaim or disclose",
    body: "Overpaid is a reclaim. Underpaid is a disclose. No £0 rows.",
  },
  {
    k: "05",
    title: "Mubit",
    flow: "Examples toward 25",
    body: "This broker's task. We cannot see if an adapter is live.",
  },
] as const;

function BentoCard({ item, i }: { item: (typeof BENTO)[number]; i: number }) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    registerLandingMotion();
    gsap.fromTo(
      el,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, delay: 0.12 + i * 0.06, ease: "power3.out" },
    );
    const enter = () => gsap.to(el, { y: -3, duration: 0.22, ease: "power2.out" });
    const leave = () => gsap.to(el, { y: 0, duration: 0.28, ease: "power2.out" });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [i]);

  return (
    <li ref={ref} className="rounded-md border border-border bg-card px-3 py-3 shadow-card sm:px-3.5 sm:py-3.5">
      <p className="landing-kicker text-primary">{item.k}</p>
      <h2 className="mt-1.5 text-[1.05rem] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-[1.2rem]">{item.title}</h2>
      <p className="mt-1 text-[11px] font-extrabold tracking-[-0.02em] text-foreground/80">{item.flow}</p>
      <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{item.body}</p>
    </li>
  );
}

function Headline() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    registerLandingMotion();
    const split = SplitText.create(el, { type: "chars,words,lines", mask: "lines" });
    const tw = gsap.from(split.chars, {
      yPercent: 115,
      duration: 0.72,
      stagger: 0.016,
      ease: "power3.out",
    });
    return () => {
      tw.kill();
      split.revert();
    };
  }, []);

  return (
    <h1 ref={ref} className="landing-display max-w-[16ch]">
      Code it once.
      <br />
      Never again.
    </h1>
  );
}

export function LandingView() {
  return (
    <div className="landing flex min-h-[100svh] flex-col bg-background text-foreground lg:h-[100svh] lg:overflow-hidden">
      <header className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Wordmark size={24} />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={DESK_HREF} className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Open the desk
          </Link>
          <Link
            href={DEMO_HREF}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 font-extrabold tracking-tight text-primary-foreground hover:bg-primary/90"
          >
            Try the demo
          </Link>
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-5 pb-5 sm:px-8 lg:px-10 lg:pb-6">
        <Headline />

        <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="min-h-0 lg:col-span-7">
            <LandingStage />
          </div>
          <ul className="grid grid-cols-2 content-start gap-2 sm:gap-3 lg:col-span-5 lg:grid-cols-2">
            {BENTO.map((b, i) => (
              <BentoCard key={b.k} item={b} i={i} />
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 lg:mt-5">
          <Link
            href={DEMO_HREF}
            className="inline-flex h-12 items-center rounded-md bg-primary px-7 text-base font-extrabold tracking-tight text-primary-foreground hover:bg-primary/90"
          >
            Try the demo
          </Link>
          <Link href={DESK_HREF} className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Open the desk
          </Link>
          <p className="w-full text-[12px] text-muted-foreground sm:ml-auto sm:w-auto sm:max-w-xs sm:text-right">
            Suggestions only. The broker signs every code.
          </p>
        </div>
      </main>
    </div>
  );
}
