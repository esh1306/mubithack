import type { Metadata } from "next";
import { LandingView } from "@/components/landing-view";

export const metadata: Metadata = {
  title: "Precedent",
  description: "Teach a commodity code once. It remembers — for that broker only.",
};

export default function Page() {
  return <LandingView />;
}
