import { MubitView } from "./mubit-view";

export default async function MubitPage({ params }: PageProps<"/[broker]/mubit">) {
  const { broker } = await params;
  return <MubitView broker={broker} />;
}
