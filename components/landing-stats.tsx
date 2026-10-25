"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEMO_HREF } from "@/components/site-nav";
import { gsap, registerLandingMotion, ScrollTrigger } from "@/components/landing-motion";
import {
  CIVIL_PENALTY_GBP,
  DEMO_PREFERENCE_GBP,
  DEMO_RECLAIM_GBP,
  DEMO_UNDERPAID_GBP,
  EXAMPLE_INVOICE_LINES,
  LOOKBACK_YEARS,
} from "@/lib/landing-stats";
import { BROKER_GBP_PER_HOUR, MANUAL_MIN_PER_LINE, REVIEW_MIN_PER_LINE, SAVINGS_ASSUMPTION, savings, TOUR_LINES_PER_WEEK } from "@/lib/savings";

const TARIFF = "https://www.trade-tariff.service.gov.uk";
const WORK_WEEKS = 48;

// Counts up from 0 the first time it scrolls into view, then eases to any new `to` (the ROI slider).
export function CountUp({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const obj = useRef({ n: 0 });
  const [n, setN] = useState(0);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerLandingMotion();
    const st = ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => setSeen(true) });
    return () => st.kill();
  }, []);

  useEffect(() => {
    if (!seen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tw = gsap.to(obj.current, {
      n: to,
      duration: reduce ? 0 : obj.current.n === 0 ? 1.4 : 0.5,
      ease: "power3.out",
      onUpdate: () => setN(obj.current.n),
    });
    return () => {
      tw.kill();
    };
  }, [seen, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {n.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

const PAIN = [
  {
    value: MANUAL_MIN_PER_LINE,
    suffix: " min",
    label: "to code one line by hand",
    body: "Tariff search, chapter notes, a ruling check. Our working estimate.",
  },
  {
    value: 6,
    suffix: "%",
    label: "duty swing on one bamboo set",
    body: "0% as bamboo tableware (4419), 6% as melamine (3924). The legal notes decide.",
    source: { label: "UK Trade Tariff", href: `${TARIFF}/commodities/3924100011` },
  },
  {
    value: CIVIL_PENALTY_GBP,
    prefix: "£",
    label: "maximum civil penalty per contravention",
    body: "On top of the duty HMRC recovers when a code is wrong.",
    source: { label: "Finance Act 2003 s.26", href: "https://www.legislation.gov.uk/ukpga/2003/14/section/26" },
  },
  {
    value: LOOKBACK_YEARS,
    suffix: " yrs",
    label: "then overpaid duty is gone",
    body: "Overpaid import duty can only be reclaimed within three years.",
    source: { label: "Reg 59, S.I. 2018/1248", href: "https://www.legislation.gov.uk/uksi/2018/1248/regulation/59" },
  },
];

// The need, in numbers: a dark band straight after the hero.
export function ProblemBand() {
  const handHours = (EXAMPLE_INVOICE_LINES * MANUAL_MIN_PER_LINE) / 60;
  return (
    <section id="problem" className="problem-band relative z-20">
      <div className="mx-auto max-w-[86rem] px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <p className="landing-kicker text-[#ff8a7a]" data-reveal>
          The problem
        </p>
        <h2 className="landing-display landing-section-title mt-3 max-w-[18ch]" data-reveal>
          Every line is a legal call. Made by hand.
        </h2>

        <div className="mt-14 grid items-end gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16" data-reveal>
          <p className="problem-hero-number">
            <CountUp to={handHours} suffix=" h" />
          </p>
          <div className="max-w-md pb-3">
            <p className="text-[22px] font-semibold leading-snug text-white">
              to code one {EXAMPLE_INVOICE_LINES}-line invoice by hand.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-white/65">
              {EXAMPLE_INVOICE_LINES} lines × {MANUAL_MIN_PER_LINE} minutes. That&apos;s £{handHours * BROKER_GBP_PER_HOUR} of broker time at £
              {BROKER_GBP_PER_HOUR} an hour, for one client, one shipment. An illustration, not an average.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {PAIN.map((p) => (
            <article key={p.label} className="flex flex-col bg-[#0b1f4d] p-6 lg:p-7" data-reveal>
              <p className="problem-number">
                <CountUp to={p.value} prefix={p.prefix} suffix={p.suffix} />
              </p>
              <p className="mt-3 text-[15px] font-semibold text-white">{p.label}</p>
              <p className="mt-1 flex-1 text-[14px] leading-relaxed text-white/60">{p.body}</p>
              {p.source && (
                <a href={p.source.href} target="_blank" rel="noreferrer" className="mt-4 text-[12px] font-medium text-[#93c5fd] hover:underline">
                  Source: {p.source.label}
                </a>
              )}
            </article>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-[16px] leading-relaxed text-white/70" data-reveal>
          And the broker shares the risk: an indirect representative is jointly liable for the duty.{" "}
          <a href="https://www.gov.uk/guidance/customs-debt-liability" target="_blank" rel="noreferrer" className="text-[#93c5fd] hover:underline">
            HMRC
          </a>
        </p>
      </div>
    </section>
  );
}

const FOUND = [
  { value: DEMO_RECLAIM_GBP, tone: "text-[#15803d]", label: "overpaid duty to claim back", body: "LED bulbs declared at 4% are LED lamps at 0%. Five past imports, still in the window." },
  { value: DEMO_UNDERPAID_GBP, tone: "text-[#b91c1c]", label: "underpayment caught", body: "Melamine \"bamboo\" tableware declared at 0% should pay 6%. Disclosed before an audit." },
  { value: DEMO_PREFERENCE_GBP, tone: "text-[#15803d]", label: "saved with a trade preference", body: "Bangladeshi cotton T-shirts at 0% instead of 12% under the DCTS, with proof of origin." },
];

// What it's worth to the firm: a slider over the lib/savings.ts model, then what one demo shipment found.
export function RoiBlock() {
  const [lines, setLines] = useState<number>(TOUR_LINES_PER_WEEK);
  const week = savings(lines);

  return (
    <section id="value" className="relative z-20 border-t border-[#0b1f4d]/10">
      <div className="mx-auto max-w-[86rem] px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <p className="landing-kicker text-[#c2362b]" data-reveal>
          The payback
        </p>
        <h2 className="landing-display landing-section-title mt-3 max-w-[16ch]" data-reveal>
          Two days back. Every week.
        </h2>

        <div className="roi-card mt-12" data-reveal>
          <label className="block">
            <span className="flex items-baseline justify-between gap-4 text-[14px] font-medium text-[#1e3a6e]">
              Lines your desk codes a week
              <span className="font-[family-name:var(--font-plex-mono)] text-[20px] font-semibold text-[#0b1f4d]">{lines}</span>
            </span>
            <input
              type="range"
              min={50}
              max={1000}
              step={10}
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
              className="roi-range mt-3 w-full"
            />
          </label>

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <p className="roi-number">
                <CountUp to={week.hours} suffix=" h" decimals={1} />
              </p>
              <p className="mt-2 text-[14px] font-medium text-[#1e3a6e]">broker time saved a week</p>
            </div>
            <div>
              <p className="roi-number">
                <CountUp to={week.gbp} prefix="£" />
              </p>
              <p className="mt-2 text-[14px] font-medium text-[#1e3a6e]">saved a week</p>
            </div>
            <div>
              <p className="roi-number roi-number-accent">
                <CountUp to={week.gbp * WORK_WEEKS} prefix="£" />
              </p>
              <p className="mt-2 text-[14px] font-medium text-[#1e3a6e]">a year, over {WORK_WEEKS} working weeks</p>
            </div>
          </div>
          <p className="mt-8 border-t border-[#0b1f4d]/10 pt-4 text-[12px] leading-relaxed text-[#4a5872]">
            {SAVINGS_ASSUMPTION} {MANUAL_MIN_PER_LINE - REVIEW_MIN_PER_LINE} minutes × lines ÷ 60.
          </p>
        </div>

        <h3 className="mt-20 font-[family-name:var(--font-ruling)] text-[26px] font-semibold leading-tight text-[#0b1f4d]" data-reveal>
          Then the 3-year scan pays for itself.
        </h3>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#1e3a6e]" data-reveal>
          One six-line demo invoice from Ningbo and Dhaka, re-checked against three years of the same broker&apos;s past imports:
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FOUND.map((m) => (
            <article key={m.label} className="rounded-xl border border-[#0b1f4d]/10 bg-white/80 p-6 backdrop-blur-md" data-reveal>
              <p className={`font-[family-name:var(--font-ruling)] text-[52px] font-semibold leading-none ${m.tone}`}>
                <CountUp to={m.value} prefix="£" />
              </p>
              <p className="mt-3 text-[15px] font-semibold text-[#0b1f4d]">{m.label}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#1e3a6e]">{m.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-10" data-reveal>
          <Link href={DEMO_HREF} className="landing-cta landing-cta-primary">
            Run the demo shipment
          </Link>
        </div>
      </div>
    </section>
  );
}
