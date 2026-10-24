import { cn } from "@/lib/utils";
import { Info, INFO } from "@/components/info";

// Shared page parts, so every screen has the same rhythm: a header bar, then panels.

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
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="flex items-center gap-1.5 text-xl font-semibold">
          {title} {info && <Info id={info} />}
        </h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
          {title && <h2 className="text-[13px] font-medium">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

// A headline number: label in muted ink, value in primary ink, context below. Never coloured by value;
// a status, when there is one, shows as an icon and a word.
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
    <div className={cn("space-y-1 rounded-lg border bg-card px-4 py-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {status}
      </div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {context && <p className="text-xs text-muted-foreground">{context}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      {Icon && (
        <span className="flex size-9 items-center justify-center rounded-md border bg-muted/40">
          <Icon className="size-4 text-muted-foreground" />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

// A small status word with its dot, e.g. <Status tone="good">Signed in</Status>.
export function Status({ tone, children }: { tone: "good" | "warn" | "bad" | "idle"; children: React.ReactNode }) {
  const dot = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", idle: "bg-muted-foreground/50" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}
