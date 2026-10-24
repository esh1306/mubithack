"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  Home,
  Inbox,
  Building2,
  BookMarked,
  Cpu,
  History,
  Plug,
  Download,
  Check,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Info } from "@/components/info";
import { Prue } from "@/components/prue";
import { CommandMenu, openCommandMenu } from "@/components/command-menu";
import { clearDemoClientState } from "@/lib/demo";
import { cn } from "@/lib/utils";

type Broker = { id: string; name: string };

export const NAV = [
  {
    group: "Workspace",
    items: [
      { href: "home", label: "Home", icon: Home },
      { href: "classify", label: "Inbox", icon: Inbox },
      { href: "clients", label: "Clients", icon: Building2 },
    ],
  },
  {
    group: "Learning",
    items: [
      { href: "precedents", label: "Precedents", icon: BookMarked },
      { href: "mubit", label: "Mubit", icon: Cpu },
    ],
  },
  { group: "Recover", items: [{ href: "retro-scan", label: "Retro-scan", icon: History }] },
  {
    group: "Connect",
    items: [
      { href: "integrations", label: "Integrations", icon: Plug },
      { href: "export", label: "Export", icon: Download },
    ],
  },
];

export function Sidebar({ current, brokers }: { current: Broker; brokers: Broker[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[2] ?? "home";
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3.5 py-6">
      <Link href={`/${current.id}/home`} className="flex items-end gap-2 px-2">
        <Prue size={30} mood="happy" />
        <span className="font-serif text-[28px] leading-none tracking-tight">Precedent</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-3 rounded-xl border border-sidebar-border bg-card px-3 py-2.5 text-left shadow-card outline-none hover:bg-card/80">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-serif text-lg text-primary-foreground">
            {current.name[0]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">Broker</span>
            <span className="block text-[15px] font-medium leading-snug">{current.name}</span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="flex items-center gap-1 text-xs text-muted-foreground">
            Brokers <Info id="brokers" side="right" />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {brokers.map((b) => (
            <DropdownMenuItem key={b.id} onSelect={() => router.push(`/${b.id}/${section}`)}>
              <span className="flex size-5 items-center justify-center rounded bg-muted text-[10px] font-semibold">{b.name[0]}</span>
              <span className="flex-1">{b.name}</span>
              {b.id === current.id && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={openCommandMenu}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav className="flex flex-col gap-5">
        {NAV.map((g) => (
          <div key={g.group} className="space-y-0.5">
            <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{g.group}</p>
            {g.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={`/${current.id}/${href}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-foreground",
                  section === href && "bg-card font-medium text-foreground shadow-card",
                )}
              >
                <Icon className={cn("size-[18px]", section === href ? "text-primary" : "text-muted-foreground")} />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-2 px-1">
        <button
          type="button"
          disabled={resetting}
          onBlur={() => setConfirmReset(false)}
          onClick={async () => {
            if (!confirmReset) return setConfirmReset(true);
            setResetting(true);
            await fetch("/api/demo/reset", { method: "POST" });
            clearDemoClientState(brokers.map((b) => b.id));
            // Back to Home with a clean seeded desk.
            window.location.assign(`/${current.id}/home`);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            confirmReset && "bg-bad/15 text-bad hover:bg-bad/20 hover:text-bad",
          )}
        >
          <RotateCcw className="size-3.5" />
          {resetting ? "Resetting…" : confirmReset ? "Click again to reset demo" : "Reset demo"}
        </button>
        <p className="px-3 font-serif text-[15px] italic text-muted-foreground">Teach it once. It remembers.</p>
      </div>

      <CommandMenu broker={current.id} brokers={brokers} />
    </aside>
  );
}
