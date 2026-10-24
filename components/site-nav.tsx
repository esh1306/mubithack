import Link from "next/link";
import { Wordmark } from "@/components/mark";
import { DEMO_SAMPLE_ID } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { ClickSpark } from "@/components/bits/click-spark";

export const DEMO_HREF = `/harbourline/classify?sample=${DEMO_SAMPLE_ID}&demo=1`;
export const DESK_HREF = "/harbourline/home";

export function SiteNav({ current, overlay }: { current?: "home" | "how"; overlay?: boolean }) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10",
        overlay && "bg-background/80 backdrop-blur-sm",
      )}
    >
      <Link href="/" className="w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Wordmark size={24} />
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link
          href="/#journey"
          className={current === "how" ? "font-extrabold text-foreground" : "font-medium text-foreground/70 hover:text-foreground"}
        >
          How it works
        </Link>
        <Link href={DESK_HREF} className="font-medium text-foreground/70 hover:text-foreground">
          Open the desk
        </Link>
        <ClickSpark>
          <Link
            href={DEMO_HREF}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 font-extrabold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90"
            style={{ fontFamily: "var(--font-display-face), var(--font-display), sans-serif" }}
          >
            Try the demo
          </Link>
        </ClickSpark>
      </nav>
    </header>
  );
}
