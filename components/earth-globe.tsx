"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLOBE_MASK } from "@/lib/globe-mask";

export type EarthApi = {
  setProgress: (t: number) => void;
  setWhoosh: (t: number) => void;
  pause: () => void;
  resume: () => void;
};

const CFG = {
  dotCount: 60000,
  offsetX: 0,
  reducedFrame: 9.6,
  colors: {
    oceanBase: "#0b2456",
    oceanRim: "#5b9bff",
    land: "#b9d6ff",
    uk: "#ffb347",
    inbound: "#4dd8ff",
    outbound: "#ffb347",
    trail: "#ffd9a0",
    glow: "#bfe0ff",
  },
};

const TL = {
  flightStart: 0.6,
  flightEnd: 6.6,
  sweepStart: 7.0,
  sweepSpread: 1.6,
  arcDur: 2.2,
  fadeStart: 12.2,
  fadeEnd: 13.6,
  camBack: 13.2,
  total: 16,
};

const LONDON = { lat: 51.5074, lon: -0.1278 };
const CITIES: [string, number, number][] = [
  ["New York", 40.71, -74.01],
  ["Toronto", 43.65, -79.38],
  ["Mexico City", 19.43, -99.13],
  ["San Francisco", 37.77, -122.42],
  ["Sao Paulo", -23.55, -46.63],
  ["Buenos Aires", -34.6, -58.38],
  ["Lagos", 6.52, 3.38],
  ["Nairobi", -1.29, 36.82],
  ["Johannesburg", -26.2, 28.05],
  ["Cairo", 30.04, 31.24],
  ["Istanbul", 41.01, 28.98],
  ["Madrid", 40.42, -3.7],
  ["Berlin", 52.52, 13.4],
  ["Stockholm", 59.33, 18.07],
  ["Moscow", 55.76, 37.62],
  ["Dubai", 25.2, 55.27],
  ["Mumbai", 19.08, 72.88],
  ["Singapore", 1.35, 103.82],
  ["Hong Kong", 22.32, 114.17],
  ["Seoul", 37.57, 126.98],
  ["Tokyo", 35.68, 139.69],
  ["Sydney", -33.87, 151.21],
];
// Ningbo, a major origin port for UK imports (the demo invoice is Ningbo homeware).
const ORIGIN = { lat: 29.8683, lon: 121.544 };

