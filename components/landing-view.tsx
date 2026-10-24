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
    body: "Connect a client's store. Listings come in. Approved 10-digit codes write back.",
  },
  {
    k: "02",
    title: "HMRC sandbox",
    body: "Sign in once. File a classified invoice as an H1. Sandbox only — not live CDS.",
  },
  {
    k: "03",
    title: "A receipt",
    body: "When it was decided, which notes, which precedent, Mubit request IDs.",
  },
  {
    k: "04",
    title: "3-year scan",
    body: "Overpaid is a reclaim. Underpaid is a disclose. No £0 rows.",
  },
  {
    k: "05",
    title: "Mubit",
    body: "This broker's task. We count examples toward 25. We cannot see if an adapter is live.",
  },
] as const;

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
            {BENTO.map((b) => (
              <li
                key={b.k}
                className="rounded-md border border-border bg-card px-3 py-3 shadow-card sm:px-3.5 sm:py-3.5"
              >
                <p className="landing-kicker text-primary">{b.k}</p>
                <h2 className="mt-1.5 text-[1.05rem] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-[1.2rem]">
                  {b.title}
                </h2>
                <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{b.body}</p>
              </li>
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
