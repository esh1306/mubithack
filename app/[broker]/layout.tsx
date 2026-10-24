import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";

export default async function BrokerLayout({ children, params }: LayoutProps<"/[broker]">) {
  const { broker } = await params;
  const [current, brokers] = await Promise.all([
    db.broker.findUnique({ where: { id: broker } }),
    db.broker.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!current) notFound();

  return (
    <div className="flex min-h-screen">
      <Sidebar current={current} brokers={brokers} />
      <main className="min-w-0 flex-1 px-5 pb-10 pt-20 md:px-12 md:py-10">{children}</main>
    </div>
  );
}
