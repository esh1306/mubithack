/** Luminous blue dotted globe. Shown until react-globe.gl is ready, and for reduced motion. */

const ARCS: Array<{ d: string; color: string }> = [
  { d: "M158 92 C 128 70, 96 62, 82 70", color: "#FF5CAD" },
  { d: "M150 118 C 122 86, 98 70, 82 70", color: "#FF8A3D" },
  { d: "M138 78 C 112 64, 94 66, 82 70", color: "#FFE14A" },
  { d: "M42 96 C 58 74, 72 68, 82 70", color: "#4DA3FF" },
  { d: "M52 140 C 64 104, 74 80, 82 70", color: "#8BE05A" },
  { d: "M108 54 C 96 58, 88 64, 82 70", color: "#3DDBE8" },
  { d: "M164 110 C 130 82, 100 68, 82 70", color: "#F472B6" },
  { d: "M70 150 C 76 112, 80 86, 82 70", color: "#22D3A6" },
];

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
      </defs>
      <circle cx="100" cy="100" r="84" fill="none" stroke="#BFDBFE" strokeOpacity="0.35" strokeWidth="6" />
      <circle cx="100" cy="100" r="78" fill="url(#ocean-ball)" filter="url(#globe-soft)" />
      {dots.map(([x, y], i) => (
        <circle key={`${x}-${y}-${i}`} cx={x} cy={y} r="1.8" fill="#E8F4FF" fillOpacity="0.92" />
      ))}
      {ARCS.map((a) => (
        <path key={a.color} d={a.d} fill="none" stroke={a.color} strokeWidth="1.15" strokeDasharray="5 4" />
      ))}
      <circle cx="82" cy="70" r="3.1" fill="#E8F4FF" />
      <circle cx="82" cy="70" r="7" fill="none" stroke="#E8F4FF" strokeOpacity="0.4" />
      <ellipse cx="100" cy="182" rx="40" ry="5" fill="#93C5FD" opacity="0.22" />
    </svg>
  );
}
