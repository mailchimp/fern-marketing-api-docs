---
name: subscribe-to-webhooks
description: Use when building a Mailchimp webhook integration—creating a webhook through the API, verifying delivery signatures, or keeping an external database in sync with an audience—and you need the handler to survive duplicate deliveries and avoid echoing your own writes back at yourself.
---

# Subscribe to webhooks

Mailchimp webhooks are HMAC-signed, at-least-once deliveries of audience
events. Three properties drive every decision below: the signing secret is
returned once and never again, the same event can arrive more than once, and a
handler that writes back to the audience can trigger itself.

For verification code, the delivery timeout, and the 75-minute retry window,
see [Webhooks](/marketing/api-concepts/webhooks). This skill covers the order
you do things in.

## Capture the signing secret on the create call

`signing_secret` comes back in the create response and is never retrievable
again. Read it and store it in the same step that creates the webhook:

```
POST /3.0/lists/{list_id}/webhooks
```

```json
{
  "url": "https://example.com/webhooks/mailchimp",
  "events": { "subscribe": true, "unsubscribe": true, "upemail": true },
  "sources": { "user": true, "admin": true, "api": false }
}
```

The response carries `id`, `signing_enabled`, and the plaintext
`signing_secret`. Write that value to your secret store before you do anything
else with the response.

The `ListWebhooks` schema lists `signing_secret` on GET responses as well as
on create, which makes re-fetching look possible. It is not populated there.
If you lose the secret, the only recovery is `DELETE` the webhook and create a
new one, which issues a new secret and changes nothing else.

## Verify against the raw body

The signed string is `{timestamp}.{raw_body}`, keyed with the signing secret,
hex-encoded, and delivered as `X-Mailchimp-Signature: t={timestamp},v1={hex}`.
Reject a delivery whose timestamp is more than 5 minutes old, and compare with
a timing-safe function. [Webhooks](/marketing/api-concepts/webhooks) has
working implementations in four languages; do not reconstruct this from
memory, because a near-miss verifies nothing and looks like a bad secret.

Compute the HMAC over the exact bytes Mailchimp sent. Deliveries are
`application/x-www-form-urlencoded`, and any middleware that reads the body
before your handler leaves you verifying a re-serialized copy that no longer
matches the signature.

This is the most common way a correct implementation fails, and it fails
looking like a wrong secret. In Express, capture the raw buffer on the webhook
route and register it ahead of any app-wide parser:

```javascript
app.post("/webhooks/mailchimp",
  express.raw({ type: "application/x-www-form-urlencoded" }),
  (req, res) => {
    // req.body is a Buffer: verify it, then parse it.
  }
);

app.use(express.urlencoded({ extended: true }));
```

Parse the body only after the signature checks out. The same ordering rule
applies to every framework: verify bytes, then parse.

Reject a delivery that arrives without the header. A webhook created before
signing existed sends unsigned deliveries, and `signing_enabled` on the
webhook tells you which kind you have. Treat a missing header as a failed
verification rather than a reason to skip it, or an unsigned POST to a URL
someone guessed becomes an accepted event.

## Expect duplicates

Retries mean a handler can see the same event several times, and a delivery
that times out at 10 seconds is retried even though it ran to completion. Make
the write idempotent.

There is no delivery-ID header, so build the key from the payload. `type`,
`data.id`, and `fired_at` identify an event; store it and drop what you have
already applied.

Return 200 as soon as the signature verifies and hand the work to a queue.
Anything slower than 10 seconds guarantees the duplicates you are trying to
handle.

## Keep your handler from triggering itself

A handler that writes back to the audience causes the audience change that
fires the webhook again. Set `sources.api` to `false` when the same integration
both receives events and writes contacts:

| Source | Fires on | Set `true` when |
|---|---|---|
| `user` | Signup forms, preference pages, the contact's own actions | Nearly always |
| `admin` | Changes made in the Mailchimp web app | You want dashboard edits mirrored |
| `api` | Changes made through the API, including your own | Another system writes and you must see it |

With `sources.api` set to `false`, your writes stop coming back. If you need
API-sourced events because a second system writes to the same audience, keep
them on and make the handler skip events whose state already matches what you
hold—a write that changes nothing sends nothing.

Send all three values on every create call. The API does not document what an
omitted `sources` resolves to, so leaving it out makes whether you loop a
property of the default rather than of your code.

## List webhooks or batch webhooks

They answer different questions. `/3.0/lists/{list_id}/webhooks` reports
audience events: subscribes, unsubscribes, profile updates, email changes.
`/3.0/batch-webhooks` reports that a batch operation finished, and carries no
audience data. If you submit batch jobs and also track contact changes, you
need both.

Creating a batch webhook validates the callback URL with a GET before
accepting it, so that endpoint has to answer GET as well as POST. See
[Batch operations](/marketing/api-concepts/batch-operations) for the rest.

## Before you ship

- The secret is read from the create response and stored in the same step.
- Signature verification runs on the raw bytes, before any body parsing.
- A delivery with no signature header is rejected, not waved through.
- Events are deduplicated on `type`, `data.id`, and `fired_at`.
- `sources` is sent explicitly, with `api` set for the direction you want.
- The handler returns 200 in under 10 seconds and queues the work.
- A batch webhook endpoint answers GET as well as POST.
