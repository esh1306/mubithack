import { RotateCcw } from "lucide-react";
import { ConnectorLogo, type ConnectorId } from "@/components/connector-logos";
import { LOOKBACK_YEARS } from "@/lib/landing-stats";

// The end-to-end story: what comes in, what Precedent checks against, what goes out.
// Statuses mirror app/[broker]/integrations: CDS filing is HMRC's sandbox, declaration software takes a CSV today.
type Node = { id: ConnectorId | "reclaim"; name: string; benefit: string; tag?: string };

const SOURCES: Node[] = [
  { id: "shopify", name: "Shopify", benefit: "Client catalogues in, codes written back" },
  { id: "excel", name: "Excel invoices", benefit: "Any column layout. No retyping" },
  { id: "csv", name: "CSV", benefit: "Exports from any system" },
];

const CHECKS: Node[] = [
  { id: "tariff", name: "UK Trade Tariff", benefit: "Codes and duty from HMRC's live tariff", tag: "Live" },
  { id: "mubit", name: "Mubit memory", benefit: "Every correction your firm makes, remembered" },
];

const OUTPUTS: Node[] = [
  { id: "cds", name: "HMRC CDS", benefit: "Filed straight to CDS, with HMRC sign-in", tag: "Sandbox" },
  { id: "software", name: "Declaration software", benefit: "CSV for ASM, CargoWise and Descartes" },
  { id: "reclaim", name: `${LOOKBACK_YEARS}-year reclaim`, benefit: "Past entries re-checked for overpaid duty" },
];

function Logo({ id, size }: { id: Node["id"]; size: number }) {
  if (id !== "reclaim") return <ConnectorLogo id={id} size={size} />;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[22%] bg-[#fbe9e7] shadow-[inset_0_0_0_1px_rgba(14,26,47,0.08)]" style={{ width: size, height: size }}>
      <RotateCcw className="size-1/2 text-[#c2362b]" aria-hidden />
    </span>
  );
}

function NodeCard({ node }: { node: Node }) {
  return (
    <li className="e2e-node">
      <Logo id={node.id} size={44} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-ruling)] text-[18px] font-semibold leading-tight text-[#0b1f4d]">
          {node.name}
          {node.tag && <span className="e2e-tag">{node.tag}</span>}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-[#1e3a6e]">{node.benefit}</p>
      </div>
    </li>
  );
}

// Three wires fanning in (or out) between a column of three cards and the hub. Hidden on mobile.
function Wires({ out = false }: { out?: boolean }) {
  const ys = [50, 150, 250];
  return (
    <svg className="e2e-wires" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden>
      {ys.map((y) => {
        const d = out ? `M0 150 C 55 150, 45 ${y}, 100 ${y}` : `M0 ${y} C 55 ${y}, 45 150, 100 150`;
        return (
          <g key={y}>
            <path d={d} className="e2e-wire-base" vectorEffect="non-scaling-stroke" />
            <path d={d} className="e2e-wire-flow" vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

export function EndToEndFlow() {
  return (
    <section id="end-to-end" className="relative z-20 border-t border-[#0b1f4d]/10">
      <div className="mx-auto max-w-[86rem] px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
          <div className="max-w-2xl">
            <p className="landing-kicker text-[#c2362b]" data-reveal>
              End to end
            </p>
            <h2 className="landing-display landing-section-title mt-3 overflow-visible" data-reveal>
              Everything, end to end, <span className="landing-hero-accent">in one place.</span>
            </h2>
            <p className="mt-4 max-w-xl text-[17px] font-medium leading-relaxed text-[#1e3a6e]" data-reveal>
              Goods come in from your client&apos;s store or the supplier&apos;s invoice, Prue codes them against HMRC&apos;s live tariff, and the
              signed declaration goes out to HMRC. No retyping, no copy-paste between tools.
            </p>
          </div>
          <dl className="flex gap-10" data-reveal>
            <div>
              <dt className="sr-only">Desks</dt>
              <dd className="e2e-stat">1</dd>
              <dd className="mt-1 max-w-[9rem] text-[13px] font-medium leading-snug text-[#1e3a6e]">desk, invoice to declaration</dd>
            </div>
            <div>
              <dt className="sr-only">Tools</dt>
              <dd className="e2e-stat">0</dd>
              <dd className="mt-1 max-w-[9rem] text-[13px] font-medium leading-snug text-[#1e3a6e]">tools to switch between</dd>
            </div>
          </dl>
        </div>

        <div className="e2e-flow mt-14">
          <div data-reveal>
            <p className="e2e-col-title">Comes in from</p>
            <ul className="e2e-col">
              {SOURCES.map((n) => (
                <NodeCard key={n.id} node={n} />
              ))}
            </ul>
          </div>

          <Wires />
          <span className="e2e-wire-v" aria-hidden />

          <div className="e2e-hub" data-reveal>
            <p className="e2e-col-title text-[#b9c7ea]">Coded and checked in</p>
            <div className="e2e-hub-card">
              <p className="font-[family-name:var(--font-ruling)] text-[30px] font-bold leading-none tracking-[-0.015em] text-white">Precedent</p>
              <p className="mt-1.5 text-[13px] font-medium text-[#b9c7ea]">+ Prue codes every line; you sign</p>
              <ul className="mt-5 space-y-2.5">
                {CHECKS.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 rounded-lg bg-white/[0.07] p-3 ring-1 ring-white/10">
                    <Logo id={n.id} size={36} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-white">
                        {n.name}
                        {n.tag && <span className="e2e-tag e2e-tag-live">{n.tag}</span>}
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-[#c9d4ef]">{n.benefit}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Wires out />
          <span className="e2e-wire-v" aria-hidden />

          <div data-reveal>
            <p className="e2e-col-title">Goes out to</p>
            <ul className="e2e-col">
              {OUTPUTS.map((n) => (
                <NodeCard key={n.id} node={n} />
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 max-w-3xl text-[12px] leading-relaxed text-[#4a5872]" data-reveal>
          CDS filing runs against HMRC&apos;s sandbox in this demo, and nothing is filed without a person&apos;s sign-off. Declaration software
          imports Precedent&apos;s CSV today; live push is coming. Names are for orientation, not a partnership.
        </p>
      </div>
    </section>
  );
}
