"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MASK_B64 } from "@/lib/globe-hero-mask";

const CONFIG = {
  dotCount: 60000,
  offsetX: 0,
  reducedMotionFrame: 9.6,
  colors: {
    oceanBase: "#050f1f",
    oceanRim: "#1b4f93",
    land: "#79aef7",
    uk: "#ffb347",
    inbound: "#4dd8ff",
    outbound: "#ffb347",
    trail: "#ffd9a0",
    glow: "#5aa2ff",
  },
};

const T = {
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
const ORIGIN = { lat: 1.3521, lon: 103.8198 };

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
  const t = clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}
function mulberry(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ll(lat: number, lon: number, r = 1) {
  const la = lat * D;
  const lo = lon * D;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}
function slerp(a: THREE.Vector3, b: THREE.Vector3, f: number) {
  const om = Math.acos(clamp(a.dot(b), -1, 1));
  const s = Math.sin(om);
  if (s < 1e-6) return a.clone();
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - f) * om) / s)
    .add(b.clone().multiplyScalar(Math.sin(f * om) / s));
}

function setU(mat: THREE.ShaderMaterial, name: string, value: number) {
  mat.uniforms[name]!.value = value;
}

function mountGlobe(hero: HTMLElement, canvas: HTMLCanvasElement, fallback: HTMLElement, replay: HTMLButtonElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    fallback.style.display = "grid";
    canvas.style.display = "none";
    return () => undefined;
  }
  renderer.setClearColor(0x000000, 0);

  const bin = atob(MASK_B64);
  const mask = new Uint8Array(bin.length);
  const MW = 720;
  const MH = 360;
  for (let mi = 0; mi < bin.length; mi++) mask[mi] = bin.charCodeAt(mi);
  function sample(lat: number, lon: number) {
    const c = clamp(Math.floor((lon + 180) * 2), 0, MW - 1);
    const r = clamp(Math.floor((90 - lat) * 2), 0, MH - 1);
    const i = r * MW + c;
    return (mask[i >> 2] >> ((i & 3) * 2)) & 3;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  tilt.position.x = CONFIG.offsetX;
  tilt.add(spin);
  scene.add(tilt);
  const C = CONFIG.colors;

  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(0.985, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { uBase: { value: new THREE.Color(C.oceanBase) }, uRim: { value: new THREE.Color(C.oceanRim) } },
      vertexShader:
        "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "uniform vec3 uBase; uniform vec3 uRim; varying vec3 vN;" +
        "void main(){ float f = pow(1.0 - max(vN.z, 0.0), 2.4); float l = max(dot(vN, normalize(vec3(-0.45, 0.55, 0.7))), 0.0);" +
        "vec3 c = uBase + uBase * l * 1.6 + uRim * f * 0.85; gl_FragColor = vec4(c, 1.0); }",
    }),
  );
  spin.add(ocean);

  const rnd = mulberry(7);
  const dp: number[] = [];
  const dr: number[] = [];
  const du: number[] = [];
  const N = CONFIG.dotCount;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    const x = Math.cos(th) * rad;
    const z = Math.sin(th) * rad;
    const v = sample(Math.asin(y) / D, Math.atan2(x, z) / D);
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
    vertexShader:
      "attribute float aRnd; attribute float aUK; uniform float uTime; uniform float uSize; uniform float uUKMix; varying float vA; varying float vUK;" +
      "void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normalize(position));" +
      "float lit = smoothstep(-0.08, 0.9, n.z); float tw = 0.62 + 0.38 * sin(uTime * (0.7 + aRnd * 1.8) + aRnd * 60.0);" +
      "vUK = aUK * uUKMix; vA = (0.22 + 0.78 * lit) * tw * step(-0.12, n.z);" +
      "gl_PointSize = uSize * (0.85 + aRnd * 0.5) * (1.0 + vUK * 0.55) / -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader:
      "uniform vec3 uLand; uniform vec3 uUKc; varying float vA; varying float vUK;" +
      "void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.2, d) * vA;" +
      "gl_FragColor = vec4(mix(uLand, uUKc, vUK), a); }",
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.frustumCulled = false;
  spin.add(dots);

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.17, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uCol: { value: new THREE.Color(C.glow) } },
      vertexShader:
        "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "uniform vec3 uCol; varying vec3 vN; void main(){ float k = pow(max(0.0, 0.62 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.2); gl_FragColor = vec4(uCol, 1.0) * k * 1.25; }",
    }),
  );
  tilt.add(atmo);
  atmo.position.set(0, 0, 0);

  const london = ll(LONDON.lat, LONDON.lon);
  function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segs: number) {
    const ang = Math.acos(clamp(a.dot(b), -1, 1));
    const h = 0.04 + 0.3 * (ang / Math.PI);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= segs; k++) {
      const f = k / segs;
      pts.push(
        slerp(a, b, f)
          .normalize()
          .multiplyScalar(1.004 + h * Math.sin(Math.PI * f)),
      );
    }
    return pts;
  }
  function bearingFrac(lat2: number, lon2: number) {
    const p1 = LONDON.lat * D;
    const p2 = lat2 * D;
    const dl = (lon2 - LONDON.lon) * D;
    const yy = Math.sin(dl) * Math.cos(p2);
    const xx = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(yy, xx) + Math.PI) / (2 * Math.PI);
  }

  const items: { g: THREE.TubeGeometry; delay: number; dir: number }[] = [];
  const markerPos: number[] = [];
  const markerDelay: number[] = [];
  for (const c of CITIES) {
    const cv = ll(c[1], c[2]);
    const frac = bearingFrac(c[1], c[2]);
    const delayIn = T.sweepStart + frac * T.sweepSpread;
    const delayOut = delayIn + 0.18;
    const gIn = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints(cv, london, 40)), 64, 0.0028, 4, false);
    const gOut = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints(london, cv, 40)), 64, 0.0028, 4, false);
    items.push({ g: gIn, delay: delayIn, dir: 0 }, { g: gOut, delay: delayOut, dir: 1 });
    const m = cv.multiplyScalar(1.004);
    markerPos.push(m.x, m.y, m.z);
    markerDelay.push(delayIn);
  }

  let V = 0;
  let I = 0;
  for (const o of items) {
    V += o.g.attributes.position.count;
    I += o.g.index!.count;
  }
  const P = new Float32Array(V * 3);
  const U = new Float32Array(V * 2);
  const De = new Float32Array(V);
  const Di = new Float32Array(V);
  const Ix = new Uint16Array(I);
  let vo = 0;
  let io = 0;
  for (const o of items) {
    const g = o.g;
    const n = g.attributes.position.count;
    const ia = g.index!.array;
    P.set(g.attributes.position.array as Float32Array, vo * 3);
    U.set(g.attributes.uv.array as Float32Array, vo * 2);
    De.fill(o.delay, vo, vo + n);
    Di.fill(o.dir, vo, vo + n);
    for (let k = 0; k < ia.length; k++) Ix[io + k] = ia[k] + vo;
    vo += n;
    io += ia.length;
    g.dispose();
  }
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.BufferAttribute(P, 3));
  arcGeo.setAttribute("uv", new THREE.BufferAttribute(U, 2));
  arcGeo.setAttribute("aDelay", new THREE.BufferAttribute(De, 1));
  arcGeo.setAttribute("aDir", new THREE.BufferAttribute(Di, 1));
  arcGeo.setIndex(new THREE.BufferAttribute(Ix, 1));
  const arcMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uIn: { value: new THREE.Color(C.inbound) },
      uOut: { value: new THREE.Color(C.outbound) },
    },
    vertexShader:
      "attribute float aDelay; attribute float aDir; uniform float uTime; varying float vS; varying float vP; varying float vDir;" +
      "void main(){ vS = uv.x; vDir = aDir; vP = (uTime - aDelay) / " +
      T.arcDur.toFixed(3) +
      "; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform float uFade; uniform vec3 uIn; uniform vec3 uOut; varying float vS; varying float vP; varying float vDir;" +
      "void main(){ float head = 1.0 - pow(1.0 - clamp(vP, 0.0, 1.0), 2.0); float d = head - vS;" +
      "float comet = exp(-max(d, 0.0) * 13.0) * (1.0 - smoothstep(1.0, 1.3, vP));" +
      "float a = step(0.0, d) * step(0.0, vP) * (0.26 + comet * 1.15) * uFade;" +
      "vec3 col = mix(uIn, uOut, vDir); col = mix(col, vec3(1.0), comet * 0.55); gl_FragColor = vec4(col, clamp(a, 0.0, 1.0)); }",
  });
  const arcs = new THREE.Mesh(arcGeo, arcMat);
  arcs.frustumCulled = false;
  spin.add(arcs);

  markerPos.push(london.x * 1.004, london.y * 1.004, london.z * 1.004);
  markerDelay.push(T.flightEnd - 0.1);
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute("position", new THREE.Float32BufferAttribute(markerPos, 3));
  mGeo.setAttribute("aDelay", new THREE.Float32BufferAttribute(markerDelay, 1));
  const markMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: 12 }, uFade: { value: 1 } },
    vertexShader:
      "attribute float aDelay; uniform float uTime; uniform float uSize; uniform float uFade; varying float vA;" +
      "void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normalize(position));" +
      "float t1 = uTime - aDelay; float t2 = t1 - " +
      T.arcDur.toFixed(3) +
      ";" +
      "float p1 = t1 > 0.0 ? exp(-t1 * 2.2) : 0.0; float p2 = t2 > 0.0 ? exp(-t2 * 2.2) : 0.0; float pulse = max(p1, p2);" +
      "vA = smoothstep(-0.05, 0.4, n.z) * step(0.0, t1) * (0.5 + 0.5 * pulse) * uFade;" +
      "gl_PointSize = uSize * 1.15 * (1.0 + pulse * 2.4) / -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader:
      "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 0.97, 0.92, smoothstep(0.5, 0.1, d) * vA); }",
  });
  const markers = new THREE.Points(mGeo, markMat);
  markers.frustumCulled = false;
  spin.add(markers);

  const A = ll(ORIGIN.lat, ORIGIN.lon);
  const B = london.clone();
  function routePoint(f: number) {
    return slerp(A, B, f)
      .normalize()
      .multiplyScalar(1.012 + 0.05 * Math.sin(Math.PI * clamp(f, 0, 1)));
  }
  const routePts: THREE.Vector3[] = [];
  for (let r = 0; r <= 120; r++) routePts.push(routePoint(r / 120));
  const trailMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uHead: { value: 0 }, uFade: { value: 1 }, uCol: { value: new THREE.Color(C.trail) } },
    vertexShader: "varying float vS; void main(){ vS = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform float uHead; uniform float uFade; uniform vec3 uCol; varying float vS;" +
      "void main(){ float d = uHead - vS; float a = step(0.0, d) * (0.12 + exp(-d * 6.5) * 0.95) * uFade; gl_FragColor = vec4(mix(uCol, vec3(1.0), exp(-d * 30.0) * 0.5), clamp(a, 0.0, 1.0)); }",
  });
  const trail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePts), 160, 0.0036, 5, false), trailMat);
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
  const gx = gc.getContext("2d");
  if (gx) {
    const gg = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gg.addColorStop(0, "rgba(255,225,170,0.95)");
    gg.addColorStop(0.35, "rgba(255,190,110,0.35)");
    gg.addColorStop(1, "rgba(255,170,90,0)");
    gx.fillStyle = gg;
    gx.fillRect(0, 0, 64, 64);
  }
  const glowMap = new THREE.CanvasTexture(gc);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
  );
  glow.scale.setScalar(7);
  plane.add(glow);
  spin.add(plane);

  const rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  const ringN = london.clone().normalize();
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

  const startC = slerp(A, B, 0.35).normalize();
  function centerAt(t: number) {
    if (t < T.flightStart) return startC.clone();
    if (t < T.flightEnd) return slerp(A, B, 0.35 + 0.65 * easeIO((t - T.flightStart) / (T.flightEnd - T.flightStart))).normalize();
    if (t < T.camBack) return B.clone();
    return slerp(B, startC, easeIO((t - T.camBack) / (T.total - T.camBack))).normalize();
  }

  const basis = new THREE.Matrix4();
  let baseDist = 4.3;
  function render(t: number) {
    const c = centerAt(t);
    spin.rotation.y = -Math.atan2(c.x, c.z);
    tilt.rotation.x = Math.asin(c.y);
    const zoom = smooth(5.4, 7.0, t) * (1 - smooth(T.camBack, T.total - 0.8, t));
    camera.position.set(0, 0, baseDist * (1 - 0.13 * zoom));
    camera.lookAt(0, 0, 0);

    const fade = 1 - smooth(T.fadeStart, T.fadeEnd, t);
    setU(dotMat, "uTime", t);
    setU(arcMat, "uTime", t);
    setU(markMat, "uTime", t);
    setU(arcMat, "uFade", fade);
    setU(markMat, "uFade", Math.max(fade, 0.0) * 0.9 + 0.1 * (t > T.sweepStart ? 1 : 0) * (1 - fade));
    setU(dotMat, "uUKMix", smooth(6.2, 7.0, t) * (1 - smooth(T.camBack, T.total - 0.6, t)));

    const p = clamp((t - T.flightStart) / (T.flightEnd - T.flightStart), 0, 1);
    const f = easeIO(p);
    const fc = clamp(f, 0.003, 0.997);
    const pos = routePoint(f);
    const fwd = routePoint(fc + 0.003)
      .sub(routePoint(fc - 0.003))
      .normalize();
    const up = pos.clone().normalize();
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const fw2 = new THREE.Vector3().crossVectors(right, up);
    basis.makeBasis(right, up, fw2);
    plane.quaternion.setFromRotationMatrix(basis);
    plane.position.copy(pos);
    const sc = 0.042 * Math.min(smooth(T.flightStart, T.flightStart + 0.5, t), 1 - smooth(T.flightEnd - 0.3, T.flightEnd + 0.25, t));
    plane.visible = sc > 0.0008;
    plane.scale.setScalar(Math.max(sc, 0.0001));
    setU(trailMat, "uHead", f);
    setU(trailMat, "uFade", 1 - smooth(T.flightEnd + 0.3, T.flightEnd + 2.4, t));

    for (let k = 0; k < rings.length; k++) {
      const ph = (t - T.flightEnd - k * 0.5) / 2.4;
      const rg = rings[k]!;
      if (ph < 0 || ph > 1 || t > 11.6) {
        rg.visible = false;
        continue;
      }
      rg.visible = true;
      rg.scale.setScalar(0.014 + 0.2 * easeOut(ph));
      rg.material.opacity = (1 - ph) * 0.85;
    }
    renderer.render(scene, camera);
  }

  let reduce = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    baseDist = 4.3 * (camera.aspect < 1 ? (1 / camera.aspect) * 0.92 : 1);
    const s = 2.7 * dpr * 4.3 * Math.max(0.6, Math.min(w, h) / 900);
    setU(dotMat, "uSize", s);
    setU(markMat, "uSize", s);
    if (reduce) render(CONFIG.reducedMotionFrame);
  }

  let t = 0;
  let last = performance.now();
  let onScreen = true;
  let raf = 0;
  let alive = true;
  function tick(now: number) {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (reduce || !onScreen) return;
    t = (t + dt) % T.total;
    render(t);
  }

  const vis =
    "IntersectionObserver" in window
      ? new IntersectionObserver((e) => {
          onScreen = Boolean(e[0]?.isIntersecting);
        })
      : null;
  vis?.observe(hero);
  const ro =
    "ResizeObserver" in window
      ? new ResizeObserver(() => {
          resize();
        })
      : null;
  ro?.observe(hero);
  const onWinResize = () => resize();
  if (!ro) window.addEventListener("resize", onWinResize);

  const onReplay = () => {
    t = 0;
    if (reduce) render(0);
  };
  replay.addEventListener("click", onReplay);

  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const onMq = () => {
    reduce = Boolean(mq?.matches);
    if (reduce) render(CONFIG.reducedMotionFrame);
  };
  mq?.addEventListener("change", onMq);

  resize();
  render(reduce ? CONFIG.reducedMotionFrame : 0);
  raf = requestAnimationFrame(tick);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    replay.removeEventListener("click", onReplay);
    mq?.removeEventListener("change", onMq);
    if (!ro) window.removeEventListener("resize", onWinResize);
    ro?.disconnect();
    vis?.disconnect();

    const seen = new Set<THREE.Material | THREE.BufferGeometry | THREE.Texture>();
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh & THREE.Points & THREE.Sprite;
      const geo = mesh.geometry as THREE.BufferGeometry | undefined;
      if (geo && !seen.has(geo)) {
        seen.add(geo);
        geo.dispose();
      }
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const m of mats) {
        if (!m || seen.has(m)) continue;
        seen.add(m);
        if (m instanceof THREE.ShaderMaterial) {
          for (const u of Object.values(m.uniforms)) {
            if (u.value instanceof THREE.Texture && !seen.has(u.value)) {
              seen.add(u.value);
              u.value.dispose();
            }
          }
        }
        if (m instanceof THREE.SpriteMaterial && m.map && !seen.has(m.map)) {
          seen.add(m.map);
          m.map.dispose();
        }
        m.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

export default function GlobeHero() {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    const replay = replayRef.current;
    if (!hero || !canvas || !fallback || !replay) return;
    return mountGlobe(hero, canvas, fallback, replay);
  }, []);

  return (
    <section
      ref={heroRef}
      className="globe-hero"
      aria-label="Animated globe: a plane flies to the UK, then routes sweep in and out"
    >
      <canvas ref={canvasRef} className="globe-hero-canvas" />
      <div ref={fallbackRef} className="globe-hero-fallback">
        The globe needs WebGL, which this browser has switched off.
      </div>
      <button ref={replayRef} className="globe-hero-replay" type="button">
        Replay
      </button>
    </section>
  );
}
