"use client";

import { useEffect, useRef } from "react";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

/** Elliptical orbit in the globe slot. t=0 at the right; bottom = in front, top = behind. */
function orbitPose(t: number, w: number, h: number) {
  const theta = t * Math.PI * 2;
  const cx = w * 0.5;
  const cy = h * 0.52;
  const rx = w * 0.4;
  const ry = h * 0.2;
  const x = cx + rx * Math.cos(theta);
  const y = cy + ry * Math.sin(theta);
  const dx = -rx * Math.sin(theta);
  const dy = ry * Math.cos(theta);
  const depth = Math.sin(theta);
  return { x, y, dx, dy, depth, goingLeft: dx < 0, front: depth >= -0.04 };
}

/** Continuous orbit around the globe. Nose along travel, larger in front, occluded behind. */
export function PlaneWhoosh({
  reduced,
  onFlight,
}: {
  reduced: boolean;
  onFlight?: (t: number) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  const flight = useRef(onFlight);
  flight.current = onFlight;

  useEffect(() => {
    const stageEl = stage.current;
    const moverEl = mover.current;
    if (!stageEl || !moverEl) return;
    registerLandingMotion();

    let dead = false;
    const craft = moverEl.querySelector<HTMLElement>("[data-craft]");
    const trail = moverEl.querySelector<HTMLElement>("[data-trail]");
    const img = moverEl.querySelector("img");
    const duration = reduced ? 2.2 : 9;

    const pose = (t: number) => {
      const { x, y, dy, depth, goingLeft, front } = orbitPose(t, stageEl.clientWidth, stageEl.clientHeight);
      const scale = 0.5 + 0.52 * (depth + 1) / 2;
      const bank = Math.max(-24, Math.min(24, dy * 0.12));
      moverEl.dataset.whooshState = "orbit";
      moverEl.dataset.orbit = front ? "front" : "behind";
      moverEl.style.zIndex = front ? "20" : "5";
      gsap.set(moverEl, { x, y, xPercent: -50, yPercent: -50, opacity: 1 });
      if (craft) {
        gsap.set(craft, {
          scaleX: (goingLeft ? 1 : -1) * scale,
          scaleY: scale,
          rotation: goingLeft ? -bank : bank,
        });
      }
      if (trail) gsap.set(trail, { opacity: 0.25 + 0.55 * (depth + 1) / 2 });
      flight.current?.(t);
    };

    const run = () => {
      if (dead || !moverEl) return;
      pose(0.18);
      const flightT = { t: 0.18 };
      return gsap.to(flightT, {
        t: 1.18,
        duration,
        ease: "none",
        repeat: reduced ? 0 : -1,
        onUpdate: () => {
          const wrapped = ((flightT.t % 1) + 1) % 1;
          pose(wrapped);
        },
      });
    };

    let tw: gsap.core.Tween | undefined;
    const start = () => {
      if (dead) return;
      tw = run();
    };

    if (img && !img.complete) {
      void img.decode().then(start).catch(start);
    } else {
      start();
    }

    return () => {
      dead = true;
      tw?.kill();
      flight.current?.(0);
    };
  }, [reduced]);

  return (
    <div ref={stage} className="plane-whoosh-stage" aria-hidden>
      <div ref={mover} className="plane-whoosh-mover" data-whoosh-plane data-whoosh-state="ready" data-orbit="front">
        <div data-craft className="plane-whoosh-craft">
          <div data-trail className="plane-whoosh-trail" />
          <img src="/plane-banking.webp" alt="" draggable={false} />
        </div>
      </div>
    </div>
  );
}
