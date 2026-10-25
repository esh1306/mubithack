"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export type DemoStep = "classify" | "fix" | "learn" | "receipt" | "retro";

const COPY: Record<DemoStep, { title: string; body: string; next?: string }> = {
  classify: {
    title: "Step 1 · Classify",
    body: "The Ningbo invoice is being coded. Watch the rows land — nothing is frozen. The bamboo dinner set is the one to fix.",
  },
  fix: {
    title: "Step 2 · Fix the bamboo line",
    body: "It came back as wood (4419, 0%). Open it, pick 3924 10 00 11 (melamine kitchenware from China, 6%), keep the house reason, and save.",
  },
  learn: {
    title: "Step 3 · It remembers",
    body: "Cups the broker has never classified flip to 3924 because of the precedent. Paraphrases go through Mubit on this broker’s task.",
  },
  receipt: {
    title: "Step 4 · Open a receipt",
    body: "Click the fixed line. You’ll see the time, the precedent in their own words, and the Mubit request IDs.",
  },
  retro: {
    title: "Step 5 · Look back three years",
    body: "The same fix on past bamboo entries is disclose (0% → 6%), not reclaim. £0 rows are not findings.",
    next: "Open retro-scan",
  },
};

export function DemoCoach({
  step,
  broker,
  onSkip,
}: {
  step: DemoStep;
  broker: string;
  onSkip: () => void;
}) {
  const c = COPY[step];
  const pathname = usePathname();
  const onRetro = pathname?.includes("/retro-scan");
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-[inset_3px_0_0_var(--brand)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[13px] font-medium text-primary">{c.title}</p>
          <p className="text-[15px] leading-relaxed">{c.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {step === "retro" && !onRetro && (
            <Button size="sm" asChild>
              <Link href={`/${broker}/retro-scan`}>{c.next}</Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onSkip}>
            Exit guide
          </Button>
        </div>
      </div>
    </div>
  );
}
