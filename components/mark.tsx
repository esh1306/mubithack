import { cn } from "@/lib/utils";
import { Prue, type PrueState } from "@/components/prue";

/** Prue, Precedent's mascot, as the logo: the still, compact crop (no receipt), a little larger than the old P. */
export function Mark({ className, size = 28, state }: { className?: string; size?: number; state?: PrueState }) {
  return <Prue mood={state ? undefined : "neutral"} state={state} size={Math.round(size * 1.35)} compact className={cn("shrink-0", className)} label="Precedent" />;
}

export function Wordmark({
  className,
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("wordmark-type inline-flex items-baseline font-bold tracking-[-0.03em] text-foreground", className)}
      style={{ fontFamily: "var(--font-ruling), Georgia, serif", fontSize: Math.round(size * 1.3), lineHeight: 1 }}
    >
      Precedent<span className="text-brand">.</span>
    </span>
  );
}
