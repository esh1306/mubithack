import { cn } from "@/lib/utils";

/** Original clerk-bot: holds the stamp. Bob, blink, wave. */
export function PrecedentMascot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 210"
      className={cn("mascot overflow-visible", className)}
      role="img"
      aria-label="Precedent, a small clerk holding a stamp"
    >
      <ellipse className="mascot-shadow" cx="86" cy="198" rx="46" ry="7" fill="#241c16" opacity="0.12" />
      <g className="mascot-bob">
        <path
          d="M58 118c-10 8-16 22-14 34 2 4 8 6 12 3 6-14 10-24 16-32-6-3-10-4-14-5z"
          fill="#FBF7F1"
          stroke="#241c16"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <rect x="56" y="104" width="72" height="74" rx="24" fill="#FBF7F1" stroke="#241c16" strokeWidth="2.6" />
        <path
          fill="#C43D32"
          d="M80 124h18.2c7.4 0 12.2 4.4 12.2 10.8S105.6 146 98.2 146H88v10h-8V124Zm8 7v8h9.2c3.4 0 5.4-1.8 5.4-4s-2-4-5.4-4H88Z"
        />
        <circle cx="92" cy="74" r="40" fill="#FBF7F1" stroke="#241c16" strokeWidth="2.6" />
        <circle cx="72" cy="86" r="5" fill="#C43D32" opacity="0.22" />
        <circle cx="112" cy="86" r="5" fill="#C43D32" opacity="0.22" />
        <g className="mascot-blink">
          <ellipse cx="78" cy="72" rx="5" ry="6.2" fill="#241c16" />
          <ellipse cx="106" cy="72" rx="5" ry="6.2" fill="#241c16" />
          <circle cx="80" cy="70" r="1.5" fill="#FBF7F1" />
          <circle cx="108" cy="70" r="1.5" fill="#FBF7F1" />
        </g>
        <path d="M80 90c6 7 18 7 24 0" fill="none" stroke="#241c16" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M78 114h28l8 12H70l8-12z" fill="#241c16" />
        <path d="M84 114l8 10 8-10" fill="#FBF7F1" />
        <g className="mascot-wave" style={{ transformOrigin: "128px 122px" }}>
          <path
            d="M124 122c16-4 24-18 26-32"
            fill="none"
            stroke="#241c16"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="150" cy="82" r="5" fill="#FBF7F1" stroke="#241c16" strokeWidth="2.2" />
          <g transform="translate(136 48) rotate(-18)">
            <rect x="0" y="0" width="28" height="34" rx="4" fill="#C43D32" stroke="#241c16" strokeWidth="2" />
            <path fill="#FBF7F1" d="M8 8h10.4c4.2 0 7 2.5 7 6.2 0 3.8-2.8 6.3-7 6.3H13v6.5H8V8Zm5 4.2v4.2h4.8c1.8 0 2.9-1 2.9-2.1 0-1.2-1.1-2.1-2.9-2.1H13Z" />
            <rect x="11" y="32" width="6" height="10" rx="1.5" fill="#241c16" />
          </g>
        </g>
        <circle cx="92" cy="28" r="4.5" fill="#C43D32" stroke="#241c16" strokeWidth="2" />
        <path d="M92 33v6" stroke="#241c16" strokeWidth="2.2" />
      </g>
    </svg>
  );
}
