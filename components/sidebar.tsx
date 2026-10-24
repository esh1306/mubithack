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
import { CommandMenu, openCommandMenu } from "@/components/command-menu";
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
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-5 border-r bg-sidebar px-2.5 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none hover:bg-sidebar-accent">
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-[11px] font-semibold text-primary-foreground">
            {current.name[0]}
          </span>
          <span className="flex-1 truncate text-[13px] font-medium">{current.name}</span>
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
        className="flex items-center gap-2 rounded-md border bg-background/40 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav className="flex flex-col gap-4">
        {NAV.map((g) => (
          <div key={g.group} className="space-y-0.5">
            <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground/70">{g.group}</p>
            {g.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={`/${current.id}/${href}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                  section === href && "bg-sidebar-accent font-medium text-foreground",
                )}
              >
                <Icon className="size-4" />
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
            try {
              brokers.forEach((b) => localStorage.removeItem(`precedent:rail:${b.id}`));
            } catch {}
            // Full reload so every page drops its in-memory state.
            window.location.reload();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            confirmReset && "bg-bad/15 text-bad hover:bg-bad/20 hover:text-bad",
          )}
        >
          <RotateCcw className="size-3.5" />
          {resetting ? "Resetting…" : confirmReset ? "Click again to reset demo" : "Reset demo"}
        </button>
        <p className="px-1.5 text-[11px] text-muted-foreground/70">
          <span className="font-semibold text-muted-foreground">Precedent</span> · teach it once
        </p>
      </div>

      <CommandMenu broker={current.id} brokers={brokers} />
    </aside>
  );
}
