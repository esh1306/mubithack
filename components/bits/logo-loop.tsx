import type { ReactNode } from "react";

/** LogoLoop — after React Bits (MIT, David Haz). CSS track, no extra deps. */
export function LogoLoop({ children }: { children: ReactNode }) {
  return (
    <div className="logo-loop relative overflow-hidden">
      <div className="logo-loop-track">
        <div className="flex items-center gap-8 pr-8">{children}</div>
        <div className="flex items-center gap-8 pr-8" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
