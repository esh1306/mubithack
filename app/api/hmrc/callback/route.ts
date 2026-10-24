import { getConfig, setConfig } from "@/lib/integrations";
import { exchangeCode, type HmrcConfig } from "@/lib/cds";

// HMRC sends the broker back here after sign-in: ?code=…&state=<broker>.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const broker = url.searchParams.get("state") ?? "";
  const back = (q: string) => Response.redirect(`${url.origin}/${broker}/integrations?${q}`, 302);

  if (url.searchParams.get("error")) return back(`hmrc=error&message=${encodeURIComponent(url.searchParams.get("error_description") ?? url.searchParams.get("error")!)}`);
  const code = url.searchParams.get("code");
  const cfg = await getConfig<HmrcConfig>(broker, "hmrc");
  if (!code || !cfg) return back("hmrc=error&message=Missing%20code%20or%20settings");
  try {
    await setConfig(broker, "hmrc", { ...cfg, ...(await exchangeCode(cfg, code)) });
    return back("hmrc=connected");
  } catch (e) {
    return back(`hmrc=error&message=${encodeURIComponent((e as Error).message)}`);
  }
}
