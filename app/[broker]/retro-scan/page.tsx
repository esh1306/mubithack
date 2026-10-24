import { RetroScanView } from "./retro-scan-view";

export default async function RetroScanPage({ params }: PageProps<"/[broker]/retro-scan">) {
  const { broker } = await params;
  return <RetroScanView broker={broker} />;
}
