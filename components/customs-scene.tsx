import { cn } from "@/lib/utils";

// A crate rolls up to the tariff gate, is scanned, stamped with its code and rolls on.
// Pure SVG + CSS; still when `active` is false or the viewer prefers reduced motion.
export function CustomsScene({ active = true, code = "8539 52 00 00", className }: { active?: boolean; code?: string; className?: string }) {
  return (
    <div className={cn("customs-scene", active && "is-active", className)} aria-hidden>
      <svg viewBox="0 0 520 150" className="h-full w-full">
        <defs>
          <linearGradient id="cs-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#eef4ff" />
            <stop offset="1" stopColor="#f7f9fd" />
          </linearGradient>
          <linearGradient id="cs-beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="520" height="150" fill="url(#cs-sky)" />

        {/* distant cranes and ship */}
        <g fill="#c9d6ee">
          <rect x="24" y="52" width="6" height="74" />
          <rect x="24" y="52" width="70" height="5" />
          <rect x="70" y="57" width="2" height="26" />
          <rect x="430" y="44" width="6" height="82" />
          <rect x="390" y="44" width="76" height="5" />
          <rect x="400" y="49" width="2" height="30" />
          <path d="M440 112h70l-8 14h-58z" />
          <rect x="452" y="100" width="14" height="12" />
          <rect x="468" y="100" width="14" height="12" fill="#dbe4f4" />
          <rect x="484" y="100" width="14" height="12" />
        </g>

        {/* conveyor */}
        <rect x="0" y="126" width="520" height="6" fill="#13306b" opacity="0.85" />
        <g className="cs-rollers" fill="#13306b" opacity="0.35">
          {Array.from({ length: 27 }, (_, i) => (
            <circle key={i} cx={i * 20 + 6} cy="138" r="3" />
          ))}
        </g>

        {/* gate */}
        <g>
          <rect x="226" y="34" width="8" height="92" rx="2" fill="#13306b" />
          <rect x="300" y="34" width="8" height="92" rx="2" fill="#13306b" />
          <rect x="218" y="22" width="98" height="18" rx="3" fill="#13306b" />
          <text x="267" y="34.5" textAnchor="middle" fontSize="9" fontWeight="600" fill="#ffffff" letterSpacing="0.6" fontFamily="var(--font-plex), system-ui, sans-serif">
            UK TARIFF CHECK
          </text>
          <rect className="cs-beam" x="234" y="40" width="66" height="86" fill="url(#cs-beam)" />
          <circle className="cs-lamp" cx="267" cy="46" r="3" fill="#22c55e" />
        </g>

        {/* stamp arm */}
        <g className="cs-stamp">
          <rect x="262" y="40" width="10" height="16" fill="#4a5872" />
          <rect x="252" y="56" width="30" height="9" rx="2" fill="#c2362b" />
        </g>

        {/* crate */}
        <g className="cs-crate">
          <rect x="0" y="82" width="64" height="44" rx="3" fill="#d9a066" stroke="#9c6b3c" strokeWidth="1.5" />
          <path d="M0 96h64M0 112h64" stroke="#9c6b3c" strokeWidth="1" opacity="0.6" />
          <text x="8" y="93" fontSize="7" fill="#6b4422" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            NINGBO
          </text>
          <g className="cs-mark">
            <rect x="14" y="99" width="36" height="16" rx="2" fill="none" stroke="#c2362b" strokeWidth="1.6" transform="rotate(-6 32 107)" />
            <text x="32" y="110" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#c2362b" transform="rotate(-6 32 107)" fontFamily="var(--font-plex), system-ui, sans-serif">
              CHECKED
            </text>
          </g>
          <g className="cs-tag">
            <rect x="-6" y="60" width="76" height="16" rx="8" fill="#ffffff" stroke="#13306b" strokeWidth="1" />
            <text x="32" y="71" textAnchor="middle" fontSize="8" fontWeight="600" fill="#13306b" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
              {code}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
