import { db } from "@/lib/db";
import { ClassifyView } from "./classify-view";
import { InvoicesList } from "./invoices-list";

// /classify is the invoice list. ?batch= opens one invoice, ?new=1 starts one, ?sample= runs a sample.
export default async function ClassifyPage({ params, searchParams }: PageProps<"/[broker]/classify">) {
  const { broker } = await params;
  const q = await searchParams;
  if (!q.batch && !q.new && !q.sample && !q.demo) return <InvoicesList broker={broker} />;
  const brokers = await db.broker.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <ClassifyView broker={broker} brokers={brokers} />;
}
