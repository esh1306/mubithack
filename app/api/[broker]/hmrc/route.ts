import { db } from "@/lib/db";
import { clearConfig, getConfig, mask, setConfig } from "@/lib/integrations";
import { authorizeLink, importDeclarationXml, refresh, submitDeclaration, type HmrcConfig } from "@/lib/cds";

type Params = { params: Promise<{ broker: string }> };

function status(cfg: HmrcConfig | null) {
  if (!cfg) return { configured: false };
  return {
    configured: true,
    clientId: cfg.clientId,
    clientSecret: mask(cfg.clientSecret),
    redirectUri: cfg.redirectUri,
    eori: cfg.eori,
    badgeId: cfg.badgeId ?? null,
    connected: !!cfg.accessToken,
    expiresAt: cfg.expiresAt ?? null,
    lastSubmission: cfg.lastSubmission ?? null,
  };
}

export async function GET(req: Request, { params }: Params) {
  const { broker } = await params;
  // The redirect URI to register on the Developer Hub, even before anything is saved.
  return Response.json({ redirectUri: `${new URL(req.url).origin}/api/hmrc/callback`, ...status(await getConfig<HmrcConfig>(broker, "hmrc")) });
}

// POST { action: "save", clientId, clientSecret, eori, badgeId? } → saves app settings, returns the HMRC sign-in link
//      { action: "disconnect" }
//      { action: "preview" | "submit", batchId } → the declaration XML (and for submit, HMRC's response)
export async function POST(req: Request, { params }: Params) {
  const { broker } = await params;
  const body = await req.json();
  const origin = new URL(req.url).origin;

  if (body.action === "save") {
    const prev = await getConfig<HmrcConfig>(broker, "hmrc");
    const cfg: HmrcConfig = {
      clientId: String(body.clientId).trim(),
      clientSecret: body.clientSecret ? String(body.clientSecret).trim() : prev?.clientSecret ?? "",
      redirectUri: `${origin}/api/hmrc/callback`,
      eori: String(body.eori).trim().toUpperCase(),
      badgeId: body.badgeId ? String(body.badgeId).trim().toUpperCase() : undefined,
    };
    await setConfig(broker, "hmrc", cfg);
    return Response.json({ ...status(cfg), authorizeUrl: authorizeLink(cfg, broker) });
  }
  if (body.action === "disconnect") {
    await clearConfig(broker, "hmrc");
    return Response.json(status(null));
  }

  let cfg = await getConfig<HmrcConfig>(broker, "hmrc");
  if (!cfg) return Response.json({ error: "Add your HMRC Developer Hub app first" }, { status: 400 });

  const lines = await db.line.findMany({
    where: { brokerId: broker, batchId: String(body.batchId) },
    include: { suggestions: { orderBy: { id: "desc" }, take: 1 } },
    orderBy: { id: "asc" },
  });
  const items = lines
    .filter((l) => l.suggestions[0])
    .map((l) => ({ description: l.text, code: l.suggestions[0].code, value: l.value, origin: l.origin, qty: l.qty }));
  if (items.length === 0) return Response.json({ error: "That invoice has no classified lines" }, { status: 400 });
  const lrn = `PREC${Date.now().toString(36).toUpperCase()}`.slice(0, 22);
  const xml = importDeclarationXml(cfg, lrn, items);

  if (body.action === "preview") return Response.json({ lrn, xml });

  if (body.action === "submit") {
    if (!cfg.accessToken) return Response.json({ error: "Sign in to the HMRC sandbox first", lrn, xml }, { status: 400 });
    try {
      if (cfg.expiresAt && cfg.expiresAt < Date.now() + 60_000 && cfg.refreshToken) {
        cfg = { ...cfg, ...(await refresh(cfg)) };
        await setConfig(broker, "hmrc", cfg);
      }
      const result = await submitDeclaration(cfg, xml);
      await setConfig(broker, "hmrc", { ...cfg, lastSubmission: { at: new Date().toISOString(), lrn, ...result } });
      return Response.json({ lrn, xml, ...result });
    } catch (e) {
      return Response.json({ error: (e as Error).message, lrn, xml }, { status: 502 });
    }
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
