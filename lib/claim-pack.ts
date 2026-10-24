// Turns retro-scan findings into what a broker files by hand. There is no HMRC API for repayment
// claims: overpayments go through the CDS online repayment service (or form C285), underpayments
// are disclosed by amending the declaration after clearance (form C2001), which leads to a C18 demand.

export const LINKS = {
  claimGuidance: "https://www.gov.uk/guidance/how-to-claim-a-repayment-of-import-duty-and-vat-if-youve-overpaid",
  claimService: "https://www.tax.service.gov.uk/claim-back-import-duty-vat",
  c285: "https://www.gov.uk/guidance/how-to-apply-for-a-repayment-of-import-duty-and-vat-if-youve-overpaid-c285",
  timeLimit: "https://www.legislation.gov.uk/uksi/2018/1248/regulation/59",
  minimum: "https://www.gov.uk/guidance/refunds-and-waivers-on-customs-debt",
  amend: "https://www.gov.uk/guidance/amend-or-cancel-a-customs-declaration-service-import-declaration",
};

// HMRC only repays claims over £9.
export const MIN_CLAIM = 9;

export type PackEntry = {
  entryDate: string;
  text: string;
  declaredCode: string;
  declaredRate: string | null;
  correctCode: string;
  correctRate: string | null;
  customsValue: number;
  dutyPaid: number;
  dutyDue: number | null;
  difference: number;
  basis: string;
};

export type PackRow = PackEntry & { deadline: string; daysLeft: number; belowMinimum: boolean };

// Reg 59(1)(a): within 3 years of notification of the debt. The entry date stands in for the
// notification date here; the broker confirms the date on the declaration before filing.
export function deadlineFor(entryDate: string, now = new Date()) {
  const d = new Date(`${entryDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 3);
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  return { deadline: d.toISOString().slice(0, 10), daysLeft };
}

export function buildPack(entries: PackEntry[], kind: "over" | "under", now = new Date()) {
  const rows: PackRow[] = entries
    .map((e) => ({ ...e, ...deadlineFor(e.entryDate, now), belowMinimum: kind === "over" && Math.abs(e.difference) <= MIN_CLAIM }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const total = rows.reduce((s, r) => s + Math.abs(r.difference), 0);
  const claimable = rows.filter((r) => !r.belowMinimum).reduce((s, r) => s + Math.abs(r.difference), 0);
  return { kind, rows, total, claimable, earliest: rows[0] ?? null };
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function packCsv(pack: ReturnType<typeof buildPack>) {
  const head = [
    "MRN (from the CDS declaration)",
    "Import date",
    "Goods",
    "Declared code",
    "Declared rate",
    "Correct code",
    "Correct rate",
    "Customs value (GBP)",
    "Duty paid (GBP)",
    "Duty due (GBP)",
    pack.kind === "over" ? "Overpaid (GBP)" : "Underpaid (GBP)",
    "Deadline (3 years)",
    "Days left",
    "Basis",
  ];
  const lines = pack.rows.map((r) =>
    [
      "",
      r.entryDate,
      r.text,
      r.declaredCode,
      r.declaredRate,
      r.correctCode,
      r.correctRate,
      r.customsValue.toFixed(2),
      r.dutyPaid.toFixed(2),
      r.dutyDue === null ? "" : r.dutyDue.toFixed(2),
      Math.abs(r.difference).toFixed(2),
      r.deadline,
      r.daysLeft,
      r.basis,
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.map(csvCell).join(","), ...lines].join("\n");
}
