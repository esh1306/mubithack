"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import {
  alongGreatCircle,
  DESTINATIONS,
  diveAmount,
  flightAmount,
  headingDegrees,
  LONDON,
  SHENZHEN,
  TRADE_ARCS,
} from "@/lib/landing-geo";
import { StaticGlobe } from "@/components/static-globe";

export type EarthApi = {
  setProgress: (t: number) => void;
  pause: () => void;
  resume: () => void;
};

type LandFeat = { type: string; geometry?: unknown };
type HtmlPin = { lat: number; lng: number; name: string; sub: string; kind?: string; heading?: number; alt?: number };

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

function planeEl(heading: number) {
  const el = document.createElement("div");
  el.className = "globe-airliner";
  el.innerHTML = `<img src="/plane-side.webp" alt="" />`;
  el.style.transform = `rotate(${90 - heading}deg)`;
  return el;
}

export function EarthGlobe({
  onApi,
  mobile,
  reduced,
}: {
  onApi?: (api: EarthApi) => void;
  mobile: boolean;
  reduced: boolean;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const planeNode = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [tex, setTex] = useState<string | null>(null);
  const [land, setLand] = useState<LandFeat[]>([]);
  const [craft, setCraft] = useState(() => ({
    lat: SHENZHEN.lat,
    lng: SHENZHEN.lng,
    alt: 0.18,
    heading: headingDegrees(SHENZHEN, LONDON),
  }));

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
    const next = alongGreatCircle(SHENZHEN, LONDON, Math.min(1, u + 0.02));
    const heading = headingDegrees({ ...here, name: "" }, { ...next, name: "" });
    setCraft({
      lat: here.lat,
      lng: here.lng,
      alt: 0.1 + 0.22 * Math.sin(Math.PI * u),
      heading,
    });
    if (planeNode.current) {
      planeNode.current.style.transform = `rotate(${90 - heading}deg)`;
    }
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = t < 0.05 && !reduced;
    controls.autoRotateSpeed = 0.35;
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

  useEffect(() => {
    onApi?.({
      setProgress: apply,
      pause: () => globeRef.current?.pauseAnimation(),
      resume: () => globeRef.current?.resumeAnimation(),
    });
  });

  const arcs = useMemo(
    () =>
      TRADE_ARCS.map((a) => ({
        startLat: a.start.lat,
        startLng: a.start.lng,
        endLat: a.end.lat,
        endLng: a.end.lng,
        colors: a.colors,
        dash: a.dash,
        main: a.main,
      })),
    [],
  );

  const pins = useMemo<HtmlPin[]>(() => DESTINATIONS.map((d) => ({ ...d, sub: "UK" })), []);

  const htmlData = useMemo<HtmlPin[]>(() => {
    if (mobile) return pins;
    return [
      ...pins,
      {
        lat: craft.lat,
        lng: craft.lng,
        name: "plane",
        sub: "",
        kind: "plane",
        heading: craft.heading,
        alt: craft.alt,
      },
    ];
  }, [pins, craft, mobile]);

  const rings = useMemo(
    () => DESTINATIONS.map((d, i) => ({ lat: d.lat, lng: d.lng, maxR: 3.2 + i * 0.4, period: 900 + i * 220 })),
    [],
  );

  if (reduced) {
    return (
      <div ref={wrap} className="absolute inset-0 grid place-items-center">
        <StaticGlobe className={mobile ? "h-[46vw] max-h-[280px] w-[46vw] max-w-[280px]" : "h-[min(72vh,640px)] w-[min(72vh,640px)]"} />
      </div>
    );
  }

  return (
    <div ref={wrap} className="absolute inset-0">
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
          arcsTransitionDuration={0}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(232,244,255,${0.7 * (1 - t)})`}
          ringMaxRadius="maxR"
          ringPropagationSpeed={2.4}
          ringRepeatPeriod="period"
          htmlElementsData={htmlData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={(d: object) => ((d as HtmlPin).kind === "plane" ? ((d as HtmlPin).alt ?? 0.16) : 0.018)}
          htmlElement={(d) => {
            const pin = d as HtmlPin;
            if (pin.kind === "plane") {
              const el = planeEl(pin.heading ?? craft.heading);
              planeNode.current = el;
              return el;
            }
            return stampEl(pin.name.toUpperCase(), pin.sub);
          }}
          htmlTransitionDuration={0}
          enablePointerInteraction
          onGlobeReady={() => {
            const g = globeRef.current;
            if (!g) return;
            g.controls().enableZoom = false;
            g.controls().autoRotate = true;
            g.controls().autoRotateSpeed = 0.35;
            g.pointOfView({ lat: 28, lng: 55, altitude: mobile ? 2.55 : 2.05 }, 0);
            setReady(true);
            apply(progress.current);
          }}
        />
      )}
    </div>
  );
}

export default EarthGlobe;
