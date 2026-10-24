import { createAnthropic } from "@ai-sdk/anthropic";

// All model calls go through Mubit's Anthropic proxy (server-side only; Mubit has no CORS).
// Billing: Haiku 4.5 runs on Mubit's starter credit, as long as no Anthropic key is saved under Provider keys.
export const MODEL_ID = "claude-haiku-4-5"; // served by Mubit's starter credit

// Mubit auto-trains an adapter after this many kept examples (console is the source of truth).
export const TRAIN_AFTER = 25;

export const mubit = createAnthropic({
  baseURL: "https://api.mubit.ai/anthropic/v1",
  apiKey: process.env.MUBIT_API_KEY,
});

// Calls we don't want Mubit to train on (helpers, drafts) send this header.
export const NO_RECORD = { "x-middleware-record": "off" };

export function hasMubitKey() {
  return Boolean(process.env.MUBIT_API_KEY?.trim());
}

export function mubitRequestId(headers?: Headers | Record<string, string> | null) {
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get("x-middleware-request-id") ?? (headers as Headers).get("X-Middleware-Request-Id");
  }
  for (const [k, v] of Object.entries(headers as Record<string, string>)) {
    if (k.toLowerCase() === "x-middleware-request-id") return v;
  }
  return null;
}

export function classifyErrorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  const missingKey = /api key is missing/i.test(msg) || /ANTHROPIC_API_KEY/i.test(msg) || /anthropic api key/i.test(msg);
  if (!hasMubitKey() || missingKey) {
    return "Mubit API key is missing. Set MUBIT_API_KEY in .env.local (from app.mubit.ai).";
  }
  return msg;
}
