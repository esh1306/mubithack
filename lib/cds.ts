// HMRC Customs Declarations API (sandbox): OAuth 2.0 authorization code flow, then a WCO DEC-DMS
// XML import declaration built from a classified invoice. Spec: developer.service.hmrc.gov.uk,
// "Customs Declarations" 1.0 (POST /customs/declarations/, scope write:customs-declaration).
export const HMRC = {
  authorizeUrl: "https://test-www.tax.service.gov.uk/oauth/authorize",
  tokenUrl: "https://test-api.service.hmrc.gov.uk/oauth/token",
  apiBase: "https://test-api.service.hmrc.gov.uk",
  scope: "write:customs-declaration",
};

// Precedent's own Developer Hub app, from the server environment. Brokers never see or type these.
export type HmrcApp = { clientId: string; clientSecret: string; redirectUri: string };

export function hmrcApp(origin: string): HmrcApp | null {
  const clientId = process.env.HMRC_CLIENT_ID;
  const clientSecret = process.env.HMRC_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret, redirectUri: `${origin}/api/hmrc/callback` } : null;
}

// What the app remembers about the broker's HMRC sign-in.
export type HmrcConfig = {
  eori?: string; // importer/declarant EORI, also sent as X-Submitter-Identifier
  badgeId?: string;
  testUser?: { userId: string; password: string; name?: string };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  lastSubmission?: { at: string; status: number; conversationId: string | null; body: string; lrn: string };
};

