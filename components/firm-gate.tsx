"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export const FIRM_KEY = "precedent:firm";

export function rememberFirm(id: string) {
  try {
    localStorage.setItem(FIRM_KEY, id);
  } catch {}
}

// A clean slate: no firm chosen, every Prue tip shown again.
export function forgetFirm() {
  try {
    localStorage.removeItem(FIRM_KEY);
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("prue:")) sessionStorage.removeItem(k);
  } catch {}
}

export function savedFirm() {
  try {
    return localStorage.getItem(FIRM_KEY);
  } catch {
    return null;
  }
}

// First visit to any desk page: ask which firm this is before showing anything else.
// Once chosen, refreshes stay put; the firm menu switches.
export function FirmGate({ broker }: { broker: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    let chosen: string | null = null;
    try {
      chosen = localStorage.getItem(FIRM_KEY);
    } catch {
      return; // storage blocked: don't trap the visitor
    }
    if (!chosen) router.replace(`/start?next=${encodeURIComponent(pathname.split("/")[2] ?? "home")}`);
    else if (chosen !== broker) rememberFirm(broker);
  }, [broker, pathname, router]);
  return null;
}
