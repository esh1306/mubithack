// Shared demo-path helpers. Do not put these strings in the classify system prompt —
// that would start a new Mubit task.

export const DEMO_SAMPLE_ID = "01-ningbo-homeware";
export const DEMO_BAMBOO_CODE = "3924100019";
export const DEMO_BAMBOO_REASON =
  "This supplier's \"bamboo\" tableware is bamboo fibre bound with melamine resin, so it's kitchenware of plastics (ch. 39), not wood.";

export function isDemoBambooLine(text: string) {
  return /bamboo/i.test(text) && /(dinner|kids|feeding|cup|bowl|plate)/i.test(text);
}

export const demoSessionKey = (broker: string) => `precedent:demo:${broker}`;
export const railStorageKey = (broker: string) => `precedent:rail:${broker}`;
export const lessonStorageKey = (broker: string) => `precedent:lesson:${broker}`;

export function prettyRate(rate: string | null | undefined) {
  if (!rate) return "rate unknown";
  const n = Number.parseFloat(rate);
  return Number.isFinite(n) ? `${n}%` : rate;
}

export function clearDemoClientState(brokerIds: string[]) {
  for (const id of brokerIds) {
    try {
      localStorage.removeItem(railStorageKey(id));
      localStorage.removeItem(lessonStorageKey(id));
      sessionStorage.removeItem(demoSessionKey(id));
    } catch {
      // private mode / SSR
    }
  }
}
