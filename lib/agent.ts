import { generateText, Output, tool, isStepCount } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { mubit, MODEL_ID, mubitRequestId } from "@/lib/mubit";
import { searchTariff, getCommodity } from "@/lib/tariff";

// Mubit groups calls into one task by system prompt + model + tools + output format.
// Keep this text and the tool definitions fixed: only the broker's name varies, which
// makes each broker its own Mubit task (and so its own adapter).
export function systemPrompt(brokerName: string) {
  return `You are the commodity-code classifier for ${brokerName}, a UK customs broker.

For each product line, choose the one 10-digit UK Trade Tariff commodity code to declare.

How to work:
1. Call search_precedents first. ${brokerName}'s precedents are corrections its own classification staff made. When one applies to this line, follow it over your own judgement, and say which one you used.
2. Use search_tariff to find candidate codes, by words or by heading number.
3. Use get_commodity to check a code is declarable and read its chapter notes before you choose it.
4. If the deciding fact (such as material, knitted or woven, or use) is missing from the line and no precedent settles it, call ask_client with the one question that would decide it, then give your best guess.

Reply with the code, a one-sentence reason a broker can check, your confidence from 0 to 1, and the id of the precedent you followed, if any.`;
}

export const resultSchema = z.object({
  code: z.string().describe("10-digit commodity code"),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  precedentId: z.number().nullable(),
});

const MAX_STEPS = 10;

export type ToolCallLog = { tool: string; input: unknown; output: unknown };

export async function classifyLine(brokerId: string, lineText: string) {
  const broker = await db.broker.findUniqueOrThrow({ where: { id: brokerId } });
  let question: string | null = null;

  const tools = {
    search_precedents: tool({
      description: "Search this broker's past corrections (precedents) by keywords, e.g. 'silicone' or 'knitted shirt'.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const terms = query.split(/\s+/).filter((t) => t.length > 2);
        const rows = await db.precedent.findMany({
          where: {
            brokerId,
            OR: terms.flatMap((t) => [{ lineText: { contains: t } }, { reason: { contains: t } }]),
          },
          take: 10,
        });
        return rows.map(({ id, lineText, oldCode, newCode, reason }) => ({ id, lineText, wrongCode: oldCode, correctCode: newCode, reason }));
      },
    }),
    search_tariff: tool({
      description: "Search the UK Trade Tariff. Pass `query` words to match code descriptions, or `number` (2, 4 or 6 digits) to list codes under a chapter, heading or subheading.",
      inputSchema: z.object({ query: z.string().optional(), number: z.string().optional() }),
      execute: async (input) => searchTariff(input),
    }),
    get_commodity: tool({
      description: "Get one 10-digit code's full description, third-country duty rate and its chapter's legal notes.",
      inputSchema: z.object({ code: z.string() }),
      execute: async ({ code }) => getCommodity(code),
    }),
    ask_client: tool({
      description: "Record the one question for the importer that would decide the code. Use only when the deciding fact is missing.",
      inputSchema: z.object({ question: z.string() }),
      execute: async (input) => {
        question = input.question;
        return { recorded: true, note: "Give your best guess now; the broker will send this question." };
      },
    }),
  };

  const res = await generateText({
    model: mubit(MODEL_ID),
    system: systemPrompt(broker.name),
    prompt: `Product line: ${lineText}`,
    tools,
    output: Output.object({ schema: resultSchema }),
    stopWhen: isStepCount(MAX_STEPS),
    // On the last step, ask for the answer in the messages (not via toolChoice or activeTools,
    // which Mubit counts as part of the task) so the agent never runs out of steps silently.
    prepareStep: ({ stepNumber, messages }) =>
      stepNumber === MAX_STEPS - 1
        ? { messages: [...messages, { role: "user", content: "That was your last tool call. Give your final answer now." }] }
        : undefined,
  });

  const log: ToolCallLog[] = res.steps.flatMap((s) =>
    s.toolResults.map((r) => ({ tool: r.toolName, input: r.input, output: r.output })),
  );

  return {
    ...res.output,
    question,
    flagged: res.output.confidence < 0.8 || question !== null,
    model: MODEL_ID,
    mubitRequestIds: res.steps.map((s) => mubitRequestId(s.response.headers)).filter(Boolean) as string[],
    toolCalls: log,
  };
}
