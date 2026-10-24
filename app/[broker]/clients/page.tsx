import { ClientsView } from "./clients-view";

export default async function ClientsPage({ params }: PageProps<"/[broker]/clients">) {
  const { broker } = await params;
  return <ClientsView broker={broker} />;
}
