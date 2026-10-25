import { cn } from "@/lib/utils";
import { Prue, type PrueState } from "@/components/prue";

/** Prue, Precedent's mascot, as the logo: the still, compact crop (no receipt), a little larger than the old P. */
export function Mark({ className, size = 28, state }: { className?: string; size?: number; state?: PrueState }) {
  return <Prue mood={state ? undefined : "neutral"} state={state} size={Math.round(size * 1.35)} compact className={cn("shrink-0", className)} label="Precedent" />;
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
      <Mark size={size} className={cn("text-brand", markClassName)} />
      <span
        className="wordmark-type font-[800] tracking-[-0.06em]"
        style={{
          fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          fontSize: Math.round(size * 0.72),
          lineHeight: 1,
        }}
      >
        Precedent
      </span>
    </span>
  );
}
