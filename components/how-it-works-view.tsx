"use client";

import { useEffect, useRef } from "react";
import { SiteNav } from "@/components/site-nav";
import { Wordmark } from "@/components/mark";
import { HmrcMark, MubitMark, ShopifyMark } from "@/components/partner-marks";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

const STEPS = [
  {
    id: "shopify",
    title: "Shopify store connects",
    body: "A client clicks Connect. Precedent imports the catalogue as lines.",
  },
  {
    id: "suggest",
    title: "Precedent suggests a code",
    body: "Each listing gets a 10-digit code, a reason, and a receipt.",
  },
  {
    id: "correct",
    title: "The broker corrects one",
    body: "That fix is saved as a precedent for this firm only.",
  },
  {
    id: "mubit",
    title: "Mubit is taught",
    body: "Paraphrases go through this broker's task. We count examples toward 25. We cannot see if an adapter is live.",
  },
  {
    id: "hmrc",
    title: "HMRC sandbox",
    body: "Sign in once, then file a classified invoice as an H1. Sandbox only — not live CDS.",
  },
] as const;

function StepMark({ id }: { id: (typeof STEPS)[number]["id"] }) {
  if (id === "shopify") return <ShopifyMark size={28} />;
  if (id === "suggest") return <Wordmark size={22} />;
  if (id === "correct") {
    return <span className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-primary">Fix</span>;
  }
  if (id === "mubit") return <MubitMark size={16} />;
  return (
    <span className="flex flex-col items-start gap-1">
      <HmrcMark stacked className="text-[13px]" />
      <span className="rounded-sm bg-[#1D70B8]/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#1D70B8]">
        Sandbox
      </span>
    </span>
  );
}

export function HowItWorksView() {
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = row.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    registerLandingMotion();
    const cards = root.querySelectorAll<HTMLElement>("[data-step]");
    const lines = root.querySelectorAll<HTMLElement>("[data-line]");
    gsap.set(cards, { opacity: 0, y: 18 });
    lines.forEach((line) => {
      const box = line.getBoundingClientRect();
      const vertical = box.height > box.width;
      gsap.set(line, {
        scaleX: vertical ? 1 : 0,
        scaleY: vertical ? 0 : 1,
        transformOrigin: vertical ? "center top" : "left center",
      });
    });
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    cards.forEach((card, i) => {
      if (i > 0) {
        const line = lines[i - 1];
        const box = line.getBoundingClientRect();
        const vertical = box.height >= box.width;
        tl.to(line, vertical ? { scaleY: 1, duration: 0.32 } : { scaleX: 1, duration: 0.32 }, ">-0.04");
      }
      tl.to(card, { opacity: 1, y: 0, duration: 0.42 }, i === 0 ? 0.12 : ">-0.04");
    });
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="landing min-h-[100svh] bg-background text-foreground">
      <SiteNav current="how" />
      <main className="px-5 pb-16 sm:px-8 lg:px-10">
        <p className="landing-kicker text-primary">Works with</p>
        <h1 className="landing-display mt-1 max-w-[14ch] overflow-visible">Store to sandbox.</h1>
        <p className="mt-3 max-w-xl text-[15px] font-medium leading-snug text-foreground/75">
          What the desk actually does. No live custom model. HMRC is sandbox.
        </p>

        <div ref={row} className="mt-8">
          <div className="flex flex-col xl:flex-row xl:items-stretch">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex min-w-0 flex-col xl:flex-1 xl:flex-row xl:items-stretch">
                {i > 0 && (
                  <div
                    data-line
                    className="ml-6 h-8 w-1 shrink-0 self-start rounded-full bg-primary xl:mx-0 xl:mt-[1.35rem] xl:ml-0 xl:h-1 xl:w-6 xl:self-start"
                    aria-hidden
                  />
                )}
                <article
                  data-step
                  className="min-w-0 flex-1 rounded-md border-2 border-foreground/25 bg-card px-4 py-4"
                >
                  <div className="mb-3 flex min-h-10 items-center">{<StepMark id={s.id} />}</div>
                  <p className="landing-kicker text-primary">0{i + 1}</p>
                  <h2 className="mt-1.5 text-[1.2rem] font-extrabold leading-[1.15] tracking-[-0.04em]">{s.title}</h2>
                  <p className="mt-2 text-[14px] font-medium leading-snug text-foreground/80">{s.body}</p>
                </article>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-[13px] font-medium text-foreground/55">Use Try the demo in the header.</p>
      </main>
    </div>
  );
}
