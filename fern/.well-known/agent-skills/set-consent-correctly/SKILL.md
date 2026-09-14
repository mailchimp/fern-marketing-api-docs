---
name: set-consent-correctly
description: Use when adding or updating Mailchimp contacts from a signup form, checkout, CRM sync, or any flow where a person chose whether to receive marketing email or SMS, and you need to record that choice without overwriting consent they already gave.
---

# Set consent correctly

Writing a contact through the Marketing API is a consent event. The value you
send becomes your record of what the person agreed to, so it has to reflect
something they actually did: a checkbox they ticked, a form they submitted, a
keyword they texted.

Mailchimp does not send on consent alone. It derives a subscription status from
the consent you supply, the audience's opt-in configuration, and whether the
contact is reachable on that channel. You record consent; Mailchimp decides
deliverability. For the domain model behind this, see
[Audiences](/marketing/concepts/audiences/overview).

## Which endpoint

Record **email** consent through `/lists/{list_id}/members`. Record **SMS**
consent through the [audiences endpoints](/marketing/api-concepts/audiences-endpoints-beta),
which are in beta and carry their own terms of use; they are the only surface
that handles SMS consent.

Do not record marketing consent through the e-commerce endpoints. Writing a
customer or an order upserts a contact, so order ingestion changes subscription
status as a side effect, and an `opt_in_status` of `false` will not downgrade
someone who is already subscribed. Use e-commerce endpoints for purchase data
and the audience endpoints for consent.

## Write the status you want

Use PUT with a `subscriber_hash`, and send `status_if_new` rather than `status`:

```
PUT /3.0/lists/{list_id}/members/{subscriber_hash}
```

```json
{
  "email_address": "person@example.com",
  "status_if_new": "subscribed",
  "merge_fields": { "FNAME": "Jane" },
  "ip_signup": "203.0.113.10",
  "timestamp_signup": "2026-09-13 10:04:00"
}
```

`subscriber_hash` is the MD5 hash of the lowercased email address.
`status_if_new` applies only when the contact does not exist yet, so a repeat
signup never overwrites a choice the person already made. `status` overwrites
unconditionally; reserve it for the case below, where the person is telling you
their preference changed.

Send `ip_signup` and `timestamp_signup` when you have them. They are your
evidence of when and where consent was given.

## Check the audience's opt-in setting first

The status you send depends on how the audience is configured, so read
`double_optin` from `GET /3.0/lists/{list_id}` before you write.

| Audience | Person opted in | Send | Result |
|---|---|---|---|
| Single opt-in | Yes | `subscribed` | Subscribed immediately |
| Double opt-in | Yes | `pending` | Confirmation email sent; subscribed once they click |
| Either | No | `transactional` | Receives receipts and order notifications, no marketing |

On a double opt-in audience, send `pending` explicitly. Sending `subscribed`
does not trigger the confirmation step, and you end up with a contact marked
subscribed who never confirmed—which is the record you were trying to avoid
creating.

`transactional` is the right value for someone who declined marketing but still
needs receipts. It is not a lesser form of subscribed, and it does not become
subscribed on its own.

## An unchecked box is not an unsubscribe

A person leaving the marketing checkbox unticked has not asked to be removed;
they have declined to opt in. Those are different events and no upsert performs
the second one.

When someone does withdraw consent, say so directly:

```
PATCH /3.0/lists/{list_id}/members/{subscriber_hash}
```

```json
{ "status": "unsubscribed" }
```

This is the one case for `status` over `status_if_new`. Act on it promptly:
withdrawal is time-sensitive under most regimes that govern marketing email.

## Marketing permissions

If the audience has marketing permissions enabled, the consent checkbox should
also map to a permission entry. Read the IDs from an existing contact or from
`GET /3.0/lists/{list_id}/members`, then send:

```json
{
  "marketing_permissions": [
    { "marketing_permission_id": "abc123", "enabled": true }
  ]
}
```

These are per-audience and the IDs differ between audiences, so do not hardcode
them.

## Before you ship

- Consent comes from a real action by the person, never inferred from a purchase
  or an account signup.
- `status_if_new` on create paths; `status` only for a stated change.
- `pending` on double opt-in audiences, `subscribed` on single.
- Email consent and SMS consent are separate records. Agreeing to one says
  nothing about the other, and SMS carries stricter rules.
