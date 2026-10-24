import { cn } from "@/lib/utils";
import { Info, INFO } from "@/components/info";
import { Mark } from "@/components/mark";

// Shared page parts, so every screen has the same rhythm: a serif headline, then soft cards on paper.

export function PageHeader({
  title,
  description,
  info,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  info?: keyof typeof INFO;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 pb-8">
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="desk-display flex items-center gap-2 overflow-visible">
          {title} {info && <Info id={info} className="mt-2" />}
        </h1>
        {description && <p className="max-w-2xl text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-border/70 bg-card shadow-card", className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3 px-6 pb-3 pt-5">
          <div>
            {title && <h2 className="desk-kicker text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

// A headline number: label in muted ink, value large in the serif, context below. Never coloured by value;
// a status, when there is one, shows as a dot and a word.
export function Stat({
  label,
  value,
  context,
  status,
  className,
}: {
  label: string;
  value: React.ReactNode;
  context?: React.ReactNode;
  status?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 rounded-xl border border-border/70 bg-card px-6 py-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {status}
      </div>
      <p className="font-serif text-[44px] leading-none tabular-nums">{value}</p>
      {context && <p className="text-sm text-muted-foreground">{context}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      {Icon ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </span>
      ) : (
        <Mark size={40} className="text-primary" />
      )}
      <p className="font-serif text-2xl">{title}</p>
      {children && <div className="max-w-md text-[15px] text-muted-foreground">{children}</div>}
    </div>
  );
}

// A small status word with its dot, e.g. <Status tone="good">Signed in</Status>.
export function Status({ tone, children }: { tone: "good" | "warn" | "bad" | "idle"; children: React.ReactNode }) {
  const dot = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", idle: "bg-muted-foreground/40" }[tone];
  // The word stays in ink for contrast; the dot carries the colour.
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", tone === "idle" ? "text-muted-foreground" : "text-foreground")}>
      <span className={cn("size-2 rounded-full", dot)} />
      {children}
    </span>
  );
}
