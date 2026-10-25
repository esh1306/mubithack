"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Prue, type PrueState } from "@/components/prue";
import { PrueChat, type ChatMsg } from "@/components/prue-chat";
import { prueFor } from "@/lib/prue-tips";
import { cn } from "@/lib/utils";

// The sidebar and corner Prue. Pages that place her themselves (see lib/prue-tips) render their own,
// so there is never more than one on screen. She stands on the bottom of the window: pick her up and
// throw her, and she falls back down. Click her to open the "Ask Prue" drawer.
type Override = { state?: PrueState; text: string } | null;
let override: Override = null;
const listeners = new Set<() => void>();
const set = (o: Override) => {
  override = o;
  listeners.forEach((l) => l());
};

export function usePrueSays(text: string, state?: PrueState) {
  useEffect(() => {
    set({ text, state });
    return () => set(null);
  }, [text, state]);
}

function useOverride() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => override,
    () => null,
  );
}

// Physics, in px and seconds. Only x is saved: y is always the ground.
const X_KEY = "prue:x";
const W = 104, H = 152; // Prue at size 104 (240:350 artboard)
const FLOOR = 12; // gap between her feet and the bottom of the window
const WALL = 4;
const G = 2600; // gravity
const BOUNCE = 0.32; // share of speed kept on each floor bounce
const REST_VY = 170; // landing slower than this ends the bouncing
const WALL_BOUNCE = 0.45;
const AIR_DRAG = 0.35; // per second, on vx
const GROUND_FRICTION = 7; // per second, on vx while sliding
const MAX_THROW = 2600;
const TILT_K = 180, TILT_C = 13; // spring pulling her lean towards its target
const SQUASH_K = 320, SQUASH_C = 11; // spring for the landing squash and its wobble
const DRAWER = 460; // the Ask Prue drawer's width; she hops out of its way
const LANDED_MS = 800; // how long the landed pose (squash, dizzy eyes) shows before her page pose comes back

