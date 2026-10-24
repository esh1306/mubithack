"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { Wordmark } from "@/components/mark";
import { HmrcMark, MubitMark, ShopifyMark } from "@/components/partner-marks";
import { CargoCraft } from "@/components/cargo-craft";
import { JOURNEY_STEPS } from "@/lib/landing-steps";
import { FELIXSTOWE, LONDON, pinAmount, SHENZHEN, unfoldAmount } from "@/lib/landing-geo";

export type MapApi = { setProgress: (t: number) => void };

const ROUTE = [
  { x: 0.86, y: 0.58 },
  { x: 0.72, y: 0.42 },
  { x: 0.52, y: 0.36 },
  { x: 0.34, y: 0.32 },
  { x: 0.2, y: 0.3 },
];

function StepMark({ mark }: { mark: (typeof JOURNEY_STEPS)[number]["mark"] }) {
  if (mark === "shopify") return <ShopifyMark size={22} />;
  if (mark === "precedent") return <Wordmark size={18} />;
  if (mark === "fix") {
    return <span className="landing-stamp-type text-[12px] font-bold text-[#E63B2E]">FIX</span>;
  }
  if (mark === "mubit") {
    return <MubitMark size={14} className="text-[#1A1A1A] [&_rect]:fill-[#1A1A1A] [&_path]:fill-[#F3EAD3]" />;
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <HmrcMark className="text-[12px]" />
      <span className="rounded-sm bg-[#1D70B8]/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#1D70B8]">
        Sandbox
      </span>
    </span>
  );
}

function MapArt({ landD, routeD, routeDraw }: { landD: string; routeD: string; routeDraw: number }) {
  return (
    <svg viewBox="0 0 1000 520" className="h-full w-full" aria-hidden>
      <rect width="1000" height="520" fill="#F3EAD3" />
      {landD && <path d={landD} fill="#7C6BFF" fillOpacity="0.14" stroke="#1A1A1A" strokeWidth="0.6" />}
      <path
        id="paper-route"
        d={routeD}
        fill="none"
        stroke="#E63B2E"
        strokeWidth="2.4"
        strokeDasharray="8 7"
        strokeLinecap="round"
        pathLength={1}
        style={{ strokeDashoffset: 1 - routeDraw }}
      />
      <CargoCraft pathId="paper-route" progress={routeDraw} />
    </svg>
  );
}

export function PaperMap({
  onApi,
  progress,
  mobile,
  reduced,
}: {
  onApi?: (api: MapApi) => void;
  progress: number;
  mobile: boolean;
  reduced: boolean;
}) {
  const [landD, setLandD] = useState("");
  const [t, setT] = useState(progress);

  useEffect(() => {
    onApi?.({ setProgress: setT });
  }, [onApi]);

  useEffect(() => {
    setT(progress);
  }, [progress]);

  useEffect(() => {
    void import("world-atlas/land-110m.json").then((mod) => {
      const topo = mod.default as { objects: { land: Parameters<typeof feature>[1] } };
      const land = feature(topo as never, topo.objects.land);
      const proj = geoMercator().center([48, 36]).scale(220).translate([500, 280]);
      setLandD(geoPath(proj)(land as never) ?? "");
    });
  }, []);

  const open = reduced ? 1 : unfoldAmount(t);
  const routeDraw = reduced ? 1 : Math.max(0, (open - 0.72) / 0.28);
  const planeU = reduced ? 1 : Math.max(0, (t - 0.62) / 0.34);

  const routeD = useMemo(() => {
    return `M ${ROUTE[0].x * 1000},${ROUTE[0].y * 520} C ${ROUTE[1].x * 1000},${ROUTE[1].y * 520} ${ROUTE[2].x * 1000},${ROUTE[2].y * 520} ${ROUTE[3].x * 1000},${ROUTE[3].y * 520} L ${ROUTE[4].x * 1000},${ROUTE[4].y * 520}`;
  }, []);

  if (mobile || reduced) {
    return (
      <div className="relative">
        <svg viewBox="0 0 1000 520" className="mx-auto hidden max-h-48 w-full opacity-90 sm:block" aria-hidden>
          <rect width="1000" height="520" fill="#F3EAD3" />
          {landD && <path d={landD} fill="#7C6BFF" fillOpacity="0.14" stroke="#1A1A1A" strokeWidth="0.6" />}
          <path d={routeD} fill="none" stroke="#E63B2E" strokeWidth="2" strokeDasharray="7 6" />
        </svg>
        <ol className="mt-6 flex flex-col gap-3">
          {JOURNEY_STEPS.map((s) => (
            <li key={s.id} className="paper-card">
              <div className="mb-2 flex items-center justify-between gap-3">
                <StepMark mark={s.mark} />
                <span className="landing-stamp-type text-[11px] text-[#C9A227]">{s.n}</span>
              </div>
              <p className="landing-stamp-type text-[11px] tracking-[0.14em] text-[#7C6BFF]">{s.place}</p>
              <h3 className="mt-1 font-[family-name:var(--font-display-face)] text-[1.35rem] font-extrabold uppercase leading-none text-[#1A1A1A]">
                {s.title}
              </h3>
              <p className="landing-stamp-label mt-1.5">{s.label}</p>
              <p className="mt-2 text-[14px] font-medium leading-snug text-[#1A1A1A]/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const sheetPct = 8 + 84 * open;

  return (
    <div className="paper-stage">
      <div className="scroll-stage">
        <div className="scroll-roller scroll-roller-left" aria-hidden />
        <div className="scroll-clip" style={{ width: `${sheetPct}%` }}>
          <div className="scroll-inner" style={{ width: `${10000 / sheetPct}%` }}>
            <MapArt landD={landD} routeD={routeD} routeDraw={Math.max(routeDraw, planeU)} />
            {JOURNEY_STEPS.map((s, i) => {
              const p = ROUTE[i] ?? ROUTE[ROUTE.length - 1];
              const shown = pinAmount(t, i) > 0.08 || t >= 0.64 + i * 0.07;
              return (
                <article
                  key={s.id}
                  className="paper-pin"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    opacity: shown ? 1 : 0,
                    transform: `translate(-20%, -110%) scale(${shown ? 1 : 0.86})`,
                  }}
                >
                  <i className="paper-pin-needle" />
                  <div className="paper-card paper-card-float">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <StepMark mark={s.mark} />
                      <span className="landing-stamp-type text-[11px] text-[#C9A227]">{s.n}</span>
                    </div>
                    <p className="landing-stamp-type text-[10px] tracking-[0.14em] text-[#7C6BFF]">{s.place}</p>
                    <h3 className="mt-1 font-[family-name:var(--font-display-face)] text-[1.05rem] font-extrabold uppercase leading-none text-[#1A1A1A]">
                      {s.title}
                    </h3>
                    <p className="landing-stamp-label">{s.label}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="scroll-curl" aria-hidden />
        </div>
        <div className="scroll-roller scroll-roller-right" style={{ left: `calc(${sheetPct}% - 14px)` }} aria-hidden />
      </div>
      <p className="mt-3 text-center text-[11px] font-medium text-[color:var(--muted-foreground)]">
        Land from Natural Earth via world-atlas (public domain). {SHENZHEN.name} → {LONDON.name} / {FELIXSTOWE.name}.
      </p>
    </div>
  );
}
