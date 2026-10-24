export type DutyDirection = "over" | "under" | "same" | "check";

export type DutyMaths = {
  entryDate: string;
  inThreeYearWindow: boolean;
  customsValue: number;
  dutyPaid: number;
  declaredCode: string;
  declaredRate: string | null;
  suggestedCode: string;
  suggestedRate: string | null;
  shouldPay: number | null;
  delta: number;
  direction: DutyDirection;
  rateAsOf: string;
  rateSource: "import-date" | "current";
  assumption: string | null;
};

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const THREE_YEARS_MS = 3 * YEAR_MS;
const MATERIAL = 0.5;

export function parseEntryDate(raw: string) {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function withinThreeYears(entryDate: string, now = new Date()) {
  const d = parseEntryDate(entryDate);
  if (!d) return false;
  return now.getTime() - d.getTime() <= THREE_YEARS_MS && d.getTime() <= now.getTime() + 24 * 60 * 60 * 1000;
}

// "6.00%" → 0.06. Specific / composite duties cannot be compared on value alone.
export function adValorem(rate: string | null | undefined) {
  const m = rate?.trim().match(/^([\d.]+)\s*%$/);
  return m ? Number(m[1]) / 100 : null;
}

export function money2(n: number) {
  return Math.round(n * 100) / 100;
}

export function compareDuty(input: {
  entryDate: string;
  customsValue: number;
  dutyPaid: number;
  declaredCode: string;
  declaredRate: string | null;
  suggestedCode: string;
  suggestedRate: string | null;
  rateAsOf: string;
  rateSource: "import-date" | "current";
}): DutyMaths {
  const suggestedFrac = adValorem(input.suggestedRate);
  const sameCode = input.suggestedCode === input.declaredCode;
  const shouldPay = suggestedFrac === null ? null : money2(input.customsValue * suggestedFrac);
  const delta = sameCode || shouldPay === null ? 0 : money2(shouldPay - input.dutyPaid);
  const direction: DutyDirection = sameCode
    ? "same"
    : shouldPay === null
      ? "check"
      : delta > MATERIAL
        ? "under"
        : delta < -MATERIAL
          ? "over"
          : "same";
  const assumption =
    input.rateSource === "current"
      ? "Used today's third-country (ERGA OMNES) rate; the rate in force on the import date was not available."
      : null;
  return {
    entryDate: input.entryDate,
    inThreeYearWindow: withinThreeYears(input.entryDate),
    customsValue: input.customsValue,
    dutyPaid: input.dutyPaid,
    declaredCode: input.declaredCode,
    declaredRate: input.declaredRate,
    suggestedCode: input.suggestedCode,
    suggestedRate: input.suggestedRate,
    shouldPay,
    delta,
    direction,
    rateAsOf: input.rateAsOf,
    rateSource: input.rateSource,
    assumption,
  };
}

export function isMoneyFinding(m: DutyMaths) {
  return (m.direction === "over" || m.direction === "under") && Math.abs(m.delta) > MATERIAL;
}

export function formatDutyTrail(m: DutyMaths) {
  const paid = `£${m.dutyPaid.toFixed(2)}`;
  const value = `£${m.customsValue.toFixed(2)}`;
  const should = m.shouldPay == null ? "n/a (not a simple % rate)" : `£${m.shouldPay.toFixed(2)}`;
  const rateWhen =
    m.rateSource === "import-date" ? `rate in force on ${m.rateAsOf}` : `today's rate (import-date rate unavailable)`;
  const parts = [
    `Import date ${m.entryDate}`,
    `declared ${m.declaredCode} at ${m.declaredRate ?? "unknown"} → duty paid ${paid} on ${value}`,
    `suggested ${m.suggestedCode} at ${m.suggestedRate ?? "unknown"} (${rateWhen}) → should pay ${should}`,
    `difference £${m.delta.toFixed(2)} (${m.direction === "over" ? "reclaim" : m.direction === "under" ? "disclose" : m.direction})`,
  ];
  if (m.assumption) parts.push(m.assumption);
  return parts.join(". ") + ".";
}
