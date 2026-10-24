import { cn } from "@/lib/utils";

// 10-digit commodity code as "3924 10 00 19", first 4 digits bold. Short fragments are not right-padded.
export function Code({ code, className }: { code: string; className?: string }) {
  const c = (code ?? "").replace(/\D/g, "");
  if (c.length === 0) return <span className={cn("font-mono text-muted-foreground", className)}>—</span>;
  if (c.length !== 10) {
    return (
      <span className={cn("font-mono tabular-nums tracking-tight", className)} title="Not a 10-digit UK code">
        {c}
      </span>
    );
  }
  return (
    <span className={cn("font-mono tabular-nums tracking-tight", className)}>
      <b className="font-semibold">{c.slice(0, 4)}</b>
      <span className="text-muted-foreground"> {c.slice(4, 6)} {c.slice(6, 8)} {c.slice(8, 10)}</span>
    </span>
  );
}
