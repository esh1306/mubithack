import { db } from "@/lib/db";
import { ClassifyView } from "./classify-view";

export default async function ClassifyPage({ params }: PageProps<"/[broker]/classify">) {
  const { broker } = await params;
  const brokers = await db.broker.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <ClassifyView broker={broker} brokers={brokers} />;
}
