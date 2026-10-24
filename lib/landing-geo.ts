/** Trade-hub coordinates and the Shenzhen → London great-circle used by the landing. */

export type LatLng = { lat: number; lng: number; name: string };

export const SHENZHEN: LatLng = { lat: 22.5431, lng: 114.0579, name: "Shenzhen" };
export const NINGBO: LatLng = { lat: 29.8683, lng: 121.544, name: "Ningbo" };
export const HCMC: LatLng = { lat: 10.7769, lng: 106.7009, name: "Ho Chi Minh" };
export const FELIXSTOWE: LatLng = { lat: 51.964, lng: 1.3512, name: "Felixstowe" };
export const HEATHROW: LatLng = { lat: 51.47, lng: -0.4543, name: "Heathrow" };
export const LONDON: LatLng = { lat: 51.5074, lng: -0.1278, name: "London" };

export const HUBS = [SHENZHEN, NINGBO, HCMC, FELIXSTOWE, HEATHROW, LONDON] as const;

export const TRADE_ARCS = [
  { start: SHENZHEN, end: FELIXSTOWE },
  { start: NINGBO, end: HEATHROW },
  { start: HCMC, end: LONDON },
] as const;

export const STORY = {
  heroEnd: 0.08,
  flyEnd: 0.38,
  diveEnd: 0.48,
  unfoldEnd: 0.62,
  pins: [0.64, 0.71, 0.78, 0.85, 0.92],
  end: 1,
} as const;

/** Discrete slide positions for arrow keys / desktop swipe. */
export const SCENE_AT = [0, 0.08, 0.23, 0.38, 0.48, 0.62, 0.64, 0.71, 0.78, 0.85, 0.92];

export function sceneFromProgress(t: number) {
  if (t < STORY.heroEnd) return 0;
  if (t < STORY.flyEnd) return 1;
  if (t < STORY.diveEnd) return 2;
  if (t < STORY.unfoldEnd) return 3;
  for (let i = 0; i < STORY.pins.length; i++) {
    const next = STORY.pins[i + 1] ?? STORY.end;
    if (t < next) return 4 + i;
  }
  return 8;
}

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function range(t: number, a: number, b: number) {
  if (b === a) return t >= b ? 1 : 0;
  return clamp01((t - a) / (b - a));
}

export function flightAmount(t: number) {
  return range(t, STORY.heroEnd, STORY.flyEnd);
}

export function diveAmount(t: number) {
  return range(t, STORY.flyEnd, STORY.diveEnd);
}

export function unfoldAmount(t: number) {
  return range(t, STORY.diveEnd, STORY.unfoldEnd);
}

export function pinAmount(t: number, i: number) {
  const start = STORY.pins[i] ?? 1;
  const end = STORY.pins[i + 1] ?? start + 0.05;
  return range(t, start, end);
}

function toVec(lat: number, lng: number) {
  const φ = (lat * Math.PI) / 180;
  const λ = (lng * Math.PI) / 180;
  return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)] as const;
}

function fromVec(v: readonly [number, number, number]) {
  const [x, y, z] = v;
  return { lat: (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI, lng: (Math.atan2(y, x) * 180) / Math.PI };
}

function slerp(a: readonly [number, number, number], b: readonly [number, number, number], t: number) {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const o = Math.acos(dot);
  if (o < 1e-6) return a;
  const s = Math.sin(o);
  const w1 = Math.sin((1 - t) * o) / s;
  const w2 = Math.sin(t * o) / s;
  return [a[0] * w1 + b[0] * w2, a[1] * w1 + b[1] * w2, a[2] * w1 + b[2] * w2] as const;
}

export function alongGreatCircle(a: LatLng, b: LatLng, t: number) {
  return fromVec(slerp(toVec(a.lat, a.lng), toVec(b.lat, b.lng), clamp01(t)));
}

export function headingDegrees(a: LatLng, b: LatLng) {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
