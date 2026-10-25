"use client";

import { useEffect, useRef } from "react";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

/** Elliptical orbit. t=0 at the right; lower half = in front of the globe, upper half = behind. */
function orbitPose(t: number, w: number, h: number) {
  const theta = t * Math.PI * 2;
  const cx = w * 0.5;
  const cy = h * 0.52;
  const rx = w * 0.42;
  const ry = h * 0.22;
  const x = cx + rx * Math.cos(theta);
  const y = cy + ry * Math.sin(theta);
  const dx = -rx * Math.sin(theta);
  const dy = ry * Math.cos(theta);
  const near = (Math.sin(theta) + 1) / 2;
  return { x, y, dx, dy, near, goingLeft: dx < 0, front: near >= 0.5 };
}

function waitForImage(img: HTMLImageElement | null) {
  if (!img || img.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    window.setTimeout(done, 400);
  });
}

/** Continuous orbit. Front = larger, opaque, over the globe. Behind = smaller, dim, under the globe. */
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
    const duration = reduced ? 2.2 : 10;

    const pose = (t: number) => {
      const { x, y, dy, near, goingLeft, front } = orbitPose(t, stageEl.clientWidth, stageEl.clientHeight);
      const bank = Math.max(-18, Math.min(18, dy * 0.1));
      moverEl.dataset.whooshState = "orbit";
      moverEl.dataset.orbit = front ? "front" : "behind";
      stageEl.dataset.orbit = front ? "front" : "behind";
      gsap.set(moverEl, {
        x,
        y,
        width: 64 + 80 * near,
        xPercent: -50,
        yPercent: -50,
        opacity: 0.3 + 0.7 * near,
      });
      if (craft) {
        gsap.set(craft, {
          scaleX: goingLeft ? 1 : -1,
          scaleY: 1,
          rotation: goingLeft ? -bank : bank,
        });
      }
      if (trail) gsap.set(trail, { opacity: 0.12 + 0.55 * near });
      flight.current?.(t);
    };

    const run = () => {
      if (dead || !moverEl) return;
      pose(0.22);
      const flightT = { t: 0.22 };
      return gsap.to(flightT, {
        t: 1.22,
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
    void waitForImage(img).then(() => {
      if (!dead) tw = run();
    });

    return () => {
      dead = true;
      tw?.kill();
      flight.current?.(0);
    };
  }, [reduced]);

  return (
    <div ref={stage} className="plane-whoosh-stage" data-orbit="front" aria-hidden>
      <div ref={mover} className="plane-whoosh-mover" data-whoosh-plane data-whoosh-state="ready" data-orbit="front">
        <div data-craft className="plane-whoosh-craft">
          <div data-trail className="plane-whoosh-trail" />
          <img src="/plane-banking.webp" alt="" draggable={false} decoding="async" />
        </div>
      </div>
    </div>
  );
}
