"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import {
  alongGreatCircle,
  DESTINATIONS,
  diveAmount,
  flightAmount,
  LONDON,
  SHENZHEN,
  TRADE_ARCS,
} from "@/lib/landing-geo";
import { StaticGlobe } from "@/components/static-globe";

export type EarthApi = {
  setProgress: (t: number) => void;
  setWhoosh: (t: number) => void;
  pause: () => void;
  resume: () => void;
};

type LandFeat = { type: string; geometry?: unknown };
type HtmlPin = { lat: number; lng: number; name: string; sub: string };

function oceanTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#2F6BFF");
  g.addColorStop(0.28, "#1E4FD8");
  g.addColorStop(0.62, "#1638A0");
  g.addColorStop(1, "#0F2A6B");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  const rad = ctx.createRadialGradient(360, 130, 16, 380, 170, 420);
  rad.addColorStop(0, "rgba(191, 219, 254, 0.5)");
  rad.addColorStop(0.4, "rgba(96, 165, 250, 0.16)");
  rad.addColorStop(1, "rgba(15, 42, 107, 0)");
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "rgba(191, 219, 254, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 24; y < 512; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  return c.toDataURL("image/png");
}

function stampEl(title: string, sub: string) {
  const el = document.createElement("div");
  el.className = "globe-html-pin globe-html-pin-pop";
  el.innerHTML = `<i></i><span><b>${title}</b><small>${sub}</small></span>`;
  return el;
}

function passWheel(el: HTMLElement) {
  el.style.pointerEvents = "none";
  el.style.touchAction = "pan-y";
  for (const canvas of el.querySelectorAll("canvas")) {
    canvas.style.pointerEvents = "none";
    canvas.style.touchAction = "pan-y";
  }
}

export function EarthGlobe({
  onApi,
  onReady,
  mobile,
  reduced,
}: {
  onApi?: (api: EarthApi) => void;
  onReady?: () => void;
  mobile: boolean;
  reduced: boolean;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const whoosh = useRef(0);
  const arcShown = useRef(1);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [tex, setTex] = useState<string | null>(null);
  const [land, setLand] = useState<LandFeat[]>([]);
  const [arcN, setArcN] = useState(1);

  const spin = (t = whoosh.current) => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.32 + 0.55 * Math.sin(Math.PI * t);
  };

  useEffect(() => {
    setTex(oceanTexture());
    void import("world-atlas/countries-110m.json").then((mod) => {
      const topo = mod.default as { objects: { countries: Parameters<typeof feature>[1] } };
      const fc = feature(topo as never, topo.objects.countries) as { features?: LandFeat[] };
      setLand(fc.features ?? []);
    });
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    passWheel(el);
    const io = new IntersectionObserver(
      ([entry]) => {
        const g = globeRef.current;
        if (!g) return;
        if (entry.isIntersecting) g.resumeAnimation();
        else g.pauseAnimation();
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  const apply = (t: number) => {
    progress.current = t;
    const u = flightAmount(t);
    const d = diveAmount(t);
    const here = alongGreatCircle(SHENZHEN, LONDON, u);
    spin();
    const g = globeRef.current;
    if (!g) return;
    if (d <= 0) {
      g.pointOfView(
        {
          lat: 28 + (here.lat - 28) * u * 0.35,
          lng: 70 + (here.lng - 70) * u,
          altitude: mobile ? 2.55 : 2.05,
        },
        0,
      );
    } else {
      g.pointOfView(
        {
          lat: 48 + 6 * d,
          lng: 8 - 10 * d,
          altitude: (mobile ? 2.55 : 2.05) - 1.3 * d,
        },
        0,
      );
    }
  };

  const setWhoosh = (t: number) => {
    whoosh.current = t;
    spin(t);
    const n = Math.max(1, Math.ceil(t * TRADE_ARCS.length));
    if (n !== arcShown.current) {
      arcShown.current = n;
      setArcN(n);
    }
  };

  useEffect(() => {
    onApi?.({
      setProgress: apply,
      setWhoosh,
      pause: () => globeRef.current?.pauseAnimation(),
      resume: () => globeRef.current?.resumeAnimation(),
    });
  });

  const arcs = useMemo(
    () =>
      TRADE_ARCS.slice(0, arcN).map((a) => ({
        startLat: a.start.lat,
        startLng: a.start.lng,
        endLat: a.end.lat,
        endLng: a.end.lng,
        colors: a.colors,
        dash: a.dash,
        main: a.main,
      })),
    [arcN],
  );

  const pins = useMemo<HtmlPin[]>(() => DESTINATIONS.map((d) => ({ ...d, sub: "UK" })), []);

  const rings = useMemo(
    () => DESTINATIONS.map((d, i) => ({ lat: d.lat, lng: d.lng, maxR: 3.2 + i * 0.4, period: 900 + i * 220 })),
    [],
  );

  if (reduced) {
    return (
      <div ref={wrap} className="globe-layer absolute inset-0 grid place-items-center">
        <StaticGlobe className={mobile ? "h-[46vw] max-h-[280px] w-[46vw] max-w-[280px]" : "h-[min(72vh,640px)] w-[min(72vh,640px)]"} />
      </div>
    );
  }

  return (
    <div ref={wrap} className="globe-layer absolute inset-0">
      {!ready && (
        <div className="absolute inset-0 grid place-items-center">
          <StaticGlobe className={mobile ? "h-[46vw] max-h-[280px] w-[46vw] max-w-[280px]" : "h-[min(72vh,640px)] w-[min(72vh,640px)]"} />
        </div>
      )}
      {tex && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={tex}
          showAtmosphere
          atmosphereColor="#9ED0FF"
          atmosphereAltitude={0.26}
          hexPolygonsData={land}
          hexPolygonColor={() => "#E8F4FF"}
          hexPolygonAltitude={0.003}
          hexPolygonResolution={mobile ? 2 : 3}
          hexPolygonMargin={0.68}
          hexPolygonUseDots
          hexPolygonsTransitionDuration={0}
          arcsData={arcs}
          arcColor={(d: object) => (d as { colors: string[] }).colors}
          arcStroke={(d: object) => ((d as { main?: boolean }).main ? 0.95 : 0.48)}
          arcDashLength={0.28}
          arcDashGap={0.55}
          arcDashAnimateTime={(d: object) => (d as { dash: number }).dash}
          arcAltitudeAutoScale={0.42}
          arcsTransitionDuration={600}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(232,244,255,${0.7 * (1 - t)})`}
          ringMaxRadius="maxR"
          ringPropagationSpeed={2.4}
          ringRepeatPeriod="period"
          htmlElementsData={pins}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.018}
          htmlElement={(d) => stampEl((d as HtmlPin).name.toUpperCase(), (d as HtmlPin).sub)}
          htmlTransitionDuration={0}
          enablePointerInteraction={false}
          onGlobeReady={() => {
            const g = globeRef.current;
            if (!g) return;
            spin(0);
            g.pointOfView({ lat: 28, lng: 55, altitude: mobile ? 2.55 : 2.05 }, 0);
            if (wrap.current) passWheel(wrap.current);
            setReady(true);
            apply(progress.current);
            onReady?.();
          }}
        />
      )}
    </div>
  );
}

export default EarthGlobe;
