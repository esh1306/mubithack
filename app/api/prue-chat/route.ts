import { generateText, isStepCount } from "ai";
import { readTools } from "@/lib/agent";
import { db } from "@/lib/db";
import { hasMubitKey, mubit, MODEL_ID, NO_RECORD } from "@/lib/mubit";

// POST { broker, section, messages: [{ role, text }] } → { reply, used }. Prue's chat, with the same
// read-only tools as classify (scoped to this broker). No-record, so it stays out of the classify-task training set.
type Msg = { role: "user" | "assistant"; text: string };

const SYSTEM =
  "You are Prue, the friendly guide inside Precedent, a UK customs commodity-code classification desk for customs brokers. " +
  "You help with: finding UK commodity codes (10-digit, UK Global Tariff, GIRs, section and chapter notes), " +
  "using the app (Classify invoices line by line with a receipt of HMRC sources; Precedents, where a broker's corrections are reused on similar products; " +
  "Retro-scan, which re-checks 3 years of imports at the rate on each import date for overpaid duty; Mubit learning, where every check trains the firm's own model; " +
  "Integrations: Shopify, Excel, HMRC, and export to declaration software), and general HMRC tariff questions. " +
  "For any commodity code, duty or tariff question, use your tools first: search_precedents (this firm's past decisions), " +
  "hmrc_classification_search, read_chapter_notes and lookup_commodity, and base the answer on what they return, naming the code and its source. " +
  "Keep answers brief: 1-4 short sentences or a few bullets, plain text, no markdown (no headings, no bold). " +
  "Never present duty rates or codes as certain: say they depend on the full product facts, origin and import date, and that a classification line in the app gives a full receipt. " +
  "If asked something unrelated, steer back politely.";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { broker?: string; section?: string; messages?: Msg[] } | null;
  const messages = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.text.slice(0, 2000) }));
  // The model wants a user turn first; drop the greeting if it leads.
  while (messages[0]?.role === "assistant") messages.shift();
  if (!messages.length) return Response.json({ error: "Ask me something first." }, { status: 400 });
  if (!hasMubitKey()) return Response.json({ error: "I can't reach my brain right now: MUBIT_API_KEY isn't set." }, { status: 503 });

  try {
    const broker = body?.broker ? await db.broker.findUnique({ where: { id: body.broker } }) : null;
    const asked = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const res = await generateText({
      model: mubit(MODEL_ID),
      system: `${SYSTEM}\nBroker firm: ${broker?.name ?? "unknown"}. The broker is on the "${body?.section || "home"}" screen.`,
      messages,
      tools: readTools(broker?.id ?? "", asked),
      stopWhen: isStepCount(5),
      // Last step: ask for the answer so she never runs out of steps mid-lookup.
      prepareStep: ({ stepNumber, messages }) =>
        stepNumber === 4 ? { messages: [...messages, { role: "user", content: "That was your last tool call. Answer now." }] } : undefined,
      maxOutputTokens: 500,
      headers: NO_RECORD,
      timeout: 45000,
    });
    // What she looked at, for the small "Looked up 8539520000" lines in the chat.
    const used = res.steps.flatMap((s) => s.toolCalls.map((c) => toolLabel(c.toolName, c.input as Record<string, string>)));
    return Response.json({ reply: res.text.trim() || "Hmm, I lost my words there. Try asking again?", used });
  } catch {
    return Response.json({ error: "Sorry, I couldn't reach Mubit just now. Try again in a moment." }, { status: 502 });
  }
}

function toolLabel(name: string, input: Record<string, string>) {
  if (name === "search_precedents") return `Searched precedents for "${input.query}"`;
  if (name === "hmrc_classification_search") return `Searched HMRC for "${input.query}"`;
  if (name === "read_chapter_notes") return `Read chapter ${input.chapter} notes`;
  if (name === "lookup_commodity") return `Looked up ${input.code}`;
  return name;
}
