import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { FirmGate } from "@/components/firm-gate";

export default async function BrokerLayout({ children, params }: LayoutProps<"/[broker]">) {
  const { broker } = await params;
  const [current, brokers] = await Promise.all([
    db.broker.findUnique({ where: { id: broker } }),
    db.broker.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!current) notFound();

  return (
    <div className="desk flex min-h-screen">
      <FirmGate broker={broker} />
      <Sidebar current={current} brokers={brokers} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar firm={current.name} />
        <main className="min-w-0 flex-1 px-5 pb-10 pt-20 md:px-12 md:py-10">{children}</main>
      </div>
    </div>
  );
}
