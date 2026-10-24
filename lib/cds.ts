// HMRC Customs Declarations API (sandbox): OAuth 2.0 authorization code flow, then a WCO DEC-DMS
// XML import declaration built from a classified invoice. Spec: developer.service.hmrc.gov.uk,
// "Customs Declarations" 1.0 (POST /customs/declarations/, scope write:customs-declaration).
export const HMRC = {
  authorizeUrl: "https://test-www.tax.service.gov.uk/oauth/authorize",
  tokenUrl: "https://test-api.service.hmrc.gov.uk/oauth/token",
  apiBase: "https://test-api.service.hmrc.gov.uk",
  scope: "write:customs-declaration",
};

export type HmrcConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  eori: string; // importer/declarant EORI, also sent as X-Submitter-Identifier
  badgeId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  lastSubmission?: { at: string; status: number; conversationId: string | null; body: string; lrn: string };
};

export function authorizeLink(cfg: HmrcConfig, state: string) {
  const u = new URL(HMRC.authorizeUrl);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("scope", HMRC.scope);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
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

export function exchangeCode(cfg: HmrcConfig, code: string) {
  return token({ grant_type: "authorization_code", client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri, code });
}

export function refresh(cfg: HmrcConfig) {
  return token({ grant_type: "refresh_token", client_id: cfg.clientId, client_secret: cfg.clientSecret, refresh_token: cfg.refreshToken! });
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

// A Type H1 import declaration (DE 1/1 IM, 1/2 Z: pre-lodged), procedure 40 00 (release for free circulation).
// DE 6/14 is the first 8 digits of the commodity code and DE 6/15 the 2 TARIC digits.
export function importDeclarationXml(cfg: HmrcConfig, lrn: string, items: DeclarationItem[]) {
  const total = items.reduce((s, i) => s + (i.value ?? 0), 0);
  const goods = items
    .map(
      (it, i) => `
      <GovernmentAgencyGoodsItem>
        <SequenceNumeric>${i + 1}</SequenceNumeric>
        <StatisticalValueAmount currencyID="GBP">${(it.value ?? 0).toFixed(2)}</StatisticalValueAmount>
        <Commodity>
          <Description>${esc(it.description.slice(0, 512))}</Description>
          <Classification>
            <ID>${it.code.slice(0, 8)}</ID>
            <IdentificationTypeCode>TSP</IdentificationTypeCode>
          </Classification>
          <Classification>
            <ID>${it.code.slice(8, 10) || "00"}</ID>
            <IdentificationTypeCode>TRC</IdentificationTypeCode>
          </Classification>
          <InvoiceLine>
            <ItemChargeAmount currencyID="GBP">${(it.value ?? 0).toFixed(2)}</ItemChargeAmount>
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
          <CountryCode>${countryCode(it.origin)}</CountryCode>
          <TypeCode>1</TypeCode>
        </Origin>
        <Packaging>
          <SequenceNumeric>1</SequenceNumeric>
          <QuantityQuantity>${Math.max(1, Math.round(it.qty ?? 1))}</QuantityQuantity>
          <TypeCode>PK</TypeCode>
        </Packaging>
        <ValuationAdjustment>
          <AdditionCode>0000</AdditionCode>
        </ValuationAdjustment>
      </GovernmentAgencyGoodsItem>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:MetaData xmlns:md="urn:wco:datamodel:WCO:DocumentMetaData-DMS:2" xmlns="urn:wco:datamodel:WCO:DEC-DMS:2" xmlns:clm63055="urn:un:unece:uncefact:codelist:standard:UNECE:AgencyIdentificationCode:D12B" xmlns:ds="urn:wco:datamodel:WCO:MetaData_DS-DMS:2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <md:WCODataModelVersionCode>3.6</md:WCODataModelVersionCode>
  <md:WCOTypeName>DEC</md:WCOTypeName>
  <md:ResponsibleCountryCode>GB</md:ResponsibleCountryCode>
  <md:ResponsibleAgencyName>HMRC</md:ResponsibleAgencyName>
  <md:AgencyAssignedCustomizationVersionCode>v2.1</md:AgencyAssignedCustomizationVersionCode>
  <Declaration xmlns:clm5ISO42173A="urn:un:unece:uncefact:codelist:standard:ISO:ISO3AlphaCurrencyCode:2012-08-31" xmlns:p1="urn:wco:datamodel:WCO:Declaration_DS:DMS:2" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:6">
    <AcceptanceDateTime>
      <p1:DateTimeString formatCode="304">${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "")}+00</p1:DateTimeString>
    </AcceptanceDateTime>
    <FunctionCode>9</FunctionCode>
    <FunctionalReferenceID>${esc(lrn)}</FunctionalReferenceID>
    <TypeCode>IMZ</TypeCode>
    <GoodsItemQuantity>${items.length}</GoodsItemQuantity>
    <InvoiceAmount currencyID="GBP">${total.toFixed(2)}</InvoiceAmount>
    <Declarant>
      <ID>${esc(cfg.eori)}</ID>
    </Declarant>
    <GoodsShipment>
      <TransactionNatureCode>1</TransactionNatureCode>
      <Importer>
        <ID>${esc(cfg.eori)}</ID>
      </Importer>
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
      </Destination>
      ${goods}
      <PreviousDocument>
        <CategoryCode>Z</CategoryCode>
        <ID>${esc(`${new Date().getFullYear() % 10}${cfg.eori}-${lrn.slice(-6)}`)}</ID>
        <TypeCode>DCR</TypeCode>
      </PreviousDocument>
    </GoodsShipment>
  </Declaration>
</md:MetaData>`;
}

export async function submitDeclaration(cfg: HmrcConfig, xml: string) {
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
