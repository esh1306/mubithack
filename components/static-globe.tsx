/** Navy sphere + parchment land blobs. Shown until react-globe.gl is ready, and for reduced motion. */

export function StaticGlobe({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      role="img"
    >
      <title>Earth</title>
      <defs>
        <radialGradient id="ocean-ball" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#163552" />
          <stop offset="55%" stopColor="#0B1F33" />
          <stop offset="100%" stopColor="#06141f" />
        </radialGradient>
        <filter id="globe-soft">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#041018" floodOpacity="0.45" />
        </filter>
      </defs>
      <circle cx="100" cy="100" r="82" fill="none" stroke="#2F6F73" strokeOpacity="0.35" strokeWidth="3" />
      <circle cx="100" cy="100" r="78" fill="url(#ocean-ball)" filter="url(#globe-soft)" />
      <g fill="#F3EAD3" fillOpacity="0.92">
        <path d="M118 58 C140 60 158 72 162 90 C166 108 152 118 138 112 C128 128 148 142 132 150 C110 160 98 138 86 132 C70 140 58 128 62 112 C48 108 52 90 66 82 C72 68 96 52 118 58Z" />
        <path d="M58 70 C70 66 78 74 74 84 C64 88 52 80 58 70Z" />
        <path d="M150 118 C160 122 164 138 152 146 C140 142 142 124 150 118Z" />
      </g>
      <path
        d="M150 118 C 122 70, 78 62, 62 82"
        fill="none"
        stroke="#E63B2E"
        strokeWidth="1.7"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
      <circle cx="150" cy="118" r="2.6" fill="#C9A227" />
      <circle cx="62" cy="82" r="2.6" fill="#C9A227" />
      <ellipse cx="100" cy="180" rx="44" ry="6" fill="#041018" opacity="0.35" />
    </svg>
  );
}
