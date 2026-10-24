import { IntegrationsView } from "./integrations-view";

export default async function IntegrationsPage({ params }: PageProps<"/[broker]/integrations">) {
  const { broker } = await params;
  return <IntegrationsView broker={broker} />;
}
