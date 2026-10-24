"use client";

import { Info as InfoIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Short explanations behind the ⓘ buttons, kept in one place so the wording stays consistent.
export const INFO = {
  classify: {
    title: "Classify",
    body: "Each invoice line goes to an AI agent. It checks this broker's precedents, searches the UK Trade Tariff, reads the chapter notes and picks one 10-digit commodity code. Every call goes through Mubit.",
  },
  code: {
    title: "Commodity codes",
    body: "10 digits from the UK Trade Tariff. The first 4 (bold) are the heading, such as 3924 for plastic tableware. The first 8 go in declaration field DE 6/14 and the last 2 in DE 6/15.",
  },
  confidence: {
    title: "Confidence and review",
    body: "Lines under 80% confidence, or where the agent wants to ask the importer something, are flagged for review. You can approve any line as it is, or fix its code.",
  },
  fix: {
    title: "Fixing a code",
    body: "Pick the right code and say why. The fix is saved as a precedent for this broker only. The agent checks precedents first, so similar products come back right from then on.",
  },
  receipt: {
    title: "Receipts",
    body: "Every code shows how the agent got there: which precedents it found, which tariff codes it compared, the duty rate, and the Mubit request ID for each model call. That's the answer when HMRC asks why.",
  },
  mubit: {
    title: "Mubit",
    body: "Mubit sits between the app and the model. It records each broker's calls as a separate task and trains a small, cheap adapter on them. Each adapter is tested against the big model before it's used.",
  },
  learning: {
    title: "Learning",
    body: "After a fix, the app re-checks similar lines in the invoice, then runs products this broker has never classified. Struck-through codes are what the AI said before the fix.",
  },
  neverSeen: {
    title: "Never-seen products",
    body: "Products the broker never uploaded. If they change after one fix, the AI generalised from the reason. Items marked 'should stay the same' check that it didn't over-learn. The other broker's column shows fixes don't leak between brokers.",
  },
  brokers: {
    title: "Brokers",
    body: "Each broker has its own precedents, its own Mubit task and its own adapter. Switch here to see the same product from the other firm's point of view.",
  },
  precedents: {
    title: "Precedents",
    body: "Your team's corrections, with their reasons. The agent searches these before anything else. Deleting one stops it being followed.",
  },
  retroScan: {
    title: "Retro-scan",
    body: "Re-checks past entries with today's precedents. Overpaid duty can be reclaimed through CDS within 3 years. Underpaid duty, disclosed voluntarily (form C2001) before HMRC finds it, avoids the penalty. 'AI only' findings have no precedent behind them, so check them first.",
  },
  integrations: {
    title: "Integrations",
    body: "Precedent plugs into the systems a broker already uses: the live UK Trade Tariff for codes and duty, Shopify for client catalogues (codes are written back), Excel invoices, and HMRC's Customs Declarations API (sandbox) to file the declaration.",
  },
  shopify: {
    title: "Shopify",
    body: "Create a custom app in your Shopify admin (Settings → Apps → Develop apps) with read_products, read_inventory and write_inventory, then paste the shop domain and Admin API access token here. Products are imported as lines; approved codes are written back to each product (6-digit HS code + 10-digit GB code).",
  },
  hmrc: {
    title: "HMRC Customs Declarations (sandbox)",
    body: "Register an app on the HMRC Developer Hub (sandbox), subscribe it to Customs Declarations, add this redirect URI, and create a test user with the 'customs-services' service. Sign in with that test user, then submit a classified invoice as an H1 import declaration.",
  },
  export: {
    title: "Export",
    body: "A CSV that declaration software (ASM, CargoWise, Descartes) can import, so codes aren't retyped. Value, procedure codes and origin are still the declarant's job.",
  },
} as const;

export function Info({ id, className, side = "bottom" }: { id: keyof typeof INFO; className?: string; side?: "top" | "bottom" | "left" | "right" }) {
  const { title, body } = INFO[id];
  return (
    <Popover>
      <PopoverTrigger
        className={cn("inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground align-middle", className)}
        aria-label={`About ${title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <InfoIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side={side} className="w-80 text-sm" onClick={(e) => e.stopPropagation()}>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-muted-foreground leading-relaxed">{body}</p>
      </PopoverContent>
    </Popover>
  );
}
