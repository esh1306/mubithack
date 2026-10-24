"use client";

import { useEffect, useRef } from "react";
import { Wordmark } from "@/components/mark";
import { HmrcMark, MubitMark, QwenMark, ShopifyMark } from "@/components/partner-marks";
import { SpotlightCard } from "@/components/bits/spotlight-card";
import { LogoLoop } from "@/components/bits/logo-loop";
import { gsap, registerLandingMotion, ScrollTrigger } from "@/components/landing-motion";

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
  if (id === "mubit") return <MubitMark size={16} className="text-foreground [&_rect]:fill-foreground [&_path]:fill-background" />;
  return (
    <span className="flex flex-col items-start gap-1">
      <HmrcMark stacked className="text-[13px]" />
      <span className="rounded-sm bg-[#1D70B8]/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7EB6FF]">
        Sandbox
      </span>
    </span>
  );
}

export function LandingStory() {
  const journey = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = journey.current;
    if (!root) return;
    registerLandingMotion();
    const cards = root.querySelectorAll<HTMLElement>("[data-step]");
    const lines = root.querySelectorAll<HTMLElement>("[data-line]");
    const titles = root.querySelectorAll<HTMLElement>("[data-reveal]");

    titles.forEach((t) => {
      gsap.from(t, {
        y: 22,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        scrollTrigger: { trigger: t, start: "top 86%" },
      });
    });

    const desktop = window.matchMedia("(min-width: 1024px)");
    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (desktop.matches) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top 18%",
            end: "+=70%",
            pin: true,
            pinSpacing: true,
            scrub: 0.65,
          },
        });
        gsap.set(cards, { opacity: 0, y: 28 });
        gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });
        cards.forEach((card, i) => {
          if (i > 0) tl.to(lines[i - 1], { scaleX: 1, duration: 0.3 }, ">");
          tl.to(card, { opacity: 1, y: 0, duration: 0.4 }, i === 0 ? 0 : ">-0.05");
        });
      } else {
        cards.forEach((card, i) => {
          gsap.from(card, {
            y: 20,
            opacity: 0,
            duration: 0.45,
            delay: i * 0.04,
            scrollTrigger: { trigger: card, start: "top 90%" },
          });
        });
      }
    }, root);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === root || (st.trigger instanceof Element && root.contains(st.trigger))) st.kill();
      });
    };
  }, []);

  return (
    <div>
      <section className="border-t border-foreground/10 px-5 py-12 sm:px-8 lg:px-10">
        <p className="landing-kicker text-foreground/50">Works with</p>
        <p className="mt-2 text-[13px] font-medium text-foreground/55">Names for orientation. Not a partnership.</p>
        <div className="mt-5">
          <LogoLoop>
            <ShopifyMark size={26} />
            <span className="text-[15px] font-extrabold tracking-tight">Shopify</span>
            <MubitMark size={16} className="text-foreground [&_rect]:fill-foreground [&_path]:fill-background" />
            <QwenMark size={24} />
            <span className="text-[15px] font-extrabold tracking-tight">Qwen</span>
            <HmrcMark className="text-[14px]" />
          </LogoLoop>
        </div>
      </section>

      <section id="journey" className="border-t border-foreground/10 px-5 py-16 sm:px-8 lg:px-10">
        <div ref={journey}>
          <p className="landing-kicker text-primary" data-reveal>
            Store to sandbox
          </p>
          <h2 className="landing-display mt-2 max-w-[14ch] overflow-visible" data-reveal>
            Shopify in. HMRC sandbox out.
          </h2>
          <div className="mt-8 flex flex-col lg:flex-row lg:items-stretch">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex min-w-0 flex-col lg:flex-1 lg:flex-row">
                {i > 0 && (
                  <div
                    data-line
                    className="ml-6 h-8 w-1 shrink-0 rounded-full bg-primary lg:mx-0 lg:mt-8 lg:ml-0 lg:h-1 lg:w-5"
                    aria-hidden
                  />
                )}
                <SpotlightCard data-step className="flex-1">
                  <div className="mb-3 flex min-h-10 items-center">
                    <StepMark id={s.id} />
                  </div>
                  <p className="landing-kicker text-primary">0{i + 1}</p>
                  <h3 className="mt-1.5 text-[1.2rem] font-extrabold leading-[1.15] tracking-[-0.03em]">{s.title}</h3>
                  <p className="mt-2 text-[14px] font-medium leading-snug text-foreground/75">{s.body}</p>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="receipt" className="border-t border-foreground/10 px-5 py-16 sm:px-8 lg:px-10">
        <p className="landing-kicker text-primary">A receipt</p>
        <h2 className="landing-display mt-2 max-w-[12ch] overflow-visible">Every code shows its working.</h2>
        <SpotlightCard className="mt-8 max-w-xl">
          <p className="font-mono text-[15px] font-bold">3924 10 00 19</p>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1 text-[13px] font-semibold">
            <dt className="text-foreground/50">Tariff notes</dt>
            <dd>Read</dd>
            <dt className="text-foreground/50">Duty</dt>
            <dd>6%</dd>
            <dt className="text-foreground/50">Precedent</dt>
            <dd>#1 this firm</dd>
            <dt className="text-foreground/50">Source</dt>
            <dd>Broker signed · not guessed</dd>
          </dl>
        </SpotlightCard>
      </section>

      <section id="lookback" className="border-t border-foreground/10 px-5 py-16 sm:px-8 lg:px-10">
        <p className="landing-kicker text-primary">3-year scan</p>
        <h2 className="landing-display mt-2 max-w-[14ch] overflow-visible">Reclaim or disclose.</h2>
        <p className="mt-3 max-w-xl text-[15px] font-medium text-foreground/70">
          Overpaid is a reclaim. Underpaid is a disclose. No £0 rows.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-3xl">
          <SpotlightCard>
            <p className="landing-kicker text-secondary">Over</p>
            <p className="mt-2 font-[family-name:var(--font-display-face)] text-4xl font-extrabold uppercase">Reclaim</p>
            <p className="mt-2 text-[14px] font-medium text-foreground/70">Duty paid above today&apos;s rate, inside 3 years.</p>
          </SpotlightCard>
          <SpotlightCard>
            <p className="landing-kicker text-primary">Under</p>
            <p className="mt-2 font-[family-name:var(--font-display-face)] text-4xl font-extrabold uppercase">Disclose</p>
            <p className="mt-2 text-[14px] font-medium text-foreground/70">Duty unpaid against the signed code.</p>
          </SpotlightCard>
        </div>
      </section>
    </div>
  );
}
