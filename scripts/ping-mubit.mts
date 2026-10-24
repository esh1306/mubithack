// bun run script scripts/ping-mubit.mts — one call through Mubit; it should then show in the console's Requests.
import { generateText } from "ai";
import { mubit, MODEL_ID, mubitRequestId } from "../lib/mubit";

const res = await generateText({
  model: mubit(MODEL_ID),
  prompt: "Reply with exactly: pong",
});
console.log(res.text, "| mubit request id:", mubitRequestId(res.response.headers));
