import { createAnthropic } from "@ai-sdk/anthropic";

// All model calls go through Mubit's Anthropic proxy (server-side only; Mubit has no CORS).
// Billing: Haiku 4.5 runs on Mubit's starter credit, as long as no Anthropic key is saved under Provider keys.
export const MODEL_ID = "claude-haiku-4-5"; // served by Mubit's starter credit

export const mubit = createAnthropic({
  baseURL: "https://api.mubit.ai/anthropic/v1",
  apiKey: process.env.MUBIT_API_KEY,
});

// Calls we don't want Mubit to train on (helpers, drafts) send this header.
export const NO_RECORD = { "x-middleware-record": "off" };

export function mubitRequestId(headers?: Record<string, string>) {
  return headers?.["x-middleware-request-id"] ?? null;
}
