"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowRightLeft } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV } from "@/components/sidebar";

const EVENT = "precedent:command-menu";

export function openCommandMenu() {
  window.dispatchEvent(new Event(EVENT));
}

type Sample = { id: string; name: string; supplier: string };

// ⌘K: jump to a page, load a sample invoice, or switch broker.
export function CommandMenu({ broker, brokers }: { broker: string; brokers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open && samples.length === 0) fetch("/api/sample").then((r) => r.json()).then(setSamples);
  }, [open, samples.length]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Jump to" description="Pages, sample invoices and brokers">
      <CommandInput placeholder="Type a page, a sample invoice or a broker…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Go to">
          {NAV.flatMap((g) => g.items).map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={`go ${label}`} onSelect={() => go(`/${broker}/${href}`)}>
              <Icon /> {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Classify a sample invoice">
          {samples.map((s) => (
            <CommandItem key={s.id} value={`sample ${s.name} ${s.supplier}`} onSelect={() => go(`/${broker}/classify?sample=${s.id}`)}>
              <FileText /> {s.name} <span className="ml-auto text-xs text-muted-foreground">{s.supplier}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Switch broker">
          {brokers
            .filter((b) => b.id !== broker)
            .map((b) => (
              <CommandItem key={b.id} value={`broker ${b.name}`} onSelect={() => go(`/${b.id}/home`)}>
                <ArrowRightLeft /> {b.name}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