/* ── math helpers ── */
const D = Math.PI / 180;
function clamp(x: number, a: number, b: number) {
  return x < a ? a : x > b ? b : x;
}
function smooth(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function easeIO(x: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
}
function easeOut(x: number) {
  const v = clamp(x, 0, 1);
  return 1 - Math.pow(1 - v, 3);
}
function mulberry(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ll(lat: number, lon: number, r = 1) {
  const la = lat * D,
    lo = lon * D;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}
function slerp(a: THREE.Vector3, b: THREE.Vector3, f: number) {
  const om = Math.acos(clamp(a.dot(b), -1, 1)),
    s = Math.sin(om);
  if (s < 1e-6) return a.clone();
  return a.clone().multiplyScalar(Math.sin((1 - f) * om) / s).add(b.clone().multiplyScalar(Math.sin(f * om) / s));
}

/* ── mask decode ── */
const MW = 720,
  MH = 360;
function decodeMask() {
  const bin = atob(GLOBE_MASK);
  const m = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) m[i] = bin.charCodeAt(i);
  return m;
}
function sampleMask(mask: Uint8Array, lat: number, lon: number) {
  const c = clamp(Math.floor((lon + 180) * 2), 0, MW - 1);
  const r = clamp(Math.floor((90 - lat) * 2), 0, MH - 1);
  const i = r * MW + c;
  return (mask[i >> 2] >> ((i & 3) * 2)) & 3;
}

export function EarthGlobe({
  onApi,
  onReady,
  reduced,
}: {
  onApi?: (api: EarthApi) => void;
  onReady?: () => void;
  mobile: boolean;
  reduced: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayRef = useRef<() => void>(null);
  const onApiRef = useRef(onApi);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onApiRef.current = onApi;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const container: HTMLDivElement = el;

    let dead = false;
    let paused = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.position.x = CFG.offsetX;
    tilt.add(spin);
    scene.add(tilt);
    const C = CFG.colors;

    /* 1. Ocean */
    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(0.985, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: { uBase: { value: new THREE.Color(C.oceanBase) }, uRim: { value: new THREE.Color(C.oceanRim) } },
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uBase; uniform vec3 uRim; varying vec3 vN;
          void main(){ float f = pow(1.0 - max(vN.z, 0.0), 2.4); float lit = max(dot(vN, normalize(vec3(-0.45, 0.55, 0.7))), 0.0);
          vec3 c = uBase + uBase * lit * 1.6 + uRim * f * 0.85; gl_FragColor = vec4(c, 1.0); }`,
      }),
    );
    spin.add(ocean);

    /* 2. Land dots */
    const mask = decodeMask();
    const rnd = mulberry(7);
    const dp: number[] = [],
      dr: number[] = [],
      du: number[] = [];
    const N = CFG.dotCount,
      golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N,
        rad = Math.sqrt(1 - y * y),
        th = golden * i;
      const x = Math.cos(th) * rad,
        z = Math.sin(th) * rad;
      const v = sampleMask(mask, Math.asin(y) / D, Math.atan2(x, z) / D);
      if (!v) continue;
      dp.push(x, y, z);
      dr.push(rnd());
      du.push(v === 2 ? 1 : 0);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    dotGeo.setAttribute("aRnd", new THREE.Float32BufferAttribute(dr, 1));
    dotGeo.setAttribute("aUK", new THREE.Float32BufferAttribute(du, 1));
    const dotMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 12 },
        uUKMix: { value: 0 },
        uLand: { value: new THREE.Color(C.land) },
        uUKc: { value: new THREE.Color(C.uk) },
      },
      vertexShader: `attribute float aRnd; attribute float aUK; uniform float uTime; uniform float uSize; uniform float uUKMix; varying float vA; varying float vUK;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normalize(position));
        float lit = smoothstep(-0.08, 0.9, n.z); float tw = 0.62 + 0.38 * sin(uTime * (0.7 + aRnd * 1.8) + aRnd * 60.0);
        vUK = aUK * uUKMix; vA = (0.22 + 0.78 * lit) * tw * step(-0.12, n.z);
        gl_PointSize = uSize * (0.85 + aRnd * 0.5) * (1.0 + vUK * 0.55) / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uLand; uniform vec3 uUKc; varying float vA; varying float vUK;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.2, d) * vA;
        gl_FragColor = vec4(mix(uLand, uUKc, vUK), a); }`,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    dots.frustumCulled = false;
    spin.add(dots);

    /* 3. Atmosphere */
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.16, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: { uCol: { value: new THREE.Color(C.glow) } },
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uCol; varying vec3 vN; void main(){ float k = pow(clamp(-vN.z, 0.0, 1.0), 2.6); gl_FragColor = vec4(uCol * k * 1.5, k); }`,
      }),
    );
    tilt.add(atmo);

    /* 4. Trade arcs */
    const london = ll(LONDON.lat, LONDON.lon);
    function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segs: number) {
      const ang = Math.acos(clamp(a.dot(b), -1, 1)),
        h = 0.04 + 0.3 * (ang / Math.PI),
        pts: THREE.Vector3[] = [];
      for (let k = 0; k <= segs; k++) {
        const f = k / segs;
        pts.push(slerp(a, b, f).normalize().multiplyScalar(1.004 + h * Math.sin(Math.PI * f)));
      }
      return pts;
    }
    function bearingFrac(lat2: number, lon2: number) {
      const p1 = LONDON.lat * D,
        p2 = lat2 * D,
        dl = (lon2 - LONDON.lon) * D;
      const yy = Math.sin(dl) * Math.cos(p2),
        xx = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
      return (Math.atan2(yy, xx) + Math.PI) / (2 * Math.PI);
    }

    type ArcItem = { g: THREE.TubeGeometry; delay: number; dir: number };
    const items: ArcItem[] = [];
    const markerPos: number[] = [];
    const markerDelay: number[] = [];

    CITIES.forEach((c) => {
      const cv = ll(c[1], c[2]);
      const frac = bearingFrac(c[1], c[2]);
      const delayIn = TL.sweepStart + frac * TL.sweepSpread;
      const delayOut = delayIn + 0.18;
      const gIn = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints(cv, london, 40)), 64, 0.0028, 4, false);
      const gOut = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints(london, cv.clone(), 40)), 64, 0.0028, 4, false);
      items.push({ g: gIn, delay: delayIn, dir: 0 }, { g: gOut, delay: delayOut, dir: 1 });
      const m = cv.multiplyScalar(1.004);
      markerPos.push(m.x, m.y, m.z);
      markerDelay.push(delayIn);
    });

    let arcMat: THREE.ShaderMaterial;
    {
      let V = 0,
        I = 0;
      items.forEach((o) => {
        V += o.g.attributes.position.count;
        I += o.g.index!.count;
      });
      const P = new Float32Array(V * 3),
        U = new Float32Array(V * 2),
        De = new Float32Array(V),
        Di = new Float32Array(V),
        Ix = V > 65535 ? new Uint32Array(I) : new Uint16Array(I);
      let vo = 0,
        io = 0;
      items.forEach((o) => {
        const g = o.g,
          n = g.attributes.position.count,
          ia = g.index!.array;
        P.set(g.attributes.position.array as Float32Array, vo * 3);
        U.set(g.attributes.uv.array as Float32Array, vo * 2);
        De.fill(o.delay, vo, vo + n);
        Di.fill(o.dir, vo, vo + n);
        for (let k = 0; k < ia.length; k++) Ix[io + k] = (ia as Uint16Array)[k] + vo;
        vo += n;
        io += ia.length;
        g.dispose();
      });
      const G = new THREE.BufferGeometry();
      G.setAttribute("position", new THREE.BufferAttribute(P, 3));
      G.setAttribute("uv", new THREE.BufferAttribute(U, 2));
      G.setAttribute("aDelay", new THREE.BufferAttribute(De, 1));
      G.setAttribute("aDir", new THREE.BufferAttribute(Di, 1));
      G.setIndex(new THREE.BufferAttribute(Ix, 1));
      arcMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uFade: { value: 1 },
          uIn: { value: new THREE.Color(C.inbound) },
          uOut: { value: new THREE.Color(C.outbound) },
        },
        vertexShader: `attribute float aDelay; attribute float aDir; uniform float uTime; varying float vS; varying float vP; varying float vDir;
          void main(){ vS = uv.x; vDir = aDir; vP = (uTime - aDelay) / ${TL.arcDur.toFixed(3)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uFade; uniform vec3 uIn; uniform vec3 uOut; varying float vS; varying float vP; varying float vDir;
          void main(){ float head = 1.0 - pow(1.0 - clamp(vP, 0.0, 1.0), 2.0); float d = head - vS;
          float comet = exp(-max(d, 0.0) * 13.0) * (1.0 - smoothstep(1.0, 1.3, vP));
          float a = step(0.0, d) * step(0.0, vP) * (0.26 + comet * 1.15) * uFade;
          vec3 col = mix(uIn, uOut, vDir); col = mix(col, vec3(1.0), comet * 0.55); gl_FragColor = vec4(col, clamp(a, 0.0, 1.0)); }`,
      });
      const arcs = new THREE.Mesh(G, arcMat);
      arcs.frustumCulled = false;
      spin.add(arcs);
    }

    /* 5. City markers */
    markerPos.push(london.x * 1.004, london.y * 1.004, london.z * 1.004);
    markerDelay.push(TL.flightEnd - 0.1);
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute("position", new THREE.Float32BufferAttribute(markerPos, 3));
    mGeo.setAttribute("aDelay", new THREE.Float32BufferAttribute(markerDelay, 1));
    const markMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 12 }, uFade: { value: 1 } },
      vertexShader: `attribute float aDelay; uniform float uTime; uniform float uSize; uniform float uFade; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normalize(position));
        float t1 = uTime - aDelay; float t2 = t1 - ${TL.arcDur.toFixed(3)};
        float p1 = t1 > 0.0 ? exp(-t1 * 2.2) : 0.0; float p2 = t2 > 0.0 ? exp(-t2 * 2.2) : 0.0; float pulse = max(p1, p2);
        vA = smoothstep(-0.05, 0.4, n.z) * step(0.0, t1) * (0.5 + 0.5 * pulse) * uFade;
        gl_PointSize = uSize * 1.15 * (1.0 + pulse * 2.4) / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 0.97, 0.92, smoothstep(0.5, 0.1, d) * vA); }`,
    });
    const markers = new THREE.Points(mGeo, markMat);
    markers.frustumCulled = false;
    spin.add(markers);

    /* 6. Plane: route, trail, low-poly model */
    const A = ll(ORIGIN.lat, ORIGIN.lon),
      B = london.clone();
    function routePoint(f: number) {
      return slerp(A, B, f).normalize().multiplyScalar(1.012 + 0.05 * Math.sin(Math.PI * clamp(f, 0, 1)));
    }
    const routePts: THREE.Vector3[] = [];
    for (let r = 0; r <= 120; r++) routePts.push(routePoint(r / 120));
    const trailMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uHead: { value: 0 }, uFade: { value: 1 }, uCol: { value: new THREE.Color(C.trail) } },
      vertexShader: `varying float vS; void main(){ vS = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uHead; uniform float uFade; uniform vec3 uCol; varying float vS;
        void main(){ float d = uHead - vS; float a = step(0.0, d) * (0.12 + exp(-d * 6.5) * 0.95) * uFade; gl_FragColor = vec4(mix(uCol, vec3(1.0), exp(-d * 30.0) * 0.5), clamp(a, 0.0, 1.0)); }`,
    });
    const trail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePts), 160, 0.0036, 5, false),
      trailMat,
    );
    trail.frustumCulled = false;
    spin.add(trail);

    const plane = new THREE.Group();
    const pm = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.4, 10), pm);
    fus.rotation.x = Math.PI / 2;
    plane.add(fus);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 10), pm);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.6;
    plane.add(nose);
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.15, -0.5);
    wingShape.lineTo(2.2, 0.75);
    wingShape.lineTo(2.2, 1.15);
    wingShape.lineTo(0.15, 0.4);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wr = new THREE.Mesh(wingGeo, pm);
    wr.rotation.x = -Math.PI / 2;
    plane.add(wr);
    const wl = new THREE.Mesh(wingGeo, pm);
    wl.rotation.x = -Math.PI / 2;
    wl.scale.x = -1;
    plane.add(wl);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.55), pm);
    fin.position.set(0, 0.45, -1.1);
    fin.rotation.x = 0.45;
    plane.add(fin);
    const hstab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.38), pm);
    hstab.position.set(0, 0.05, -1.15);
    plane.add(hstab);
    const gc = document.createElement("canvas");
    gc.width = gc.height = 64;
    const gx = gc.getContext("2d")!;
    const gg = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gg.addColorStop(0, "rgba(255,225,170,0.95)");
    gg.addColorStop(0.35, "rgba(255,190,110,0.35)");
    gg.addColorStop(1, "rgba(255,170,90,0)");
    gx.fillStyle = gg;
    gx.fillRect(0, 0, 64, 64);
    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(gc),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
    glowSprite.scale.setScalar(7);
    plane.add(glowSprite);
    spin.add(plane);

    /* 7. Landing rings */
    const ringN = london.clone().normalize();
    const rings: THREE.Mesh[] = [];
    for (let ri = 0; ri < 3; ri++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1, 64),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(C.uk),
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.position.copy(london).multiplyScalar(1.004);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ringN);
      ring.visible = false;
      spin.add(ring);
      rings.push(ring);
    }

    /* ── camera path ── */
    const startC = slerp(A, B, 0.35).normalize();
    function centerAt(t: number) {
      if (t < TL.flightStart) return startC.clone();
      if (t < TL.flightEnd) return slerp(A, B, 0.35 + 0.65 * easeIO((t - TL.flightStart) / (TL.flightEnd - TL.flightStart))).normalize();
      if (t < TL.camBack) return B.clone();
      return slerp(B, startC, easeIO((t - TL.camBack) / (TL.total - TL.camBack))).normalize();
    }

    /* ── render frame ── */
    const DIST = 5.3;
    let baseDist = DIST;
    const basis = new THREE.Matrix4();
    function render(t: number) {
      const c = centerAt(t);
      spin.rotation.y = -Math.atan2(c.x, c.z);
      tilt.rotation.x = Math.asin(c.y);
      const zoom = smooth(5.4, 7.0, t) * (1 - smooth(TL.camBack, TL.total - 0.8, t));
      camera.position.set(0, 0, baseDist * (1 - 0.13 * zoom));
      camera.lookAt(0, 0, 0);

      const fade = 1 - smooth(TL.fadeStart, TL.fadeEnd, t);
      dotMat.uniforms.uTime.value = t;
      arcMat.uniforms.uTime.value = t;
      markMat.uniforms.uTime.value = t;
      arcMat.uniforms.uFade.value = fade;
      markMat.uniforms.uFade.value = Math.max(fade, 0.0) * 0.9 + 0.1 * (t > TL.sweepStart ? 1 : 0) * (1 - fade);
      dotMat.uniforms.uUKMix.value = smooth(6.2, 7.0, t) * (1 - smooth(TL.camBack, TL.total - 0.6, t));

      const p = clamp((t - TL.flightStart) / (TL.flightEnd - TL.flightStart), 0, 1),
        f = easeIO(p);
      const fc = clamp(f, 0.003, 0.997),
        pos = routePoint(f);
      const fwd = routePoint(fc + 0.003).sub(routePoint(fc - 0.003)).normalize(),
        up = pos.clone().normalize();
      const right = new THREE.Vector3().crossVectors(up, fwd).normalize(),
        fw2 = new THREE.Vector3().crossVectors(right, up);
      basis.makeBasis(right, up, fw2);
      plane.quaternion.setFromRotationMatrix(basis);
      plane.position.copy(pos);
      const sc = 0.042 * Math.min(smooth(TL.flightStart, TL.flightStart + 0.5, t), 1 - smooth(TL.flightEnd - 0.3, TL.flightEnd + 0.25, t));
      plane.visible = sc > 0.0008;
      plane.scale.setScalar(Math.max(sc, 0.0001));
      trailMat.uniforms.uHead.value = f;
      trailMat.uniforms.uFade.value = 1 - smooth(TL.flightEnd + 0.3, TL.flightEnd + 2.4, t);

      for (let k = 0; k < rings.length; k++) {
        const ph = (t - TL.flightEnd - k * 0.5) / 2.4,
          rg = rings[k];
        if (ph < 0 || ph > 1 || t > 11.6) {
          rg.visible = false;
          continue;
        }
        rg.visible = true;
        rg.scale.setScalar(0.014 + 0.2 * easeOut(ph));
        (rg.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.85;
      }
      renderer.render(scene, camera);
    }

    /* ── sizing ── */
    function resize() {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      baseDist = DIST * (camera.aspect < 1 ? (1 / camera.aspect) * 0.92 : 1);
      const s = 2.7 * dpr * DIST * Math.max(0.6, Math.min(w, h) / 900);
      dotMat.uniforms.uSize.value = s;
      markMat.uniforms.uSize.value = s;
      if (reduced) render(CFG.reducedFrame);
    }

    /* ── animation loop ── */
    let t = 0,
      last = performance.now(),
      onScreen = true;
    function tick(now: number) {
      if (dead) return;
      requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (reduced || !onScreen || paused) return;
      t = (t + dt) % TL.total;
      render(t);
    }

    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver((e) => {
            onScreen = e[0].isIntersecting;
          })
        : null;
    io?.observe(container);
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    replayRef.current = () => {
      t = 0;
      if (reduced) render(0);
    };

    resize();
    render(reduced ? CFG.reducedFrame : 0);
    requestAnimationFrame(tick);

    onApiRef.current?.({
      setProgress: () => {},
      setWhoosh: () => {},
      pause: () => { paused = true; },
      resume: () => { paused = false; },
    });
    onReadyRef.current?.();

    return () => {
      dead = true;
      ro.disconnect();
      io?.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    };
  }, [reduced]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full block" />
      <button
        type="button"
        onClick={() => replayRef.current?.()}
        className="absolute right-[16%] bottom-[12%] z-10 rounded-full border border-[#0b1f4d]/15 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#0b1f4d]/75 backdrop-blur-sm hover:bg-white hover:text-[#0b1f4d]"
      >
        Replay
      </button>
    </div>
  );
}

export default EarthGlobe;
