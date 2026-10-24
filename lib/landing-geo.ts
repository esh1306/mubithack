/** Trade-hub coordinates and the Shenzhen → London great-circle used by the landing. */

export type LatLng = { lat: number; lng: number; name: string };

export const SHENZHEN: LatLng = { lat: 22.5431, lng: 114.0579, name: "Shenzhen" };
export const SHANGHAI: LatLng = { lat: 31.2304, lng: 121.4737, name: "Shanghai" };
export const HCMC: LatLng = { lat: 10.7769, lng: 106.7009, name: "Ho Chi Minh" };
export const MUMBAI: LatLng = { lat: 19.076, lng: 72.8777, name: "Mumbai" };
export const DUBAI: LatLng = { lat: 25.2048, lng: 55.2708, name: "Dubai" };
export const NEWYORK: LatLng = { lat: 40.7128, lng: -74.006, name: "New York" };
export const LA: LatLng = { lat: 34.0522, lng: -118.2437, name: "Los Angeles" };
export const SAOPAULO: LatLng = { lat: -23.5505, lng: -46.6333, name: "São Paulo" };
export const LAGOS: LatLng = { lat: 6.5244, lng: 3.3792, name: "Lagos" };
export const ISTANBUL: LatLng = { lat: 41.0082, lng: 28.9784, name: "Istanbul" };
export const TOKYO: LatLng = { lat: 35.6762, lng: 139.6503, name: "Tokyo" };
export const SYDNEY: LatLng = { lat: -33.8688, lng: 151.2093, name: "Sydney" };
export const ROTTERDAM: LatLng = { lat: 51.9225, lng: 4.4792, name: "Rotterdam" };
export const FELIXSTOWE: LatLng = { lat: 51.964, lng: 1.3512, name: "Felixstowe" };
export const SOUTHAMPTON: LatLng = { lat: 50.9097, lng: -1.4044, name: "Southampton" };
export const HEATHROW: LatLng = { lat: 51.47, lng: -0.4543, name: "Heathrow" };
export const LONDON: LatLng = { lat: 51.5074, lng: -0.1278, name: "London" };

/** Every trade lane lands in the UK. */
export const ORIGINS = [
  SHENZHEN,
  SHANGHAI,
  MUMBAI,
  DUBAI,
  NEWYORK,
  LA,
  SAOPAULO,
  LAGOS,
  ISTANBUL,
  HCMC,
  TOKYO,
  SYDNEY,
  ROTTERDAM,
] as const;
export const DESTINATIONS = [LONDON, FELIXSTOWE, SOUTHAMPTON, HEATHROW] as const;

export const ARC_PALETTE = [
  "#FF5CAD",
  "#FF8A3D",
  "#FFE14A",
  "#8BE05A",
  "#3DDBE8",
  "#4DA3FF",
  "#7C6BFF",
  "#C084FC",
  "#FF4D6D",
  "#22D3A6",
  "#F97316",
  "#F472B6",
  "#A3E635",
] as const;

export const TRADE_ARCS = ORIGINS.map((start, i) => ({
  start,
  end: LONDON,
  color: ARC_PALETTE[i],
  colors: [ARC_PALETTE[i], "#FFFFFF"],
  dash: 1400 + i * 210,
  i,
  main: start === SHENZHEN,
}));

export const HUBS = [...ORIGINS, ...DESTINATIONS];

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

/** 0–1 progress through the journey section (unroll, then pins). */
export function mapOpenAmount(t: number) {
  return range(t, 0, 0.36);
}

export function mapRouteAmount(t: number) {
  return range(t, 0.18, 0.52);
}

export function mapPinShow(t: number, i: number) {
  return range(t, 0.38 + i * 0.12, 0.46 + i * 0.12);
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
