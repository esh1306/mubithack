// Prue, Precedent's customs-stamp avatar (same drawing as in the launch video), as a static React SVG.
type Mood = "neutral" | "happy" | "think";

const C = {
  wood: "oklch(0.62 0.085 62)",
  woodDark: "oklch(0.5 0.08 58)",
  body: "oklch(0.985 0.006 85)",
  ink: "oklch(0.22 0.012 65)",
  blue: "oklch(0.43 0.14 258)",
  blush: "oklch(0.8 0.08 25)",
};

export function Prue({ size = 48, mood = "neutral", className }: { size?: number; mood?: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} className={className} role="img" aria-label="Prue, Precedent's assistant">
      <ellipse cx="100" cy="236" rx="70" ry="9" fill="oklch(0.3 0.02 60 / 14%)" />
      <path d="M44 150 Q22 150 18 128" fill="none" stroke={C.ink} strokeWidth="7" strokeLinecap="round" />
      <path d="M156 150 Q178 150 182 172" fill="none" stroke={C.ink} strokeWidth="7" strokeLinecap="round" />
      <rect x="28" y="182" width="144" height="36" rx="12" fill={C.blue} />
      <rect x="36" y="210" width="128" height="8" rx="4" fill="oklch(0.36 0.13 258)" />
      <rect x="84" y="62" width="32" height="44" rx="9" fill={C.woodDark} />
      <circle cx="100" cy="48" r="32" fill={C.wood} />
      <ellipse cx="89" cy="36" rx="11" ry="7" fill="oklch(1 0 0 / 28%)" />
      <rect x="38" y="96" width="124" height="94" rx="28" fill={C.body} stroke={C.ink} strokeWidth="5" />
      <circle cx="66" cy="152" r="9" fill={C.blush} opacity="0.65" />
      <circle cx="134" cy="152" r="9" fill={C.blush} opacity="0.65" />
      {mood === "happy" ? (
        <>
          <path d="M69 139 Q78 128 87 139" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
          <path d="M113 139 Q122 128 131 139" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
          <path d="M84 156 Q100 174 116 156" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="78" cy="136" rx="7" ry="9.5" fill={C.ink} />
          <ellipse cx="122" cy="136" rx="7" ry="9.5" fill={C.ink} />
          <circle cx="80.5" cy="132" r="2.4" fill="white" />
          <circle cx="124.5" cy="132" r="2.4" fill="white" />
          {mood === "think" ? (
            <>
              <path d="M68 117 Q78 112 88 116" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
              <path d="M112 118 Q122 114 132 119" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
              <path d="M90 161 Q100 158 110 161" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
            </>
          ) : (
            <path d="M86 158 Q100 170 114 158" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );
}
