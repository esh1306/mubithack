import { cn } from "@/lib/utils";

/** Geometric stamp-P: stem + open bowl. No mascot, no clip-art. */
export function Mark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 32 36"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M2 0h16.4C26.6 0 32 5.3 32 13.1S26.6 26.2 18.4 26.2H10V36H2V0Zm8 7.4v11.4h7.8c4.2 0 6.8-2.2 6.8-5.7 0-3.4-2.6-5.7-6.8-5.7H10Z"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
  size = 22,
}: {
  className?: string;
  markClassName?: string;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[0.5em] text-foreground", className)}>
      <Mark size={size} className={cn("text-primary", markClassName)} />
      <span
        className="font-medium tracking-[-0.045em]"
        style={{ fontSize: Math.round(size * 0.72), lineHeight: 1 }}
      >
        Precedent
      </span>
    </span>
  );
}
