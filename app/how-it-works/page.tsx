import type { Metadata } from "next";
import { HowItWorksView } from "@/components/how-it-works-view";

export const metadata: Metadata = {
  title: "How it works · Precedent",
  description: "Shopify listings in, a receipt for every code, Mubit teaching, HMRC sandbox out.",
};

export default function Page() {
  return <HowItWorksView />;
}
