"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { feature } from "topojson-client";
import {
  alongGreatCircle,
  diveAmount,
  flightAmount,
  headingDegrees,
  HCMC,
  HEATHROW,
  FELIXSTOWE,
  LONDON,
  NINGBO,
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
  g.addColorStop(0, "#081828");
  g.addColorStop(0.5, "#0B1F33");
  g.addColorStop(1, "#081828");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "rgba(47,111,115,0.12)";
  ctx.lineWidth = 1;
  for (let y = 32; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  for (let x = 32; x < 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  return c.toDataURL("image/png");
}

function makeCraft() {
  const group = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: 0xf3ead3, flatShading: true, roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe63b2e, flatShading: true, roughness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a227, flatShading: true, roughness: 0.45, metalness: 0.35 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xc4a574, flatShading: true, roughness: 0.85 });
  const tape = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.1, 5), paper);
  body.rotation.z = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 5), brass);
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
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.08), tape);
  seam.position.set(0, -1.05, 0);
  group.add(seam);

  group.scale.setScalar(5.4);
  return group;
}

function stampEl(title: string, sub: string) {
  const el = document.createElement("div");
  el.className = "globe-html-pin";
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
  const [arrived, setArrived] = useState(false);
  const craftObj = useRef<THREE.Group | null>(null);

  useEffect(() => {
    setTex(oceanTexture());
    void import("world-atlas/land-110m.json").then((mod) => {
      const topo = mod.default as { objects: { land: Parameters<typeof feature>[1] } };
      const feat = feature(topo as never, topo.objects.land) as LandFeat;
      setLand([feat]);
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
    setArrived(u > 0.92);
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = t < 0.05 && !reduced;
    controls.autoRotateSpeed = 0.45;
    if (d <= 0) {
      g.pointOfView(
        {
          lat: 28 + (here.lat - 28) * u * 0.35,
          lng: 70 + (here.lng - 70) * u,
          altitude: mobile ? 2.6 : 2.15,
        },
        0,
      );
    } else {
      g.pointOfView(
        {
          lat: 48 + 6 * d,
          lng: 8 - 10 * d,
          altitude: (mobile ? 2.6 : 2.15) - 1.35 * d,
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
    () => [
      {
        startLat: SHENZHEN.lat,
        startLng: SHENZHEN.lng,
        endLat: LONDON.lat,
        endLng: LONDON.lng,
        kind: "main",
      },
      ...TRADE_ARCS.map((a) => ({
        startLat: a.start.lat,
        startLng: a.start.lng,
        endLat: a.end.lat,
        endLng: a.end.lng,
        kind: "trade",
      })),
    ],
    [],
  );

  const pins = useMemo(
    () => [
      { ...SHENZHEN, sub: "origin" },
      { ...LONDON, sub: "UK border" },
    ],
    [],
  );

  const rings = useMemo(() => {
    const out = [{ lat: SHENZHEN.lat, lng: SHENZHEN.lng }];
    if (arrived) out.push({ lat: LONDON.lat, lng: LONDON.lng });
    return out;
  }, [arrived]);

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
          atmosphereColor="#2F6F73"
          atmosphereAltitude={0.18}
          hexPolygonsData={mobile ? [] : land}
          hexPolygonColor={() => "#F3EAD3"}
          hexPolygonAltitude={0.004}
          hexPolygonResolution={2}
          hexPolygonMargin={0.35}
          hexPolygonsTransitionDuration={0}
          arcsData={arcs}
          arcColor={(d: object) => ((d as { kind: string }).kind === "main" ? "#E63B2E" : "rgba(47,111,115,0.7)")}
          arcStroke={(d: object) => ((d as { kind: string }).kind === "main" ? 0.85 : 0.35)}
          arcDashLength={(d: object) => ((d as { kind: string }).kind === "main" ? 0.22 : 0.12)}
          arcDashGap={(d: object) => ((d as { kind: string }).kind === "main" ? 0.16 : 0.4)}
          arcDashAnimateTime={(d: object) => ((d as { kind: string }).kind === "main" ? 1800 : 3200)}
          arcAltitudeAutoScale={0.45}
          arcsTransitionDuration={0}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(230,59,46,${1 - t})`}
          ringMaxRadius={4}
          ringPropagationSpeed={2.2}
          ringRepeatPeriod={1100}
          htmlElementsData={pins}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.02}
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
          labelsData={[
            { ...NINGBO, name: "NINGBO" },
            { ...HCMC, name: "HCMC" },
            { ...FELIXSTOWE, name: "FELIXSTOWE" },
            { ...HEATHROW, name: "HEATHROW" },
          ]}
          labelSize={0.55}
          labelDotRadius={0.12}
          labelColor={() => "rgba(243,234,211,0.7)"}
          labelAltitude={0.012}
          labelResolution={2}
          enablePointerInteraction
          onGlobeReady={() => {
            const g = globeRef.current;
            if (!g) return;
            g.controls().enableZoom = false;
            g.controls().autoRotate = true;
            g.controls().autoRotateSpeed = 0.45;
            g.pointOfView({ lat: 28, lng: 70, altitude: mobile ? 2.6 : 2.15 }, 0);
            setReady(true);
            apply(progress.current);
          }}
        />
      )}
    </div>
  );
}

export default EarthGlobe;
