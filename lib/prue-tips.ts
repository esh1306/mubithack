import type { PrueState } from "@/components/prue";

// One Prue per screen. Each section decides where she stands, how she looks and what she says.
//   sidebar: at the foot of the sidebar        page: inside the page (title, panel)
//   corner:  bottom-right of the page          tour: the tour narrates with its own Prue
export type PruePlace = "sidebar" | "page" | "corner" | "tour";

export const PRUE: Record<string, { place: PruePlace; pose: PrueState; say: string }> = {
  home: { place: "sidebar", pose: "hello", say: "👋 Hi, I'm Prue. I find the UK commodity code for every product and print a receipt for it." },
  classify: { place: "sidebar", pose: "hello", say: "📋 Your invoices live here. Open one to review its codes, or start a new invoice for a client." },
  "classify:invoice": { place: "sidebar", pose: "idle", say: "🧾 Open a line to see my receipt: HMRC's sources, the legal note, the duty. Approve it, or correct me and I'll remember." },
  "classify:new": { place: "page", pose: "hello", say: "📦 Who's this one for? Pick a client to start." },
  clients: { place: "page", pose: "hello", say: "🤝 Each client is an importer. Click one to bring in their Shopify catalogue or start an invoice." },
  "retro-scan": { place: "page", pose: "thinking", say: "🔍 I re-check 3 years of imports at the rate on each date. Overpaid duty becomes a claim pack." },
  precedents: { place: "page", pose: "learned", say: "🎓 Every correction you make, I apply to similar products and teach to your firm's Mubit model." },
  integrations: { place: "corner", pose: "hello", say: "🔌 Goods come in from Shopify or Excel, I check them against HMRC's tariff, and signed codes go out." },
  export: { place: "page", pose: "idle", say: "📤 Download the signed codes for your declaration software, with every reason in the evidence file." },
  mubit: { place: "page", pose: "thinking", say: "🧠 Every check I run goes to your firm's own Mubit task. At 25 examples it can train a model." },
  tour: { place: "tour", pose: "hello", say: "" },
};

export const prueFor = (section: string) => PRUE[section] ?? PRUE.home;
