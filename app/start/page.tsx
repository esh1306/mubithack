import type { Metadata } from "next";
import { StartView } from "./start-view";

export const metadata: Metadata = { title: "Choose your firm · Precedent" };

export default function StartPage() {
  return <StartView />;
}