export function authorizeLink(app: HmrcApp, state: string) {
  const u = new URL(HMRC.authorizeUrl);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", app.clientId);
  u.searchParams.set("scope", HMRC.scope);
  u.searchParams.set("redirect_uri", app.redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

async function token(params: Record<string, string>) {
  const res = await fetch(HMRC.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HMRC token ${res.status}: ${body.error_description ?? body.error ?? res.statusText}`);
  return { accessToken: body.access_token as string, refreshToken: body.refresh_token as string, expiresAt: Date.now() + (body.expires_in ?? 14400) * 1000 };
}

export function exchangeCode(app: HmrcApp, code: string) {
  return token({ grant_type: "authorization_code", client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: app.redirectUri, code });
}

export function refresh(app: HmrcApp, refreshToken: string) {
  return token({ grant_type: "refresh_token", client_id: app.clientId, client_secret: app.clientSecret, refresh_token: refreshToken });
}

// Sandbox test organisation enrolled for customs ("customs-services"), via the Create Test User API.
// Needs an application-restricted token (client credentials) and a subscription to that API.
export async function createTestOrganisation(app: HmrcApp) {
  const tokenRes = await fetch(HMRC.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: app.clientId, client_secret: app.clientSecret }),
  });
  const tok = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) throw new Error(`HMRC token ${tokenRes.status}: ${tok.error_description ?? tok.error ?? tokenRes.statusText}`);

  const res = await fetch(`${HMRC.apiBase}/create-test-user/organisations`, {
    method: "POST",
    headers: { Accept: "application/vnd.hmrc.1.0+json", "Content-Type": "application/json", Authorization: `Bearer ${tok.access_token}` },
    body: JSON.stringify({ serviceNames: ["customs-services"] }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Create test user ${res.status}: ${body.message ?? body.code ?? res.statusText}`);
  return { userId: body.userId as string, password: body.password as string, eori: (body.eoriNumber ?? "") as string, name: body.organisationDetails?.name as string | undefined };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type DeclarationItem = { description: string; code: string; value: number | null; origin: string | null; qty: number | null };

// Two-letter ISO code from what invoices usually say.
function countryCode(origin: string | null) {
  if (!origin) return "CN";
  const o = origin.trim();
  if (/^[A-Z]{2}$/i.test(o)) return o.toUpperCase();
  const map: Record<string, string> = { china: "CN", bangladesh: "BD", vietnam: "VN", "viet nam": "VN", turkey: "TR", "türkiye": "TR", india: "IN", "united states": "US" };
  return map[o.toLowerCase()] ?? "CN";
}

// A Type H1 import declaration (DE 1/1 IM, 1/2 A: standard, frontier), procedure 40 00 (release for
// free circulation). WCO DEC-DMS is strict about element order, so each block below follows the schema.
// DE 6/14 is the first 8 digits of the commodity code and DE 6/15 the 2 TARIC digits.
export function buildDeclaration(
  cfg: HmrcConfig & { eori: string },
  lrn: string,
  items: DeclarationItem[],
  importer: { importerEori?: string; importerName?: string } = {},
) {
  const importerEori = importer.importerEori || cfg.eori;
  const lines = items.map((it, i) => ({
    seq: i + 1,
    description: it.description.slice(0, 512),
    cn: it.code.slice(0, 8),
    taric: it.code.slice(8, 10) || "00",
    value: Math.round((it.value ?? 0) * 100) / 100,
    origin: countryCode(it.origin),
    packages: Math.max(1, Math.round(it.qty ?? 1)),
  }));
  const summary = {
    lrn,
    type: "IMA",
    typeLabel: "Import · standard declaration (H1)",
    procedure: "4000",
    procedureLabel: "Release for free circulation, no previous procedure",
    declarant: cfg.eori,
    importer: importerEori,
    importerName: importer.importerName ?? null,
    representation: "Direct (agent for the importer)",
    goodsLocation: "FXTFXTFXT (Felixstowe)",
    currency: "GBP",
    total: Math.round(lines.reduce((s, l) => s + l.value, 0) * 100) / 100,
    lines,
  };

  const goods = lines
    .map(
      (l) => `
      <GovernmentAgencyGoodsItem>
        <SequenceNumeric>${l.seq}</SequenceNumeric>
        <StatisticalValueAmount currencyID="GBP">${l.value.toFixed(2)}</StatisticalValueAmount>
        <Commodity>
          <Description>${esc(l.description)}</Description>
          <Classification>
            <ID>${l.cn}</ID>
            <IdentificationTypeCode>TSP</IdentificationTypeCode>
          </Classification>
          <Classification>
            <ID>${l.taric}</ID>
            <IdentificationTypeCode>TRC</IdentificationTypeCode>
          </Classification>
          <InvoiceLine>
            <ItemChargeAmount currencyID="GBP">${l.value.toFixed(2)}</ItemChargeAmount>
          </InvoiceLine>
        </Commodity>
        <GovernmentProcedure>
          <CurrentCode>40</CurrentCode>
          <PreviousCode>00</PreviousCode>
        </GovernmentProcedure>
        <GovernmentProcedure>
          <CurrentCode>000</CurrentCode>
        </GovernmentProcedure>
        <Origin>
          <CountryCode>${l.origin}</CountryCode>
          <TypeCode>1</TypeCode>
        </Origin>
        <Packaging>
          <SequenceNumeric>1</SequenceNumeric>
          <QuantityQuantity>${l.packages}</QuantityQuantity>
          <TypeCode>PK</TypeCode>
        </Packaging>
      </GovernmentAgencyGoodsItem>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<md:MetaData xmlns:md="urn:wco:datamodel:WCO:DocumentMetaData-DMS:2" xmlns="urn:wco:datamodel:WCO:DEC-DMS:2" xmlns:clm63055="urn:un:unece:uncefact:codelist:standard:UNECE:AgencyIdentificationCode:D12B" xmlns:ds="urn:wco:datamodel:WCO:MetaData_DS-DMS:2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <md:WCODataModelVersionCode>3.6</md:WCODataModelVersionCode>
  <md:WCOTypeName>DEC</md:WCOTypeName>
  <md:ResponsibleCountryCode>GB</md:ResponsibleCountryCode>
  <md:ResponsibleAgencyName>HMRC</md:ResponsibleAgencyName>
  <md:AgencyAssignedCustomizationVersionCode>v2.1</md:AgencyAssignedCustomizationVersionCode>
  <Declaration xmlns:clm5ISO42173A="urn:un:unece:uncefact:codelist:standard:ISO:ISO3AlphaCurrencyCode:2012-08-31" xmlns:p1="urn:wco:datamodel:WCO:Declaration_DS:DMS:2" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:6">
    <FunctionCode>9</FunctionCode>
    <FunctionalReferenceID>${esc(lrn)}</FunctionalReferenceID>
    <TypeCode>${summary.type}</TypeCode>
    <GoodsItemQuantity>${lines.length}</GoodsItemQuantity>
    <InvoiceAmount currencyID="GBP">${summary.total.toFixed(2)}</InvoiceAmount>
    <Agent>
      <FunctionCode>2</FunctionCode>
    </Agent>
    <BorderTransportMeans>
      <ModeCode>1</ModeCode>
    </BorderTransportMeans>
    <Declarant>
      <ID>${esc(cfg.eori)}</ID>
    </Declarant>
    <GoodsShipment>
      <TransactionNatureCode>1</TransactionNatureCode>
      <Consignment>
        <ContainerCode>1</ContainerCode>
        <GoodsLocation>
          <Name>FXTFXTFXT</Name>
          <TypeCode>A</TypeCode>
          <Address>
            <TypeCode>U</TypeCode>
            <CountryCode>GB</CountryCode>
          </Address>
        </GoodsLocation>
      </Consignment>
      <Destination>
        <CountryCode>GB</CountryCode>
      </Destination>${goods}
      <Importer>
        <ID>${esc(importerEori)}</ID>
      </Importer>
      <PreviousDocument>
        <CategoryCode>Z</CategoryCode>
        <ID>${esc(`${new Date().getFullYear() % 10}${cfg.eori}-${lrn.slice(-6)}`)}</ID>
        <TypeCode>DCR</TypeCode>
      </PreviousDocument>
    </GoodsShipment>
  </Declaration>
</md:MetaData>`;
  return { summary, xml };
}

export type DeclarationSummary = ReturnType<typeof buildDeclaration>["summary"];

export async function submitDeclaration(cfg: HmrcConfig & { eori: string }, xml: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.hmrc.1.0+xml",
    "Content-Type": "application/xml; charset=UTF-8",
    Authorization: `Bearer ${cfg.accessToken}`,
  };
  if (cfg.badgeId) headers["X-Badge-Identifier"] = cfg.badgeId;
  else headers["X-Submitter-Identifier"] = cfg.eori;
  const res = await fetch(`${HMRC.apiBase}/customs/declarations/`, { method: "POST", headers, body: xml, signal: AbortSignal.timeout(30000) });
  return { status: res.status, conversationId: res.headers.get("x-conversation-id"), body: await res.text() };
}
