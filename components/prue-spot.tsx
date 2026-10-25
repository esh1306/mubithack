import { Prue, type PrueState } from "@/components/prue";
import { cn } from "@/lib/utils";

// Prue standing inside a page, with what she says in a bubble beside her.
export function PrueSpot({ state, size = 92, say, side = "left", className }: { state: PrueState; size?: number; say?: string; side?: "left" | "right"; className?: string }) {
  return (
    <div className={cn("hidden items-end gap-3 lg:flex", side === "right" && "flex-row-reverse", className)}>
      <Prue state={state} size={size} label="Prue" />
      {say && (
        <p
          className={cn(
            "guide-bubble mb-6 max-w-[15rem] rounded-2xl border border-primary/15 bg-card px-3.5 py-2.5 text-[13px] leading-snug text-foreground/80 shadow-[0_8px_22px_-16px_rgba(19,48,107,0.5)]",
            side === "left" ? "rounded-bl-sm" : "rounded-br-sm",
          )}
        >
          {say}
        </p>
      )}
    </div>
  );
}
