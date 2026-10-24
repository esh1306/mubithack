"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import { LONDON, ORIGINS, TRADE_ARCS } from "@/lib/landing-geo";
import { StaticGlobe } from "@/components/static-globe";

export type EarthApi = {
  setProgress: (t: number) => void;
  setWhoosh: (t: number) => void;
  pause: () => void;
  resume: () => void;
};

const UK_VIEW = { lat: 49, lng: 8, altitude: 2.16 } as const;
const UK_VIEW_MOBILE = { lat: 49, lng: 10, altitude: 2.28 } as const;

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
  const whoosh = useRef(0);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ w: 480, h: 480 });
  const [tex, setTex] = useState<string | null>(null);
  const [land, setLand] = useState<{ type: string; geometry?: unknown }[]>([]);
  const [lit, setLit] = useState(0);

  const look = mobile ? UK_VIEW_MOBILE : UK_VIEW;

  const spin = (t = whoosh.current) => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.32 + 0.1 * Math.max(0, Math.sin(t * Math.PI * 2));
  };

  const settle = () => {
    const g = globeRef.current;
    if (!g) return;
    spin();
    g.pointOfView(look, 0);
  };

  useEffect(() => {
    setTex(oceanTexture());
    void import("world-atlas/countries-110m.json").then((mod) => {
      const topo = mod.default as { objects: { countries: Parameters<typeof feature>[1] } };
      const fc = feature(topo as never, topo.objects.countries) as { features?: { type: string; geometry?: unknown }[] };
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

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setLit((n) => (n + 1) % TRADE_ARCS.length);
    }, 420);
    return () => window.clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    onApi?.({
      setProgress: () => settle(),
      setWhoosh: (t) => {
        whoosh.current = t;
        spin(t);
      },
      pause: () => globeRef.current?.pauseAnimation(),
      resume: () => globeRef.current?.resumeAnimation(),
    });
  });

  const arcs = useMemo(
    () =>
      TRADE_ARCS.flatMap((a) => {
        const base = {
          startLat: a.start.lat,
          startLng: a.start.lng,
          endLat: LONDON.lat,
          endLng: LONDON.lng,
        };
        return [
          {
            ...base,
            colors: [`${a.color}88`, `${a.color}22`],
            dash: 0,
            dashLen: 1,
            gap: 0,
            init: 0,
            stroke: 1.15,
          },
          {
            ...base,
            colors: a.colors,
            dash: a.dash,
            dashLen: 0.3,
            gap: 0.5,
            init: a.i * 0.28,
            stroke: a.i === lit ? 3.4 : a.main ? 2.7 : 2.2,
          },
        ];
      }),
    [lit],
  );

  const points = useMemo(
    () => [
      ...ORIGINS.map((o, i) => ({
        lat: o.lat,
        lng: o.lng,
        color: TRADE_ARCS[i]?.color ?? "#E8F4FF",
        radius: 0.36,
        alt: 0.014,
      })),
      { lat: LONDON.lat, lng: LONDON.lng, color: "#FFFFFF", radius: 0.58, alt: 0.02 },
    ],
    [],
  );

  const rings = useMemo(
    () => [
      { lat: LONDON.lat, lng: LONDON.lng, maxR: 4.6, period: 780 },
      { lat: LONDON.lat, lng: LONDON.lng, maxR: 2.6, period: 1180 },
    ],
    [],
  );

  if (reduced) {
    return (
      <div ref={wrap} className="globe-layer relative h-full w-full">
        <StaticGlobe className="h-full w-full" />
      </div>
    );
  }

  return (
    <div ref={wrap} className="globe-layer relative h-full w-full">
      {!ready && (
        <div className="absolute inset-0">
          <StaticGlobe className="h-full w-full" />
        </div>
      )}
      {tex && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          animateIn={false}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={tex}
          showAtmosphere
          atmosphereColor="#9ED0FF"
          atmosphereAltitude={0.22}
          hexPolygonsData={land}
          hexPolygonColor={() => "#FFFFFF"}
          hexPolygonAltitude={0.004}
          hexPolygonResolution={mobile ? 2 : 3}
          hexPolygonMargin={0.58}
          hexPolygonUseDots
          hexPolygonsTransitionDuration={0}
          arcsData={arcs}
          arcColor={(d: object) => (d as { colors: string[] }).colors}
          arcStroke={(d: object) => (d as { stroke: number }).stroke}
          arcDashLength={(d: object) => (d as { dashLen: number }).dashLen}
          arcDashGap={(d: object) => (d as { gap: number }).gap}
          arcDashInitialGap={(d: object) => (d as { init: number }).init}
          arcDashAnimateTime={(d: object) => (d as { dash: number }).dash}
          arcAltitudeAutoScale={0.44}
          arcCircularResolution={9}
          arcsTransitionDuration={0}
          pointsData={points}
          pointColor="color"
          pointAltitude="alt"
          pointRadius="radius"
          pointsMerge={false}
          pointsTransitionDuration={0}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(232,244,255,${0.82 * (1 - t)})`}
          ringMaxRadius="maxR"
          ringPropagationSpeed={2.2}
          ringRepeatPeriod="period"
          enablePointerInteraction={false}
          onGlobeReady={() => {
            const g = globeRef.current;
            if (!g) return;
            settle();
            if (wrap.current) passWheel(wrap.current);
            setReady(true);
            onReady?.();
          }}
        />
      )}
    </div>
  );
}

export default EarthGlobe;
