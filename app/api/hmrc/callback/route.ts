import { getConfig, setConfig } from "@/lib/integrations";
import { exchangeCode, hmrcApp, type HmrcConfig } from "@/lib/cds";

// HMRC sends the broker back here after sign-in: ?code=…&state=<broker>.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const broker = url.searchParams.get("state") ?? "";
  const back = (q: string) => Response.redirect(`${url.origin}/${broker}/integrations?${q}`, 302);

  if (url.searchParams.get("error")) return back(`hmrc=error&message=${encodeURIComponent(url.searchParams.get("error_description") ?? url.searchParams.get("error")!)}`);
  const code = url.searchParams.get("code");
  const app = hmrcApp(url.origin);
  if (!code || !app) return back("hmrc=error&message=Missing%20code%20or%20HMRC%20app%20settings");
  try {
    const cfg = (await getConfig<HmrcConfig>("hmrc")) ?? {};
    await setConfig("hmrc", { ...cfg, ...(await exchangeCode(app, code)) });
    return back("hmrc=connected");
  } catch (e) {
    return back(`hmrc=error&message=${encodeURIComponent((e as Error).message)}`);
  }
}
