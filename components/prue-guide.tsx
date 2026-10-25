"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Prue, type PrueState } from "@/components/prue";
import { PrueChat, type ChatMsg } from "@/components/prue-chat";
import { prueFor } from "@/lib/prue-tips";
import { cn } from "@/lib/utils";

// The sidebar and corner Prue. Pages that place her themselves (see lib/prue-tips) render their own,
// so there is never more than one on screen. Drag her anywhere; click her to open "Ask Prue".
type Override = { state?: PrueState; text: string } | null;
let override: Override = null;
const listeners = new Set<() => void>();
const set = (o: Override) => {
  override = o;
  listeners.forEach((l) => l());
};

export function usePrueSays(text: string, state?: PrueState) {
  useEffect(() => {
    set({ text, state });
    return () => set(null);
  }, [text, state]);
}

function useOverride() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => override,
    () => null,
  );
}

type Pos = { x: number; y: number };
const POS_KEY = "prue:pos";
const W = 104, H = 152; // Prue at size 104 (240:350 artboard)
const clamp = (p: Pos): Pos => ({
  x: Math.max(4, Math.min(window.innerWidth - W - 4, p.x)),
  y: Math.max(4, Math.min(window.innerHeight - H - 4, p.y)),
});

export function PrueGuide({ broker, section: page }: { broker: string; section: string }) {
  const q = useSearchParams();
  const section = page !== "classify" ? page : q.get("new") === "1" ? "classify:new" : q.get("batch") || q.get("sample") ? "classify:invoice" : "classify";
  const said = useOverride();
  const [closed, setClosed] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  // Top-left of Prue in px once she has been dragged; null = her default spot for this page.
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const last = useRef<Pos | null>(null);
  const conf = prueFor(section);
  const state = loading ? "thinking" : (said?.state ?? conf.pose);
  const text = said?.text ?? conf.say;
  const cta = section === "home" ? { label: "Show me one shipment", href: `/${broker}/tour` } : { label: "Take the product tour", href: `/${broker}/tour` };
  const open = closed !== section;

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- per-viewer "hide on this page" preference
      setClosed(sessionStorage.getItem(`prue:closed:${section}`) ? section : null);
    } catch {}
  }, [section]);

  // Restore where she was dropped (this tab only), and keep her on screen when the window resizes.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(POS_KEY) ?? "null") as Pos | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- per-viewer position, client only
      if (saved) setPos(clamp(saved));
    } catch {}
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggle = () => {
    const next = open ? section : null;
    setClosed(next);
    try {
      if (next) sessionStorage.setItem(`prue:closed:${section}`, "1");
      else sessionStorage.removeItem(`prue:closed:${section}`);
    } catch {}
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    // A few pixels of wobble is still a click.
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
    if (!d.moved) setDragging(true);
    d.moved = true;
    last.current = clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy });
    setPos(last.current);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    justDragged.current = true; // swallow the click that follows the drop
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify(last.current));
    } catch {}
  };
  const onClick = () => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    toggle();
  };

  if (conf.place !== "sidebar" && conf.place !== "corner") return null;
  const corner = conf.place === "corner";

  // Which way the chat and the "Ask Prue" pill open: towards the roomier side of the screen.
  const right = pos ? pos.x + W / 2 > window.innerWidth / 2 : corner;
  const below = pos ? pos.y + H / 2 < window.innerHeight / 2 : false;
  const room = pos ? (below ? window.innerHeight - pos.y - H : pos.y) - 12 : 480;

  return (
    // Default spot: sidebar = inside the rail's foot; corner = bottom-right, clear of the navigation.
    // Once dragged she sits wherever she was dropped.
    <div
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={cn("fixed z-40 hidden md:block", !pos && (corner ? "bottom-3 right-4" : "bottom-3 left-3"))}
    >
      {open && (
        <PrueChat
          broker={broker}
          section={section}
          greeting={text}
          cta={cta}
          messages={messages}
          setMessages={setMessages}
          loading={loading}
          setLoading={setLoading}
          onClose={toggle}
          style={{ maxHeight: Math.max(220, Math.min(460, room)) }}
          className={cn("absolute", right ? "right-0" : "left-0", below ? "top-full mt-1" : "bottom-full mb-1")}
        />
      )}
      <button
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "block touch-none select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging ? "cursor-grabbing" : "cursor-grab transition-transform hover:-translate-y-0.5",
        )}
        aria-label={open ? "Close Ask Prue" : "Ask Prue (drag to move)"}
      >
        <Prue state={state} size={104} />
      </button>
      {!open && !dragging && (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "absolute bottom-4 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] text-muted-foreground shadow-sm hover:text-foreground",
            right ? "right-full mr-2" : "left-full ml-2",
          )}
        >
          Ask Prue
        </button>
      )}
    </div>
  );
}
