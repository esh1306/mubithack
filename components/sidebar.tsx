"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronsUpDown, ScanLine, BookMarked, History, Download, Check, RotateCcw, Cpu, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Info } from "@/components/info";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Broker = { id: string; name: string };

const NAV = [
  { href: "classify", label: "Classify", icon: ScanLine },
  { href: "precedents", label: "Precedents", icon: BookMarked },
  { href: "retro-scan", label: "Retro-scan", icon: History },
  { href: "export", label: "Export", icon: Download },
  { href: "integrations", label: "Integrations", icon: Plug },
  { href: "mubit", label: "Mubit", icon: Cpu },
];

export function Sidebar({ current, brokers }: { current: Broker; brokers: Broker[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[2] ?? "classify";
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  return (
    <aside className="w-60 shrink-0 border-r bg-muted/30 px-3 py-4 flex flex-col gap-6">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted outline-none">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
            {current.name[0]}
          </span>
          <span className="flex-1 truncate text-sm font-medium">{current.name}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Brokers · each has its own precedents and Mubit task</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {brokers.map((b) => (
            <DropdownMenuItem key={b.id} onSelect={() => router.push(`/${b.id}/${section}`)}>
              <span className="flex-1">{b.name}</span>
              {b.id === current.id && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex flex-col gap-0.5">
        <p className="flex items-center gap-1 px-2 pb-1 text-xs text-muted-foreground">
          Workspace <Info id="brokers" side="right" />
        </p>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={`/${current.id}/${href}`}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              section === href && "bg-muted text-foreground font-medium",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-3 px-2">
        <Button
          size="sm"
          variant={confirmReset ? "destructive" : "ghost"}
          className="w-full justify-start text-muted-foreground"
          disabled={resetting}
          onBlur={() => setConfirmReset(false)}
          onClick={async () => {
            if (!confirmReset) return setConfirmReset(true);
            setResetting(true);
            await fetch("/api/demo/reset", { method: "POST" });
            try {
              brokers.forEach((b) => localStorage.removeItem(`precedent:rail:${b.id}`));
            } catch {}
            setResetting(false);
            setConfirmReset(false);
            // Full reload so every page drops its in-memory state.
            window.location.reload();
          }}
        >
          <RotateCcw /> {resetting ? "Resetting…" : confirmReset ? "Click again to reset" : "Reset demo"}
        </Button>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Precedent</span> · learns from your fixes
        </p>
      </div>
    </aside>
  );
}
