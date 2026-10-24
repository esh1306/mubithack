import { db } from "@/lib/db";
import { HomeView } from "./home-view";

export default async function HomePage({ params }: PageProps<"/[broker]/home">) {
  const { broker } = await params;
  const b = await db.broker.findUniqueOrThrow({ where: { id: broker } });
  return <HomeView broker={broker} brokerName={b.name} />;
}
