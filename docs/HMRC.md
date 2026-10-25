# HMRC Customs Declarations (sandbox)

Precedent files a classified invoice as a WCO DEC-DMS **H1** through HMRC’s **test** API. Not live CDS.

## Env

```
HMRC_CLIENT_ID=
HMRC_CLIENT_SECRET=
```

Redirect URI the Developer Hub must allow:

```
http://localhost:3000/api/hmrc/callback
```

If either env var is empty, Integrations says the HMRC app is not set up. Sign-in is hidden.

## Developer Hub (sandbox)

1. [developer.service.hmrc.gov.uk](https://developer.service.hmrc.gov.uk) → add an application on the **sandbox**.
2. Subscribe it to **Customs Declarations** (`write:customs-declaration`) and, to mint a test company, **Create Test User**.
3. Add the redirect URI above.
4. Paste client id / secret into `.env.local`. Restart the app.
5. Integrations → **Create sandbox test company** (needs the Create Test User subscription) or sign in with an existing sandbox user that has `customs-services`.
6. Pick a classified invoice → preview XML → **Submit to HMRC sandbox**.

API hosts:

- Authorize: `https://test-www.tax.service.gov.uk/oauth/authorize`
- Token / API: `https://test-api.service.hmrc.gov.uk`

A 202 means accepted for processing. Failures show HMRC’s message, not a fake success.

## Honesty

- Always labelled **sandbox**.
- Tokens are stored server-side and refreshed; brokers never type the app secret.
- EORI on the declaration is the signed-in test company (or the client EORI you set).
