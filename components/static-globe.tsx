/** Luminous blue dotted globe. Shown until react-globe.gl is ready, and for reduced motion. */

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
        <radialGradient id="ocean-ball" cx="36%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="42%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0F2A6B" />
        </radialGradient>
        <filter id="globe-soft">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#93C5FD" floodOpacity="0.45" />
        </filter>
        <filter id="dot-glow">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="84" fill="none" stroke="#BFDBFE" strokeOpacity="0.35" strokeWidth="6" />
      <circle cx="100" cy="100" r="78" fill="url(#ocean-ball)" filter="url(#globe-soft)" />
      {dots.map(([x, y], i) => (
        <circle key={`${x}-${y}-${i}`} cx={x} cy={y} r="1.8" fill="#E8F4FF" fillOpacity="0.92" filter="url(#dot-glow)" />
      ))}
      <path d="M148 108 C 118 64, 78 58, 58 80" fill="none" stroke="#FF5CAD" strokeWidth="1.6" strokeDasharray="4 3" />
      <path d="M142 116 C 110 78, 70 92, 62 108" fill="none" stroke="#3DDBE8" strokeWidth="1.3" strokeDasharray="3 3" />
      <circle cx="148" cy="108" r="2.4" fill="#FF8A3D" />
      <circle cx="58" cy="80" r="2.4" fill="#E8F4FF" />
      <ellipse cx="100" cy="182" rx="40" ry="5" fill="#93C5FD" opacity="0.22" />
    </svg>
  );
}
