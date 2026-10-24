"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { LONDON, ORIGINS, TRADE_ARCS, visibleFrom } from "@/lib/landing-geo";
import { StaticGlobe } from "@/components/static-globe";

export type EarthApi = {
  setProgress: (t: number) => void;
  setWhoosh: (t: number) => void;
  pause: () => void;
  resume: () => void;
};

type Dot = { lat: number; lng: number; color: string; radius: number; alt: number };

/** Tilted so Europe, Africa, the Middle East, Asia and the Atlantic read as a face — not a UK close-up. */
const LOOK = { lat: 28, lng: 34, altitude: 2.08 } as const;
const LOOK_MOBILE = { lat: 26, lng: 36, altitude: 2.2 } as const;

function oceanTexture() {
  try {
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
    return c.toDataURL("image/png");
  } catch {
    return "";
  }
}

function dotsOnLand(land: { type: string; geometry?: unknown }, step: number) {
  const pts: Dot[] = [];
  for (let lat = -64; lat <= 78; lat += step) {
    const lngStep = step / Math.max(0.42, Math.cos((lat * Math.PI) / 180));
    for (let lng = -180; lng < 180; lng += lngStep) {
      try {
        if (geoContains(land as never, [lng, lat])) {
          pts.push({ lat, lng, color: "#E8F4FF", radius: 0.16, alt: 0.003 });
        }
      } catch {
        // skip a bad cell rather than throw through the render loop
      }
    }
  }
  return pts;
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
  const [landDots, setLandDots] = useState<Dot[]>([]);
  const [lit, setLit] = useState(0);
  const [view, setView] = useState<{ lat: number; lng: number; altitude: number }>(mobile ? LOOK_MOBILE : LOOK);

  const look = mobile ? LOOK_MOBILE : LOOK;

  const spin = () => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.16;
  };

  const settle = () => {
    const g = globeRef.current;
    if (!g) return;
    spin();
    g.pointOfView(look, 0);
  };

  useEffect(() => {
    setTex(oceanTexture());
    void import("world-atlas/land-110m.json")
      .then((mod) => {
        const topo = mod.default as { objects: { land: Parameters<typeof feature>[1] } };
        const land = feature(topo as never, topo.objects.land) as { type: string; geometry?: unknown };
        setLandDots(dotsOnLand(land, mobile ? 3.4 : 2.6));
      })
      .catch(() => setLandDots([]));
  }, [mobile]);

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
      const g = globeRef.current;
      if (!g) return;
      try {
        const pov = g.pointOfView();
        if (typeof pov.lat === "number" && typeof pov.lng === "number") {
          setView({ lat: pov.lat, lng: pov.lng, altitude: look.altitude });
        }
      } catch {
        // keep the last good view
      }
    }, 480);
    return () => window.clearInterval(id);
  }, [reduced, look.altitude]);

  useEffect(() => {
    onApi?.({
      setProgress: () => settle(),
      setWhoosh: (t) => {
        whoosh.current = t;
        spin();
      },
      pause: () => globeRef.current?.pauseAnimation(),
      resume: () => globeRef.current?.resumeAnimation(),
    });
  });

  const arcs = useMemo(
    () =>
      TRADE_ARCS.filter((a) => visibleFrom(view, a.start)).flatMap((a) => {
        const base = {
          startLat: a.start.lat,
          startLng: a.start.lng,
          endLat: LONDON.lat,
          endLng: LONDON.lng,
        };
        return [
          {
            ...base,
            colors: [`${a.color}66`, `${a.color}14`],
            dash: 0,
            dashLen: 1,
            gap: 0,
            init: 0,
            stroke: 0.48,
          },
          {
            ...base,
            colors: a.colors,
            dash: a.dash,
            dashLen: 0.28,
            gap: 0.55,
            init: a.i * 0.3,
            stroke: a.i === lit ? 0.8 : a.main ? 0.7 : 0.58,
          },
        ];
      }),
    [lit, view],
  );

  const points = useMemo<Dot[]>(
    () => [
      ...landDots,
      ...ORIGINS.filter((o) => visibleFrom(view, o)).map((o) => ({
        lat: o.lat,
        lng: o.lng,
        color: TRADE_ARCS.find((a) => a.start === o)?.color ?? "#E8F4FF",
        radius: 0.4,
        alt: 0.014,
      })),
      { lat: LONDON.lat, lng: LONDON.lng, color: "#FFFFFF", radius: 0.62, alt: 0.02 },
    ],
    [landDots, view],
  );

  const rings = useMemo(() => [{ lat: LONDON.lat, lng: LONDON.lng, maxR: 3.8, period: 860 }], []);

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
          globeImageUrl={tex || undefined}
          showAtmosphere
          atmosphereColor="#9ED0FF"
          atmosphereAltitude={0.2}
          arcsData={arcs}
          arcColor={(d: object) => (d as { colors: string[] }).colors}
          arcStroke={(d: object) => (d as { stroke: number }).stroke}
          arcDashLength={(d: object) => (d as { dashLen: number }).dashLen}
          arcDashGap={(d: object) => (d as { gap: number }).gap}
          arcDashInitialGap={(d: object) => (d as { init: number }).init}
          arcDashAnimateTime={(d: object) => (d as { dash: number }).dash}
          arcAltitudeAutoScale={0.34}
          arcsTransitionDuration={0}
          pointsData={points}
          pointColor="color"
          pointAltitude="alt"
          pointRadius="radius"
          pointsMerge={false}
          pointsTransitionDuration={0}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(232,244,255,${0.78 * (1 - t)})`}
          ringMaxRadius="maxR"
          ringPropagationSpeed={2.1}
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
