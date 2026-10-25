"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { openCommandMenu } from "@/components/command-menu";

const PAGE: Record<string, string> = {
  home: "Home",
  classify: "Invoices",
  clients: "Clients",
  "retro-scan": "Duty reclaim",
  precedents: "Corrections",
  integrations: "Connections",
  export: "Export",
  mubit: "Learning",
  tour: "Product tour",
};

// Where you are on the left, the one search on the right.
export function TopBar({ firm }: { firm: string }) {
  const section = usePathname().split("/")[2] ?? "home";
  return (
    <div className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-md md:flex lg:px-12">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[14px]">
        <span className="truncate text-muted-foreground">{firm}</span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span className="truncate font-medium">{PAGE[section] ?? ""}</span>
      </nav>
      <button
        type="button"
        onClick={openCommandMenu}
        className="ml-auto flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-border bg-card px-3 text-[14px] text-muted-foreground shadow-[0_1px_2px_rgba(14,26,47,0.04)] transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Search clients, invoices, codes</span>
        <Kbd>⌘K</Kbd>
      </button>
    </div>
  );
}
