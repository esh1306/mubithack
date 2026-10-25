import { db } from "@/lib/db";
import { TourView } from "./tour-view";

export default async function TourPage({ params }: PageProps<"/[broker]/tour">) {
  const { broker } = await params;
  const b = await db.broker.findUniqueOrThrow({ where: { id: broker } });
  return <TourView broker={broker} brokerName={b.name} />;
}
