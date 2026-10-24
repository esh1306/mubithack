"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
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

function oceanTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#f8fafc");
  g.addColorStop(0.45, "#eef2fb");
  g.addColorStop(1, "#e4ebf6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "rgba(124,107,255,0.06)";
  ctx.lineWidth = 1;
  for (let y = 24; y < 512; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  return c.toDataURL("image/png");
}

function makeCraft() {
  const group = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true, roughness: 0.65 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe63b2e, flatShading: true, roughness: 0.5 });
  const violet = new THREE.MeshStandardMaterial({ color: 0x7c6bff, flatShading: true, roughness: 0.45 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xc4a574, flatShading: true, roughness: 0.85 });
  const tape = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.1, 5), paper);
  body.rotation.z = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 5), violet);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.35;
  group.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 2.6), red);
  group.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.08), red);
  tail.position.set(-0.9, 0.28, 0);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.9), red);
  fin.position.set(-0.9, 0, 0);
  group.add(fin);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), tape);
  string.position.set(0, -0.7, 0);
  group.add(string);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.48), boxMat);
  box.position.set(0, -1.15, 0);
  group.add(box);
  group.scale.setScalar(5.4);
  return group;
}

function stampEl(title: string, sub: string) {
  const el = document.createElement("div");
  el.className = "globe-html-pin globe-html-pin-pop";
  el.innerHTML = `<i></i><span><b>${title}</b><small>${sub}</small></span>`;
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
  const craftObj = useRef<THREE.Group | null>(null);

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
    setCraft({
      lat: here.lat,
      lng: here.lng,
      alt: 0.1 + 0.22 * Math.sin(Math.PI * u),
      heading: headingDegrees({ ...here, name: "" }, { ...next, name: "" }),
    });
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

  const pins = useMemo(
    () => DESTINATIONS.map((d) => ({ ...d, sub: "UK" })),
    [],
  );

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
          atmosphereColor="#9aa6ff"
          atmosphereAltitude={0.22}
          hexPolygonsData={land}
          hexPolygonColor={() => "#7C6BFF"}
          hexPolygonAltitude={0.003}
          hexPolygonResolution={mobile ? 2 : 3}
          hexPolygonMargin={0.68}
          hexPolygonUseDots
          hexPolygonsTransitionDuration={0}
          arcsData={arcs}
          arcColor={(d: object) => (d as { colors: string[] }).colors}
          arcStroke={(d: object) => ((d as { main?: boolean }).main ? 0.85 : 0.42)}
          arcDashLength={0.28}
          arcDashGap={0.55}
          arcDashAnimateTime={(d: object) => (d as { dash: number }).dash}
          arcAltitudeAutoScale={0.42}
          arcsTransitionDuration={0}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(124,107,255,${0.55 * (1 - t)})`}
          ringMaxRadius="maxR"
          ringPropagationSpeed={2.4}
          ringRepeatPeriod="period"
          htmlElementsData={pins}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.018}
          htmlElement={(d) => stampEl((d as { name: string }).name.toUpperCase(), (d as { sub: string }).sub)}
          htmlTransitionDuration={0}
          objectsData={mobile ? [] : [craft]}
          objectLat="lat"
          objectLng="lng"
          objectAltitude="alt"
          objectFacesSurfaces={false}
          objectRotation={() => ({ y: 90 - craft.heading, x: -10, z: 0 })}
          objectThreeObject={() => {
            craftObj.current ??= makeCraft();
            return craftObj.current;
          }}
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
