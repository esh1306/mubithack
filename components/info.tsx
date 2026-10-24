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
    body: "Every code shows when it was decided, the precedent (if any), which tariff codes the agent compared, the duty rate, and the Mubit request ID for each model call.",
  },
  mubit: {
    title: "Mubit",
    body: "Mubit sits between the app and the model. Each broker's classify calls share one task (same instructions, tools and output). Mubit can train an adapter after about 25 kept examples; this app counts what it sent and cannot see whether an adapter is trained, tested or live.",
  },
  learning: {
    title: "Learning",
    body: "After a fix you see before and after on the same screen, then products this broker has never classified. Paraphrases go through Mubit with request IDs. Struck-through codes are what the AI said before the fix.",
  },
  neverSeen: {
    title: "Never-seen products",
    body: "Products the broker never uploaded. If they change after one fix, the AI generalised from the reason. Items marked 'should stay the same' check that it didn't over-learn. The other broker's column shows fixes don't leak between brokers.",
  },
  brokers: {
    title: "Brokers",
    body: "Each broker has its own precedents and its own Mubit task. Switch here to see the same product from the other firm's point of view.",
  },
  precedents: {
    title: "Precedents",
    body: "Your team's corrections, with their reasons. The agent searches these before anything else. Deleting one stops it being followed.",
  },
  retroScan: {
    title: "Retro-scan",
    body: "Re-checks entries from the last 3 years with today's precedents. Overpaid duty (old rate higher) is a reclaim; underpaid duty (e.g. 0% to 6%) is a disclosure. Figures use the third-country rate in force on the import date when the tariff API has it, otherwise today's rate is labelled. £0 rows are not treated as findings.",
  },
  integrations: {
    title: "Integrations",
    body: "Precedent plugs into the systems a broker already uses: the live UK Trade Tariff for codes and duty, Shopify for client catalogues (codes are written back), Excel invoices, and HMRC's Customs Declarations API (sandbox) to file the declaration.",
  },
  clients: {
    title: "Clients",
    body: "The importers this broker declares for. Each client's EORI goes on its declarations as the importer, and each can connect its own Shopify store: the whole catalogue is classified once, and approved codes are written back so every parcel the client ships carries them. From 2028 every low-value parcel into the UK needs a full code.",
  },
  shopify: {
    title: "Shopify",
    body: "Create a custom app in your Shopify admin (Settings → Apps → Develop apps) with read_products, read_inventory and write_inventory, then paste the shop domain and Admin API access token here. Products are imported as lines; approved codes are written back to each product (6-digit HS code + 10-digit GB code).",
  },
  hmrc: {
    title: "HMRC Customs Declarations (sandbox)",
    body: "Click Sign in with HMRC and log in as the importer (in the sandbox, a test company: create one with the button). The app keeps that sign-in for every broker and refreshes it, then files a classified invoice as an H1 import declaration.",
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
