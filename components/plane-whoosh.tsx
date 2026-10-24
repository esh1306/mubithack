"use client";

import { useEffect, useRef } from "react";
import { gsap, registerLandingMotion } from "@/components/landing-motion";

const PATH = "M -16 88 C 14 80, 26 62, 42 48 S 70 30, 122 4";

/** Banking airliner: off-screen → across the globe → off-screen. Never parked. */
export function PlaneWhoosh({
  reduced,
  onFlight,
}: {
  reduced: boolean;
  onFlight?: (t: number) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const flight = useRef(onFlight);
  flight.current = onFlight;

  useEffect(() => {
    const stageEl = stage.current;
    const moverEl = mover.current;
    const pathEl = path.current;
    if (!stageEl || !moverEl || !pathEl) return;
    registerLandingMotion();

    let dead = false;
    const craft = moverEl.querySelector<HTMLElement>("[data-craft]");
    const trail = moverEl.querySelector<HTMLElement>("[data-trail]");
    const img = moverEl.querySelector("img");
    const duration = reduced ? 0.85 : 4.4;

    const place = (t: number, scale: number) => {
      gsap.set(moverEl, {
        motionPath: {
          path: pathEl,
          align: pathEl,
          alignOrigin: [0.5, 0.5],
          autoRotate: 12,
          start: t,
          end: t,
        },
      });
      if (craft) gsap.set(craft, { scale });
    };

    const run = () => {
      if (dead || !moverEl || !pathEl) return;
      moverEl.dataset.whooshState = "flying";
      place(0, 0.52);
      gsap.set(moverEl, { opacity: 0 });
      if (trail) gsap.set(trail, { opacity: 0, scaleX: 0.15 });

      const tl = gsap.timeline({
        repeat: reduced ? 0 : -1,
        repeatDelay: reduced ? 0 : 7.6,
        defaults: { ease: "power2.inOut" },
      });

      const flightT = { t: 0 };
      tl.to(moverEl, { opacity: 1, duration: Math.min(0.28, duration * 0.12) }, 0);
      tl.to(
        flightT,
        {
          t: 1,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            const p = flightT.t;
            if (craft) gsap.set(craft, { scale: 0.5 + 0.62 * Math.sin(Math.PI * p) });
            flight.current?.(p);
          },
        },
        0,
      );
      tl.to(
        moverEl,
        {
          motionPath: {
            path: pathEl,
            align: pathEl,
            alignOrigin: [0.5, 0.5],
            autoRotate: 12,
            start: 0,
            end: 1,
          },
          duration,
          ease: "power2.inOut",
          onComplete() {
            moverEl.dataset.whooshState = "done";
            flight.current?.(1);
          },
        },
        0,
      );
      if (trail) {
        tl.to(trail, { opacity: 0.85, scaleX: 1, duration: Math.min(0.55, duration * 0.2), ease: "sine.out" }, 0.08);
        tl.to(trail, { opacity: 0, duration: 0.35, ease: "power2.in" }, duration - 0.4);
      }
      tl.to(moverEl, { opacity: 0, duration: 0.32, ease: "power2.in" }, duration - 0.36);
      tl.add(() => {
        place(1, 0.32);
        flight.current?.(0);
      });

      return tl;
    };

    let tl: gsap.core.Timeline | undefined;
    const start = () => {
      if (dead) return;
      tl = run();
    };

    if (img && !img.complete) {
      void img.decode().then(start).catch(start);
    } else {
      start();
    }

    return () => {
      dead = true;
      tl?.kill();
      flight.current?.(0);
    };
  }, [reduced]);

  return (
    <div ref={stage} className="plane-whoosh-stage" aria-hidden>
      <svg className="plane-whoosh-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path ref={path} id="landing-whoosh-path" d={PATH} fill="none" />
      </svg>
      <div ref={mover} className="plane-whoosh-mover" data-whoosh-plane data-whoosh-state="ready">
        <div data-craft className="plane-whoosh-craft">
          <div data-trail className="plane-whoosh-trail" />
          <img src="/plane-banking.webp" alt="" draggable={false} />
        </div>
      </div>
    </div>
  );
}
