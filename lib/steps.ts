// One classification step as the broker sees it, built from a stored tool call.
// Shared by the live process log (streamed) and the receipt (stored), so both read the same.

export type ToolCall = { tool: string; input: unknown; output: unknown; ms?: number };

export type Step = {
  kind: "precedent" | "search" | "notes" | "verify" | "ask" | "fallback" | "other";
  title: string;
  detail?: string;
  items?: { label: string; note?: string; href?: string }[];
  source?: { label: string; href?: string };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const TARIFF = "https://www.trade-tariff.service.gov.uk";

export function pretty(code: string) {
  const c = (code ?? "").replace(/\D/g, "");
  if (c.length !== 10) return code;
  return `${c.slice(0, 4)} ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8)}`;
}

export function describeStep(call: ToolCall): Step {
  const out = (call.output ?? {}) as Any;
  const input = (call.input ?? {}) as Any;

  switch (call.tool) {
    case "search_precedents": {
      const rows = (out.precedents ?? []) as Any[];
      return {
        kind: "precedent",
        title: rows.length ? `Found ${rows.length} of your past decision${rows.length === 1 ? "" : "s"}` : "No past decisions match",
        detail: rows.length ? "Your team's signed-off corrections are checked first and followed where they apply." : undefined,
        items: rows.slice(0, 3).map((p) => ({ label: `${pretty(p.correctCode)} · ${p.lineText}`, note: p.reason })),
        source: { label: "Your precedents" },
      };
    }
    case "hmrc_classification_search": {
      const c = (out.candidates ?? []) as Any[];
      const heads = (out.headings ?? []) as Any[];
      return {
        kind: "search",
        title: c.length ? `HMRC tariff search returned ${c.length} candidate codes in ${heads.length} headings` : "HMRC tariff search found nothing",
        detail: input.query ? `Searched for “${input.query}”` : undefined,
        items: c.slice(0, 5).map((x) => ({ label: `${pretty(x.code)} · ${x.description}`, href: `${TARIFF}/commodities/${x.code}` })),
        source: { label: "UK Trade Tariff · classification search", href: TARIFF },
      };
    }
    case "read_chapter_notes": {
      const n = (out.notes ?? []) as Any[];
      return {
        kind: "notes",
        title: `Read Chapter ${Number(out.chapter ?? input.chapter)} legal notes${out.title ? ` · ${out.title}` : ""}`,
        detail: n.length ? `${n.length} note${n.length === 1 ? "" : "s"} checked for exclusions and definitions.` : "No notes returned.",
        items: n.slice(0, 3).map((x) => ({ label: x.ref, note: x.text })),
        source: { label: "UK Trade Tariff · chapter notes", href: out.url },
      };
    }
    case "lookup_commodity": {
      if (!out.code) return { kind: "verify", title: `Code ${pretty(input.code)} not found in the tariff` };
      return {
        kind: "verify",
        title: `Checked ${pretty(out.code)}${out.declarable ? " · declarable" : " · not declarable"}`,
        detail: [out.duty && `Duty ${out.duty}`, out.vat && `VAT ${out.vat}`, ...(out.flags ?? [])].filter(Boolean).join(" · "),
        items: (out.path ?? []).length ? [{ label: (out.path as string[]).join(" › ") }] : undefined,
        source: { label: "UK Trade Tariff · commodity", href: out.url },
      };
    }
    case "ask_client":
      return { kind: "ask", title: "Needs a fact from the importer", detail: input.question };
    case "decision": {
      const rej = (out.rejected ?? []) as Any[];
      return {
        kind: "verify",
        title: out.rule ? `Decided by ${out.rule}` : "Decided",
        detail: (out.notesCited ?? []).length ? `Relied on ${(out.notesCited as string[]).join(", ")}` : undefined,
        items: rej.slice(0, 4).map((r) => ({ label: `Ruled out ${pretty(r.code)}`, note: r.why })),
      };
    }
    case "fallback":
      return { kind: "fallback", title: out.title ?? "Picked without the AI", detail: out.detail };
    default:
      return { kind: "other", title: call.tool.replace(/_/g, " ") };
  }
}

export function parseCalls(json: string | null | undefined): ToolCall[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
