"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  Home,
  Inbox,
  Building2,
  BookMarked,
  History,
  Plug,
  Check,
  RotateCcw,
  Search,
  Menu,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/mark";
import { CommandMenu, openCommandMenu } from "@/components/command-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { clearDemoClientState } from "@/lib/demo";
import { rememberFirm } from "@/components/firm-gate";
import { PrueGuide } from "@/components/prue-guide";
import { cn } from "@/lib/utils";

type Broker = { id: string; name: string };
type Counts = { review: number; reclaim: number | null };

// Everyday work first, then the firm's own setup. The tour lives in its own card at the foot.
export const NAV = [
  {
    group: null,
    items: [
      { href: "home", label: "Home", icon: Home },
      { href: "classify", label: "Invoices", icon: Inbox },
      { href: "clients", label: "Clients", icon: Building2 },
      { href: "retro-scan", label: "Duty reclaim", icon: History },
    ],
  },
  {
    group: "Your firm",
    items: [
      { href: "precedents", label: "Corrections", icon: BookMarked },
      { href: "integrations", label: "Connections", icon: Plug },
    ],
  },
];

// One grid for the whole rail: 12px outer padding, 12px inner padding, 36px rows, 24px between sections.
const ROW = "flex h-9 items-center gap-3 rounded-md px-3 text-[14.5px]";

const gbp0 = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

// Small live counts beside the nav: lines waiting for review, and duty found to reclaim.
function useCounts(broker: string, pathname: string) {
  const [c, setC] = useState<Counts | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/${broker}/home`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && setC({ review: d.totals.review, reclaim: d.money.scanned ? d.money.reclaim : null }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [broker, pathname]);
  return c;
}

function FirmSwitch({ current, brokers, section }: { current: Broker; brokers: Broker[]; section: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <DropdownMenu onOpenChange={(o) => !o && setConfirm(false)}>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-card px-3 py-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">{current.name[0]}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11.5px] leading-tight text-muted-foreground">Your firm</span>
          <span className="block text-[14px] font-medium leading-snug">{current.name}</span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[14.5rem]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Switch firm</DropdownMenuLabel>
        {brokers.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onSelect={() => {
              rememberFirm(b.id);
              router.push(`/${b.id}/${section}`);
            }}
          >
            <span className="flex size-5 items-center justify-center rounded bg-muted text-[10px] font-semibold">{b.name[0]}</span>
            <span className="flex-1 truncate">{b.name}</span>
            {b.id === current.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/start?switch=1")}>
          <Plus className="size-4" /> Set up a new firm
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(confirm && "bg-bad/10 text-bad focus:bg-bad/15 focus:text-bad")}
          onSelect={async (e) => {
            if (!confirm) {
              e.preventDefault();
              return setConfirm(true);
            }
            await fetch("/api/demo/reset", { method: "POST" });
            clearDemoClientState(brokers.map((b) => b.id));
            window.location.assign(`/${current.id}/home`);
          }}
        >
          <RotateCcw className="size-4" /> {confirm ? "Click again: clears all demo work" : "Reset demo data"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavBody({ current, brokers, section, onNavigate }: { current: Broker; brokers: Broker[]; section: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = useCounts(current.id, pathname);
  const badge = (href: string) => {
    if (!counts) return null;
    if (href === "classify" && counts.review > 0)
      return <span className="ml-auto rounded-full bg-warn/15 px-1.5 text-[11.5px] font-semibold tabular-nums text-warn">{counts.review}</span>;
    if (href === "retro-scan" && counts.reclaim)
      return <span className="ml-auto rounded-full bg-good/12 px-1.5 text-[11.5px] font-semibold tabular-nums text-good">{gbp0(counts.reclaim)}</span>;
    return null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <FirmSwitch current={current} brokers={brokers} section={section} />

      <nav className="flex flex-col gap-6" aria-label="Main">
        {NAV.map((g, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {g.group && <p className="px-3 pb-1.5 text-[12px] font-medium text-muted-foreground">{g.group}</p>}
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = section === href;
              return (
                <Link
                  key={href}
                  href={`/${current.id}/${href}`}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    ROW,
                    "text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    active && "bg-primary/[0.08] font-medium text-primary hover:bg-primary/[0.1] hover:text-primary",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  {label}
                  {badge(href)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {section !== "tour" && <PrueGuide broker={current.id} section={section} />}
    </div>
  );
}

export function Sidebar({ current, brokers }: { current: Broker; brokers: Broker[] }) {
  const pathname = usePathname();
  const raw = pathname.split("/")[2] ?? "home";
  const section = raw === "export" || raw === "mubit" ? "integrations" : raw;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-3 pt-5 md:flex">
        <Link href={`/${current.id}/home`} className="flex h-8 items-center px-3">
          <Wordmark size={22} />
        </Link>
        <NavBody current={current} brokers={brokers} section={section} />
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-background/90 px-4 backdrop-blur-md md:hidden">
        <Link href={`/${current.id}/home`}>
          <Wordmark size={22} />
        </Link>
        <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Search" onClick={openCommandMenu}>
          <Search />
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-6 bg-sidebar p-3 pt-5">
            <SheetHeader className="p-0 px-3">
              <SheetTitle className="text-left">
                <Wordmark size={22} />
              </SheetTitle>
              <SheetDescription className="sr-only">Navigation</SheetDescription>
            </SheetHeader>
            <NavBody current={current} brokers={brokers} section={section} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        </div>
      </div>

      <CommandMenu broker={current.id} brokers={brokers} />
    </>
  );
}
