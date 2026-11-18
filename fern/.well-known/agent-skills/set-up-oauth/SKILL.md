---
name: set-up-oauth
description: Use when implementing or changing Mailchimp OAuth 2 in an application that connects other people's Mailchimp accounts, including the authorize redirect, the callback and code exchange, PKCE, refresh tokens, and storing tokens for one or many connected accounts. Covers both `prd_` client IDs on oauth.mailchimp.com and legacy apps on login.mailchimp.com.
---

# Set up OAuth

Mailchimp runs two OAuth 2 flows, and an app's flow is fixed when it's
registered. They use different servers, parameters, and token lifetimes, and
neither accepts the other's apps. Code written for the wrong one fails at the
first redirect, so identify the flow before you write anything.

[OAuth 2](https://mailchimp.com/developer/marketing/api-concepts/authentication/oauth-2.md) is the reference for
the current flow, [Set up an OAuth app](https://mailchimp.com/developer/marketing/build/start-developing/set-up-an-oauth-app.md)
has samples in four languages, and
[Legacy OAuth 2 apps](https://mailchimp.com/developer/marketing/api-concepts/authentication/legacy-oauth-2.md)
covers the older one. The contract below is what you need to get right; follow
the links for full samples.

## Identify the flow first

| What you see | Flow |
| --- | --- |
| `client_id` starts with `prd_` | Current, at `oauth.mailchimp.com` |
| App registered on or after November 13, 2026 | Current |
| A new integration with no app registered yet | Current. Every new registration is. |
| `client_id` without `prd_`, often all digits | Legacy, at `login.mailchimp.com` |
| Existing code that redirects to `login.mailchimp.com` | Legacy |

If you can't tell, ask the user for the `client_id`. Don't guess.

Never move an integration from one server to the other. `oauth.mailchimp.com`
shows users an error page for a legacy `client_id` and its token endpoint
returns `401 invalid_client`. There's no migration path. A legacy app that wants refresh tokens, PKCE, or
scopes needs a new registration, and every user must authorize the new app.

If a user asks you to add those features to a legacy app, say that, and offer
to build the current flow as a separate implementation for a new `prd_` app.
Don't add the features to the legacy code.

## Current flow (`prd_` client IDs)

Every endpoint is on `https://oauth.mailchimp.com`. Authorization code grant
with PKCE, HTTP Basic client authentication, 1-hour access tokens, and rotating
refresh tokens.

### Authorize

Redirect the user to `/oauth2/authorize` with every one of these:

| Parameter | Value |
| --- | --- |
| `response_type` | `code` |
| `client_id` | The `prd_` ID |
| `redirect_uri` | A registered URI, exact match. Send it even if you have only one. |
| `scope` | Space-delimited, such as `campaigns:read lists:write`. Request only what the app uses. |
| `state` | Random, stored server-side against the session |
| `code_challenge` | `BASE64URL(SHA256(code_verifier))`, no `=` padding |
| `code_challenge_method` | `S256`. `plain` is rejected with `invalid_request`. |

PKCE is required, not optional. A request without it fails with
`invalid_request`, and having a `client_secret` doesn't replace it. Generate a
new `code_verifier` for every authorization: 43 to 128 characters from
`A-Z a-z 0-9 - . _ ~`, kept on your server next to `state`.

### Callback and code exchange

The callback carries `code`, `state`, and `iss`, or `error` instead of `code`.
In this order:

1. Look up and delete the stored `state` and `code_verifier`. Reject with `400`
   if `state` doesn't match.
2. Reject if `iss` isn't exactly `https://oauth.mailchimp.com`.
3. If `error` is present (`access_denied` when the user declines), show a
   message and stop. Don't call the token endpoint.
4. POST to `/oauth2/token`, form-encoded, within 5 minutes:

```typescript
const res = await fetch("https://oauth.mailchimp.com/oauth2/token", {
  method: "POST",
  headers: {
    Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI, // same value as on the authorize redirect
    code_verifier: verifier,
  }),
});
```

Authenticate with HTTP Basic, not `client_id` and `client_secret` in the body.
A code works once. Exchanging it a second time fails with `invalid_grant` and
revokes the connection the first exchange created, so a reloaded callback must
be rejected by the `state` check before it reaches the token endpoint. If the
exchange fails, send the user through authorize again.

The response:

```json
{
  "access_token": "prd_at_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "prd_rt_...",
  "scope": "campaigns:read"
}
```

`scope` is what the user approved, which can be less than you asked for. Read
it and turn off features that need what wasn't granted.

Errors from `/oauth2/token` are JSON with `error` and `error_description`, per
RFC 6749. Branch on `error`: `invalid_grant` means the code or refresh token is
spent, expired, or revoked; `invalid_client` (401) means the credentials are
wrong. The full table is in
[Errors](https://mailchimp.com/developer/marketing/api-concepts/authentication/oauth-2.md#errors).

### Identify the account and store the connection

The token response doesn't say which Mailchimp account connected. Call
`GET https://api.mailchimp.com/3.0/` with `Authorization: Bearer ACCESS_TOKEN`
and key the connection on the `account_id` it returns. If that account is
already connected, update the existing record: the new authorization replaced
the old one, and the old tokens no longer work.

Store per connection: `account_id`, the refresh token (encrypted at rest), the
access token and its expiry from `expires_in`, the approved `scope`, and when
the user authorized.

### Lifetimes

| Item | Lifetime |
| --- | --- |
| Authorization code | 5 minutes, single use |
| Access token | 1 hour |
| Refresh token | 30 days without use; each refresh returns a new one |
| Connection | 180 days from authorization, however often you refresh |

Neither the 30-day nor the 180-day limit appears in the token response. Handle
`invalid_grant` on refresh as "the connection has ended", and ask users to
authorize again before 180 days pass, using the authorization time you stored.

### Refresh, once per connection

```
POST /oauth2/token   (HTTP Basic)
grant_type=refresh_token&refresh_token=prd_rt_...
```

Send only `grant_type`, `refresh_token`, and optionally a smaller `scope`.
Don't send `redirect_uri` or `code_verifier`. A refresh can't add scopes; that
takes a new authorization.

Refresh tokens rotate. Each refresh invalidates the token you sent, and if
Mailchimp sees an old one again it treats it as stolen and revokes the whole
connection. Two workers refreshing the same connection at once is enough to
trigger that, so:

- Route every refresh for a connection through one function that holds a lock
  (a row lock or distributed lock across processes, not an in-memory map).
- After taking the lock, read the store again. If another caller already
  refreshed, use its token.
- Save the new access token and new refresh token in one atomic write before
  releasing the lock or using either.
- If the refresh times out or the response is lost, don't resend the old
  refresh token. Read the store; if nothing new was saved, the user must
  authorize again.
- Refresh a few minutes before expiry rather than after requests start failing.

If the Marketing API returns `401` for an access token you expected to work,
force one refresh through the same locked function and retry the call once. If
that fails, mark the connection disconnected and ask the user to authorize
again.

### Revoke on disconnect

When a user disconnects, POST to `/oauth2/revoke` with HTTP Basic,
`token=<refresh token>` and `token_type_hint=refresh_token`, then delete what
you stored. The endpoint returns `200` even for unknown tokens. Your app still
appears in the user's **Connected Apps** afterward.

## Legacy flow (`login.mailchimp.com`)

Keep a legacy integration on its own flow, and don't add the current flow's
features to it:

- No PKCE, no `iss`, no scopes, and no refresh tokens. Don't send
  `code_challenge` or write a refresh function; there's nothing to call.
- Add `state` yourself. The documented legacy samples omit it. Generate it per
  session, compare it on the callback before spending the `code`, and clear it
  either way.
- Exchange the code at `https://login.mailchimp.com/oauth2/token` with
  `grant_type`, `client_id`, `client_secret`, `redirect_uri`, and `code` in the
  form body.
- The access token doesn't expire. Store it encrypted, one per connected
  account. A `401` on a token that used to work means the user revoked access
  or was removed: mark the connection disconnected and ask them to authorize
  again rather than retrying.

## Both flows

- **One API host.** Call `https://api.mailchimp.com/3.0/` for every account,
  with `Authorization: Bearer ACCESS_TOKEN`. Don't call
  `login.mailchimp.com/oauth2/metadata` or build a per-datacenter host like
  `us6.api.mailchimp.com`; if existing code does, remove it and the stored
  prefix.
- **Identify the account with `GET /3.0/`.** Its `account_id` is the key for a
  connection in either flow, and `account_name` labels it for the user.
- **Key by connection.** One person can connect several Mailchimp accounts.
  Resolve the token from the connection a request or job concerns. A single
  process-wide client holding one token works in development and sends the
  wrong account's token once there are two.
- **Secrets stay on the server.** The `client_secret` and refresh tokens never
  go to a browser, mobile binary, or repository. A mobile or desktop app needs
  a backend that makes its token requests.
- **No logging.** Never log or render the `code`, tokens, or `client_secret`,
  including in error messages. The documented samples print tokens to show the
  flow working; that's demonstration code.

## Before you ship

Current flow:

- Endpoints are on `oauth.mailchimp.com`, and client auth is HTTP Basic.
- Every authorization sends a fresh S256 `code_challenge`, `state`, and
  `redirect_uri`; the callback checks `state` and `iss` before exchanging.
- The account is identified with `GET /3.0/`, and connections are keyed on
  `account_id`.
- Refreshes go through one locked function per connection, and the new refresh
  token is saved atomically before use.
- `invalid_grant` on refresh marks the connection ended; users are asked to
  authorize again before 180 days.
- Disconnect calls `/oauth2/revoke`.

Legacy flow:

- Endpoints stay on `login.mailchimp.com`, with no PKCE or refresh code added.
- `state` is generated, checked, and cleared.
- A `401` on a working token is treated as revocation.

Both: one API host, tokens keyed per connection, nothing secret in logs.
