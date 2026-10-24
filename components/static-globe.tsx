/** Luminous blue dotted globe. Shown until react-globe.gl is ready, and for reduced motion. */

const ARCS: Array<{ d: string; color: string; w: number }> = [
  { d: "M168 96 C 132 52, 92 48, 78 68", color: "#FF5CAD", w: 1.6 },
  { d: "M172 88 C 136 44, 96 50, 78 68", color: "#FF8A3D", w: 1.3 },
  { d: "M150 118 C 118 78, 90 62, 78 68", color: "#FFE14A", w: 1.3 },
  { d: "M138 78 C 112 54, 90 58, 78 68", color: "#8BE05A", w: 1.25 },
  { d: "M38 86 C 52 58, 68 56, 78 68", color: "#4DA3FF", w: 1.35 },
  { d: "M28 102 C 48 70, 66 60, 78 68", color: "#7C6BFF", w: 1.25 },
  { d: "M46 148 C 58 108, 70 80, 78 68", color: "#C084FC", w: 1.2 },
  { d: "M70 150 C 74 112, 76 84, 78 68", color: "#22D3A6", w: 1.15 },
  { d: "M108 58 C 96 54, 86 60, 78 68", color: "#3DDBE8", w: 1.2 },
  { d: "M164 128 C 128 92, 96 72, 78 68", color: "#F97316", w: 1.2 },
  { d: "M176 112 C 140 70, 100 58, 78 68", color: "#F472B6", w: 1.2 },
  { d: "M158 156 C 120 118, 92 84, 78 68", color: "#A3E635", w: 1.15 },
  { d: "M96 54 C 90 58, 84 64, 78 68", color: "#FF4D6D", w: 1.1 },
];

const ORIGIN_DOTS: Array<[number, number, string]> = [
  [168, 96, "#FF5CAD"],
  [172, 88, "#FF8A3D"],
  [150, 118, "#FFE14A"],
  [138, 78, "#8BE05A"],
  [38, 86, "#4DA3FF"],
  [28, 102, "#7C6BFF"],
  [46, 148, "#C084FC"],
  [70, 150, "#22D3A6"],
  [108, 58, "#3DDBE8"],
  [164, 128, "#F97316"],
  [176, 112, "#F472B6"],
  [158, 156, "#A3E635"],
  [96, 54, "#FF4D6D"],
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
      {ARCS.map((a) => (
        <path key={a.color} d={a.d} fill="none" stroke={a.color} strokeWidth={a.w} strokeDasharray="4 3" />
      ))}
      {ORIGIN_DOTS.map(([x, y, color]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={color} />
      ))}
      <circle cx="78" cy="68" r="3.2" fill="#E8F4FF" />
      <circle cx="78" cy="68" r="7" fill="none" stroke="#E8F4FF" strokeOpacity="0.45" />
      <ellipse cx="100" cy="182" rx="40" ry="5" fill="#93C5FD" opacity="0.22" />
    </svg>
  );
}
