import { db } from "@/lib/db";
import { clearConfig, getConfig, setConfig } from "@/lib/integrations";
import {
  authorizeLink,
  createTestOrganisation,
  hmrcApp,
  buildDeclaration,
  refresh,
  submitDeclaration,
  type HmrcApp,
  type HmrcConfig,
} from "@/lib/cds";

type Params = { params: Promise<{ broker: string }> };

function status(app: HmrcApp | null, cfg: HmrcConfig | null) {
  return {
    appReady: !!app, // Precedent's HMRC app is set up on the server
    redirectUri: app?.redirectUri ?? null,
    connected: !!cfg?.accessToken,
    eori: cfg?.eori ?? null,
    badgeId: cfg?.badgeId ?? null,
    testUser: cfg?.testUser ?? null,
    expiresAt: cfg?.expiresAt ?? null,
    lastSubmission: cfg?.lastSubmission ?? null,
  };
}

// The saved sign-in, with the access token refreshed first if it's about to expire.
// HMRC access tokens last 4 hours; the refresh token keeps the app signed in long after that.
async function freshConfig(app: HmrcApp | null) {
  const cfg = await getConfig<HmrcConfig>("hmrc");
  if (!app || !cfg?.accessToken || !cfg.refreshToken || (cfg.expiresAt ?? 0) > Date.now() + 5 * 60_000) return cfg;
  try {
    const next = { ...cfg, ...(await refresh(app, cfg.refreshToken)) };
    await setConfig("hmrc", next);
    return next;
  } catch {
    // Refresh token revoked or expired: keep the EORI etc., but sign out.
    const signedOut = { ...cfg, accessToken: undefined, refreshToken: undefined, expiresAt: undefined };
    await setConfig("hmrc", signedOut);
    return signedOut;
  }
}

export async function GET(req: Request) {
  const app = hmrcApp(new URL(req.url).origin);
  return Response.json(status(app, await freshConfig(app)));
}

// POST { action: "sign-in" } → the HMRC sign-in link
//      { action: "test-user" } → a sandbox organisation with customs-services; its EORI is saved
//      { action: "save", eori, badgeId? } → declarant details
//      { action: "sign-out" }
//      { action: "preview" | "submit", batchId } → the declaration XML (and for submit, HMRC's response)
export async function POST(req: Request, { params }: Params) {
  const { broker } = await params;
  const body = await req.json();
  const app = hmrcApp(new URL(req.url).origin);
  if (!app) return Response.json({ error: "Set HMRC_CLIENT_ID and HMRC_CLIENT_SECRET in .env.local" }, { status: 500 });
  const cfg = (await freshConfig(app)) ?? {};

  if (body.action === "sign-in") return Response.json({ authorizeUrl: authorizeLink(app, broker) });

  if (body.action === "test-user") {
    try {
      const u = await createTestOrganisation(app);
      const next = { ...cfg, eori: u.eori, testUser: { userId: u.userId, password: u.password, name: u.name } };
      await setConfig("hmrc", next);
      return Response.json(status(app, next));
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  if (body.action === "save") {
    const next = {
      ...cfg,
      eori: String(body.eori ?? "").trim().toUpperCase() || cfg.eori,
      badgeId: body.badgeId ? String(body.badgeId).trim().toUpperCase() : undefined,
    };
    await setConfig("hmrc", next);
    return Response.json(status(app, next));
  }

  if (body.action === "sign-out") {
    await clearConfig("hmrc");
    return Response.json(status(app, null));
  }

  if (!cfg.eori) return Response.json({ error: "Add the importer's EORI first (or create a test user)" }, { status: 400 });
  const declarant = { ...cfg, eori: cfg.eori };

  const lines = await db.line.findMany({
    where: { brokerId: broker, batchId: String(body.batchId) },
    include: { suggestions: { orderBy: { id: "desc" }, take: 1 }, client: true },
    orderBy: { id: "asc" },
  });
  // The invoice's client is the importer (DE 3/16); the signed-in broker firm is the declarant (DE 3/18).
  const client = lines[0]?.client ?? null;
  const items = lines
    .filter((l) => l.suggestions[0])
    .map((l) => ({ description: l.text, code: l.suggestions[0].code, value: l.value, origin: l.origin, qty: l.qty }));
  if (items.length === 0) return Response.json({ error: "That invoice has no classified lines" }, { status: 400 });
  const lrn = `PREC${Date.now().toString(36).toUpperCase()}`.slice(0, 22);
  const { summary, xml } = buildDeclaration(declarant, lrn, items, { importerEori: client?.eori ?? undefined, importerName: client?.name });

  if (body.action === "preview") return Response.json({ lrn, xml, summary });

  if (body.action === "submit") {
    if (!cfg.accessToken) return Response.json({ error: "Sign in with HMRC first", lrn, xml }, { status: 400 });
    try {
      const result = await submitDeclaration(declarant, xml);
      await setConfig("hmrc", { ...cfg, lastSubmission: { at: new Date().toISOString(), lrn, ...result } });
      return Response.json({ lrn, xml, summary, ...result });
    } catch (e) {
      return Response.json({ error: (e as Error).message, lrn, xml }, { status: 502 });
    }
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
