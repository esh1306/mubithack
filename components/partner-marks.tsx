import { cn } from "@/lib/utils";

/** Simple Icons Shopify bag (CC0), brand green. */
export function ShopifyMark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        fill="#95BF47"
        d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z"
      />
    </svg>
  );
}

/** Official name only — no crown/crest. GOV.UK blue. */
export function HmrcMark({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  return (
    <span
      className={cn(
        "font-[800] leading-none tracking-[-0.05em] text-[#1D70B8]",
        stacked ? "inline-flex flex-col gap-0.5" : "inline-flex items-center",
        className,
      )}
      style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}
    >
      {stacked ? (
        <>
          <span>HM Revenue</span>
          <span>
            <span className="font-[800] text-[#1D70B8]/40">&amp;</span> Customs
          </span>
        </>
      ) : (
        <>
          HM Revenue
          <span className="mx-[0.25em] font-[800] text-[#1D70B8]/40">&amp;</span>
          Customs
        </>
      )}
    </span>
  );
}

/** Compact Mubit wordmark. No official SVG in-repo; type treatment only. */
export function MubitMark({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-[800] tracking-[-0.05em] text-[#111]", className)}
      style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif", fontSize: size }}
    >
      <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
        <rect width="20" height="20" rx="4" fill="#111" />
        <path d="M5 14.2V6.2h2.1l2.9 5.1 2.9-5.1H15v8H13V9.1l-2.4 4.2h-1.2L7 9.1v5.1H5z" fill="#fff" />
      </svg>
      Mubit
    </span>
  );
}

export function PartnerChip({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border-2 border-foreground/25 bg-card px-3 py-2">
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}
