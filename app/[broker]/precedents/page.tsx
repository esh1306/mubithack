import { PrecedentsView } from "./precedents-view";

export default async function PrecedentsPage({ params }: PageProps<"/[broker]/precedents">) {
  const { broker } = await params;
  return <PrecedentsView broker={broker} />;
}
