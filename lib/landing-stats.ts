/** Unique 10-digit rows in data/tariff-seed.json (seed.mts de-dupes to the same count). */
export const SEEDED_UK_CODES = 970;

/** lib/variants.ts VARIANT_COUNT — copied so the landing never imports the AI module. */
export const VARIANT_COUNT = 20;

/** lib/mubit.ts TRAIN_AFTER */
export const TRAIN_AFTER = 25;

/** Retro-scan window in lib/duty.ts (3 * 365.25 days). */
export const LOOKBACK_YEARS = 3;

/**
 * Harbourline demo bamboo lines declared 4419190000 at 0%, signed code 3924100011 at 6%.
 * Sum of customs_value_gbp × 6% from data/harbourline-past-entries.csv. Label as demo.
 */
export const DEMO_DISCLOSE_GBP = 655;