type Phase = "rest" | "held" | "fall";
type Sim = { x: number; y: number; vx: number; vy: number; angle: number; av: number; sq: number; sqv: number; phase: Phase; t: number; last: number; moved: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ground = () => window.innerHeight - H - FLOOR;
const maxX = () => window.innerWidth - W - WALL;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PrueGuide({ broker, firm, section: page }: { broker: string; firm: string; section: string }) {
  const q = useSearchParams();
  const section = page !== "classify" ? page : q.get("new") === "1" ? "classify:new" : q.get("batch") || q.get("sample") ? "classify:invoice" : "classify";
  const said = useOverride();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("rest");
  const [placed, setPlaced] = useState(false);
  const [onRight, setOnRight] = useState(false);
  const [landed, setLanded] = useState(false); // just hit the floor after a drop or throw
  const [hopping, setHopping] = useState(false); // airborne because she hopped out of the drawer's way, not thrown
  const conf = prueFor(section);
  const visible = conf.place === "sidebar" || conf.place === "corner";
  const corner = conf.place === "corner";
  const pose: PrueState = loading ? "thinking" : (said?.state ?? conf.pose);
  const state: PrueState = phase === "held" ? "held" : phase === "fall" ? (hopping ? "hello" : "falling") : landed ? "landed" : pose;
  const text = said?.text ?? conf.say;
  const cta = section === "home" ? { label: "Show me one shipment", href: `/${broker}/tour` } : { label: "Take the product tour", href: `/${broker}/tour` };

  const root = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const sim = useRef<Sim>({ x: 0, y: 0, vx: 0, vy: 0, angle: 0, av: 0, sq: 0, sqv: 0, phase: "rest", t: 0, last: 0, moved: 0 });
  const raf = useRef<number | null>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const still = useRef(false); // prefers-reduced-motion, read when she's picked up
  const dropped = useRef(false); // has she been moved by hand (so her x is saved, not the page default)
  const hop = useRef(false); // mirrors `hopping` for the sim
  const landTimer = useRef<number | null>(null);

  // Write the sim to the DOM: translate for position, rotate for the lean, scale (from her feet) for squash and stretch.
  const paint = useCallback(() => {
    const s = sim.current;
    if (root.current) root.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
    if (tilt.current) tilt.current.style.transform = `rotate(${s.angle}deg)`;
    const stretch = s.phase === "held" ? 0.03 : s.phase === "fall" && s.vy > 0 ? Math.min(0.1, s.vy / 9000) : 0;
    if (body.current) body.current.style.transform = `scale(${1 + s.sq * 0.7 - stretch * 0.5}, ${1 - s.sq + stretch})`;
  }, []);

  const toPhase = useCallback((p: Phase) => {
    sim.current.phase = p;
    setPhase(p);
    if (p === "held" && hop.current) {
      hop.current = false; // caught mid-hop: from here on it's a throw
      setHopping(false);
    }
  }, []);

  // Touchdown: after a drop or throw, the one-shot landed pose, then back to the page's pose. A drawer hop just lands.
  const land = useCallback(() => {
    if (landTimer.current) clearTimeout(landTimer.current);
    landTimer.current = null;
    if (hop.current) {
      hop.current = false;
      setHopping(false);
      return;
    }
    setLanded(true);
    landTimer.current = window.setTimeout(() => {
      landTimer.current = null;
      setLanded(false);
    }, LANDED_MS);
  }, []);

  // One frame of the sim; false once she has settled and the loop can stop.
  const step = useCallback(
    (now: number): boolean => {
      const s = sim.current;
      const dt = Math.min(0.032, (now - s.last) / 1000);
      s.last = now;
      s.t += dt;
      const floor = ground(), right = maxX();
      let lean = 0;

      if (s.phase === "held") {
        // Dangle: her feet swing behind the drag, plus a little sway. The throw speed fades once the pointer stops.
        if (now - s.moved > 50) {
          s.vx *= Math.exp(-12 * dt);
          s.vy *= Math.exp(-12 * dt);
        }
        lean = still.current ? 0 : clamp(s.vx * 0.022, -32, 32) + Math.sin(s.t * 4) * 3;
      } else {
        if (s.phase === "fall") {
          s.vy += G * dt;
          s.vx *= Math.exp(-AIR_DRAG * dt);
          s.y += s.vy * dt;
          if (s.y < WALL) {
            s.y = WALL;
            s.vy = Math.abs(s.vy) * 0.3;
          }
          if (s.y >= floor) {
            const impact = s.vy;
            s.y = floor;
            s.vx *= 0.8; // the floor grabs her feet a little
            s.sqv = Math.min(6, s.sqv + impact / 400); // squash, then the spring stretches her back up
            if (impact > REST_VY) s.vy = -impact * BOUNCE;
            else {
              s.vy = 0;
              toPhase("rest");
              land();
            }
          }
          // Flail on the way down: lean into the throw and wiggle while she's moving fast.
          lean = clamp(s.vx * 0.02, -40, 40) + Math.sin(s.t * 22) * 7 * Math.min(1, Math.abs(s.vy) / 600);
        } else {
          s.vx *= Math.exp(-GROUND_FRICTION * dt);
          lean = clamp(s.vx * 0.012, -18, 18); // sliding: lean back against the slide
        }
        s.x += s.vx * dt;
        if (s.x < WALL || s.x > right) {
          s.x = clamp(s.x, WALL, right);
          s.vx = -s.vx * WALL_BOUNCE;
          s.av += s.vx * 0.05; // a little knock from the wall
        }
      }

      s.av += ((lean - s.angle) * TILT_K - s.av * TILT_C) * dt;
      s.angle += s.av * dt;
      s.sqv += (-s.sq * SQUASH_K - s.sqv * SQUASH_C) * dt;
      s.sq += s.sqv * dt;
      paint();

      const moving = s.phase !== "rest" || Math.abs(s.vx) > 3 || Math.abs(s.angle) > 0.3 || Math.abs(s.av) > 1 || Math.abs(s.sq) > 0.003 || Math.abs(s.sqv) > 0.02;
      if (moving) return true;
      Object.assign(s, { vx: 0, angle: 0, av: 0, sq: 0, sqv: 0 });
      paint();
      setOnRight(s.x + W / 2 > window.innerWidth / 2);
      if (dropped.current)
        try {
          sessionStorage.setItem(X_KEY, String(Math.round(s.x)));
        } catch {}
      return false;
    },
    [paint, toPhase, land],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    sim.current.last = performance.now();
    const loop = (now: number) => {
      raf.current = step(now) ? requestAnimationFrame(loop) : null;
    };
    raf.current = requestAnimationFrame(loop);
  }, [step]);

  // Reduced motion: no flight, she just appears on the ground.
  const snapDown = useCallback(() => {
    Object.assign(sim.current, { y: ground(), vx: 0, vy: 0, angle: 0, av: 0, sq: 0, sqv: 0 });
    toPhase("rest");
    paint();
    setOnRight(sim.current.x + W / 2 > window.innerWidth / 2);
    try {
      sessionStorage.setItem(X_KEY, String(Math.round(sim.current.x)));
    } catch {}
  }, [paint, toPhase]);

  // Stand her on the ground: at her saved x, else the page's default (by the sidebar, or bottom-right on corner pages).
  useLayoutEffect(() => {
    if (!visible) return;
    const s = sim.current;
    if (!dropped.current) {
      let saved: number | null = null;
      try {
        const v = sessionStorage.getItem(X_KEY);
        saved = v === null ? null : Number(v);
      } catch {}
      dropped.current = saved !== null && Number.isFinite(saved);
      s.x = dropped.current ? saved! : corner ? window.innerWidth - W - 16 : 12;
    }
    s.x = clamp(s.x, WALL, maxX());
    if (s.phase === "rest") s.y = ground();
    paint();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- position is client only; hide her until it's set
    setPlaced(true);
    setOnRight(s.x + W / 2 > window.innerWidth / 2);
  }, [visible, corner, paint]);

  // Keep her on the floor and inside the walls when the window resizes.
  useEffect(() => {
    const onResize = () => {
      const s = sim.current;
      s.x = clamp(s.x, WALL, maxX());
      if (s.phase === "rest") s.y = ground();
      else s.y = Math.min(s.y, ground());
      paint();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      if (landTimer.current) clearTimeout(landTimer.current);
    };
  }, [paint]);

  // Opening the drawer: if she'd be under it, she hops out to its left edge.
  const openDrawer = () => {
    setOpen(true);
    const s = sim.current;
    const edge = window.innerWidth - DRAWER;
    if (s.phase !== "rest" || s.x + W < edge - 8) return;
    const target = Math.max(WALL, edge - W - 24);
    if (reduced()) {
      s.x = target;
      snapDown();
      return;
    }
    dropped.current = true;
    const up = 950, air = (2 * up) / G;
    Object.assign(s, { vx: (target - s.x) / air, vy: -up });
    hop.current = true;
    setHopping(true);
    toPhase("fall");
    kick();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const s = sim.current;
    still.current = reduced();
    const catching = s.phase === "fall"; // grab her mid-air: no click, she just goes back in your hand
    drag.current = { dx: e.clientX - s.x, dy: e.clientY - s.y, sx: e.clientX, sy: e.clientY, moved: catching };
    if (catching) {
      Object.assign(s, { vx: 0, vy: 0, moved: performance.now() });
      toPhase("held");
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    // A few pixels of wobble is still a click.
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
    const s = sim.current;
    const now = performance.now();
    const x = clamp(e.clientX - d.dx, WALL, maxX());
    const y = clamp(e.clientY - d.dy, WALL, ground());
    if (!d.moved || s.phase !== "held") {
      d.moved = true;
      Object.assign(s, { vx: 0, vy: 0 });
      toPhase("held");
    } else {
      // Smoothed pointer velocity, so the release can carry it as a throw.
      const dt = Math.max(0.008, (now - s.moved) / 1000);
      s.vx = s.vx * 0.6 + ((x - s.x) / dt) * 0.4;
      s.vy = s.vy * 0.6 + ((y - s.y) / dt) * 0.4;
    }
    Object.assign(s, { x, y, moved: now });
    kick();
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    justDragged.current = true; // swallow the click that follows the drop
    dropped.current = true;
    const s = sim.current;
    if (still.current) return snapDown();
    s.vx = clamp(s.vx, -MAX_THROW, MAX_THROW);
    s.vy = clamp(s.vy, -MAX_THROW, MAX_THROW);
    toPhase("fall");
    kick();
  };
  const onClick = () => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    openDrawer();
  };

  return (
    <>
      <PrueChat
        open={open}
        onOpenChange={setOpen}
        broker={broker}
        firm={firm}
        section={section}
        greeting={text}
        cta={cta}
        messages={messages}
        setMessages={setMessages}
        loading={loading}
        setLoading={setLoading}
      />
      {visible && (
        // Positioned by transform from the sim (see paint); above the drawer's backdrop while it is open.
        <div ref={root} className={cn("fixed left-0 top-0 hidden will-change-transform md:block", open ? "z-[60]" : "z-40", !placed && "invisible")}>
          <div ref={tilt} className="origin-center">
            <div ref={body} className="origin-bottom">
              <button
                type="button"
                onClick={onClick}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={cn(
                  "block touch-none select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  phase === "held" ? "cursor-grabbing" : "cursor-grab",
                  phase === "rest" && "transition-transform hover:-translate-y-0.5",
                )}
                aria-label="Ask Prue (drag to throw her)"
              >
                <Prue state={state} size={104} />
              </button>
            </div>
          </div>
          {!open && phase === "rest" && (
            <button
              type="button"
              onClick={openDrawer}
              className={cn(
                "absolute bottom-4 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] text-muted-foreground shadow-sm hover:text-foreground",
                onRight ? "right-full mr-2" : "left-full ml-2",
              )}
            >
              Ask Prue
            </button>
          )}
        </div>
      )}
    </>
  );
}
