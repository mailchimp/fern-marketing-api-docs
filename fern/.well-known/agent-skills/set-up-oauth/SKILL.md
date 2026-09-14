---
name: set-up-oauth
description: Use when implementing Mailchimp OAuth 2 in an application that connects other people's Mailchimp accounts, including the authorize redirect, the callback and code exchange, and storing access tokens for one or many connected accounts.
---

# Set up OAuth

OAuth 2 is how your application calls the Marketing API on behalf of someone
else's Mailchimp account. The protocol is the standard authorization code flow,
and [OAuth 2](/marketing/api-concepts/authentication/oauth-2) explains how
Mailchimp implements it. [Set up an OAuth app](/marketing/build/start-developing/set-up-an-oauth-app)
has working samples in four languages.

This skill covers the parts that pass code review and then fail in production:
the `state` parameter the samples leave out, the datacenter prefix that older
integrations resolve and current ones must not, what to persist per account, and
how a token behaves when there is no expiry to lean on.

## Add a state parameter

The documented samples omit `state`, so add it yourself. Without it your
callback accepts any `code` delivered to it, which lets an attacker complete an
authorization they started and bind their Mailchimp account to your user's
session.

Generate an unguessable value, store it server-side against the session, and
send it on the authorize redirect:

```
https://login.mailchimp.com/oauth2/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=YOUR_REDIRECT_URI
  &state=RANDOM_PER_SESSION_VALUE
```

On the callback, compare the returned `state` to the stored one before you spend
the `code`:

```javascript
app.get("/oauth/mailchimp/callback", async (req, res) => {
  const { code, state } = req.query;
  const expected = req.session.mailchimpOAuthState;
  delete req.session.mailchimpOAuthState;

  if (!expected || state !== expected) {
    return res.status(400).send("Invalid OAuth state");
  }
  // Exchange the code only after state checks out.
});
```

Compare with a constant-time function if your language offers one. Clear the
stored value whether the check passes or fails, so a `state` cannot be replayed.

## Exchange the code server-side

The token exchange carries your `client_secret`, so it happens server to server.
POST to `https://login.mailchimp.com/oauth2/token` with `grant_type`,
`client_id`, `client_secret`, `redirect_uri`, and `code`.

A `code` is single-use and short-lived. If the exchange fails, send the user
back through the authorize step rather than retrying with the same `code`.

## Persist the access token

The response carries the access token in `access_token`. That is the one value
you store per connected account. Store it against your own user or workspace
record, encrypted at rest, and send it as a bearer token to
`https://api.mailchimp.com/3.0/`, the same host for every account.

Never log the token, the `code`, or the `client_secret`. The samples in
[Set up an OAuth app](/marketing/build/start-developing/set-up-an-oauth-app)
print the token to the console and render it in the response body to show the
flow working; both are demonstration code, and neither belongs in your
application.

## There is no datacenter prefix to resolve

Older Mailchimp integrations sent requests to a per-account host like
`https://us6.api.mailchimp.com/3.0/`, and derived that prefix either from the
suffix on an API key or from an OAuth metadata call. Do not carry that pattern
into new code. The Marketing API host is `https://api.mailchimp.com/3.0/` for
every account, so there is no prefix to look up, nothing to store beside the
token, and no metadata request between the code exchange and your first API
call.

If you are adapting an existing integration, remove the stored prefix and the
metadata step rather than leaving a column nothing reads.

To label the connection you just made, or to detect that an account is already
connected, call `GET /3.0/` with the new token. It returns `account_id`,
`account_name`, `login_id`, and `email`, which is what you need to identify the
account and to dedupe against connections you already hold. That replaces the
metadata call.

## Handle revocation, because there is no refresh

Mailchimp access tokens have no expiry and there is no `refresh_token`. A token
stays valid until the user revokes your application's access or is removed from
the account, so a token that stops working has been revoked. Retrying fails.
Mark the connection as disconnected and prompt the user to authorize again.

When a user disconnects or uninstalls your application, delete their access
token and any syncing configuration tied to that connection.

## Scope storage per account

Each authorization produces its own token, and a single person may connect more
than one Mailchimp account. Key tokens by connection rather than by your own
user, and resolve the token from the connection the request concerns.

One process-wide client configured with a single token is the common mistake
here. It works with one connected account in development and sends the wrong
account's token once there are two. Construct the client per request, or key
your clients by connection.

## Before you ship

- `state` is generated per session, validated on callback, and cleared after.
- The code exchange happens server-side, and a failed exchange restarts the flow.
- Tokens are encrypted at rest and absent from logs and responses.
- A `401` on a previously working token is treated as revocation, not a retry.
- Tokens are keyed per connected account, not held in one shared client.
- Requests go to `https://api.mailchimp.com/3.0/`, with no per-account host and
  no metadata call.
