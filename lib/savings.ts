// What Prue saves a firm, from its own lines. The assumptions live here, named, so Home can show them.

/** Minutes a broker spends finding a 10-digit code by hand: tariff search, chapter notes, a ruling check. */
export const MANUAL_MIN_PER_LINE = 6;
/** Minutes to read Prue's code and reasoning and sign it off. */
export const REVIEW_MIN_PER_LINE = 1;
/** Loaded cost of a broker's hour. */
export const BROKER_GBP_PER_HOUR = 45;
/** Lines a week the tour example assumes, for a desk with no invoices yet. */
export const TOUR_LINES_PER_WEEK = 200;

export const SAVINGS_ASSUMPTION = `Each line Prue codes saves about ${MANUAL_MIN_PER_LINE - REVIEW_MIN_PER_LINE} minutes: ${MANUAL_MIN_PER_LINE} minutes to code it by hand against ${REVIEW_MIN_PER_LINE} to review Prue's answer. Broker time at £${BROKER_GBP_PER_HOUR} an hour.`;

export function savings(linesCoded: number) {
  const hours = (linesCoded * (MANUAL_MIN_PER_LINE - REVIEW_MIN_PER_LINE)) / 60;
  return { hours: Math.round(hours * 10) / 10, gbp: Math.round(hours * BROKER_GBP_PER_HOUR) };
}
