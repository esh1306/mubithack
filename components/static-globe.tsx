/** Pale dotted globe. Shown until react-globe.gl is ready, and for reduced motion. */

export function StaticGlobe({ className = "" }: { className?: string }) {
  const dots = [
    [72, 62], [80, 58], [88, 64], [96, 70], [104, 66], [112, 60], [120, 68], [128, 74],
    [84, 78], [92, 84], [108, 80], [116, 88], [70, 90], [78, 98], [128, 98], [136, 90],
    [60, 72], [56, 80], [148, 108], [142, 116], [100, 108], [90, 114], [118, 120],
  ];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden role="img">
      <title>Earth</title>
      <defs>
        <radialGradient id="ocean-ball" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#eef2fb" />
          <stop offset="100%" stopColor="#d9e2f2" />
        </radialGradient>
        <filter id="globe-soft">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#7C6BFF" floodOpacity="0.18" />
        </filter>
      </defs>
      <circle cx="100" cy="100" r="84" fill="none" stroke="#7C6BFF" strokeOpacity="0.22" strokeWidth="6" />
      <circle cx="100" cy="100" r="78" fill="url(#ocean-ball)" filter="url(#globe-soft)" />
      {dots.map(([x, y], i) => (
        <circle key={`${x}-${y}-${i}`} cx={x} cy={y} r="1.7" fill="#7C6BFF" fillOpacity="0.72" />
      ))}
      <path d="M148 108 C 118 64, 78 58, 58 80" fill="none" stroke="#FF5CAD" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M142 116 C 110 78, 70 92, 62 108" fill="none" stroke="#3DDBE8" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="148" cy="108" r="2.4" fill="#E63B2E" />
      <circle cx="58" cy="80" r="2.4" fill="#7C6BFF" />
      <ellipse cx="100" cy="182" rx="40" ry="5" fill="#7C6BFF" opacity="0.12" />
    </svg>
  );
}
