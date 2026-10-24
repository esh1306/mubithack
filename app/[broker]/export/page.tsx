import { ExportView } from "./export-view";

export default async function ExportPage({ params }: PageProps<"/[broker]/export">) {
  const { broker } = await params;
  return <ExportView broker={broker} />;
}
