---
name: run-bulk-jobs
description: Use when a Mailchimp Marketing API job is too large for one request—importing or updating thousands of contacts, pulling bulk report data, or any loop that would run for minutes—and you need to pick between the bulk endpoints, poll a batch without becoming a rate-limit problem, and tell a partially failed job from a successful one.
---

# Run a bulk job safely

Three things shape every large job on the Marketing API: calls time out at 120
seconds, you can hold only 10 connections open at once, and `POST /3.0/batches`
is asynchronous, so its response tells you a job started rather than that it
worked.
[Rate limits and timeouts](https://preview.developer.mailchimp.com/marketing/api-concepts/rate-limits-and-timeouts.md)
and [Batch operations](https://preview.developer.mailchimp.com/marketing/api-concepts/batch-operations.md)
carry the numbers and the batch mechanism. This skill covers choosing the right
endpoint, polling it, and reading the result.

The job to avoid is the one that adds workers until it hits `429`s, then
reports success on a batch where a third of the operations failed.

## Pick the endpoint by shape, not by record count

Record count is the wrong first question; it puts every large job on the batch
endpoint. Ask what the operations look like instead.

| Are the operations... | Use | Returns |
|---|---|---|
| All member adds or updates on one audience | `POST /3.0/lists/{list_id}`, up to 500 members per call | Per-address results in the same response |
| Mixed methods or paths, or work you would rather hand off than hold a connection for | `POST /3.0/batches` | A batch ID to poll |
| Few enough to finish well inside 120 seconds, and you need each result as it lands | A loop of single calls | Per-call responses |

[`POST /3.0/lists/{list_id}`](https://preview.developer.mailchimp.com/marketing/api/lists/batch-subscribe-or-unsubscribe.md),
batch subscribe or unsubscribe, is the one people miss, because the volume
suggests the endpoint named "batch." For contact imports it returns
`new_members`, `updated_members`, and `errors` synchronously, so an
8,000-contact import is 16 calls you read the results of directly, with no
polling and no archive to unpack. Send
`update_existing: true` to make a re-run safe; without it, addresses already on
the audience come back as errors.

Contact imports are also where the status you send matters. A bulk import
asserts consent for every address in it, so decide `subscribed` against
`pending` deliberately rather than per default; the `set-consent-correctly`
skill covers that decision.

Three different 500s appear in this area, and conflating them produces oddly
shaped code:

| 500 | What it limits |
|---|---|
| Members per call to `POST /3.0/lists/{list_id}` | One request's payload |
| Pending batch jobs | How many batches your account can have unfinished at once |
| Pending batch webhook events | Also throttles new batch creation |

None of them caps operations inside a single batch. The worked example in
[Batch operations](https://preview.developer.mailchimp.com/marketing/api-concepts/batch-operations.md)
submits 1,000 in one call.

## The limit counts open connections, not queued work

The 10-connection limit counts requests you are holding open at this instant,
and it is per user rather than per API key or per client. Issuing a second key
or splitting work across processes buys nothing; those connections land in the
same bucket, and the eleventh gets a
[429](https://preview.developer.mailchimp.com/marketing/api-concepts/errors.md#error-glossary).

A submitted batch is not one of those connections. `POST /3.0/batches` returns
as soon as the job is accepted, and the operations then run on Mailchimp's
infrastructure rather than on a connection of yours. You can have many batches
executing at once while holding none open, which is what the batch endpoint is
for: it converts work that would occupy your connections into work that
occupies none. The ceiling on batches in flight is the 500 pending jobs, not
the 10 connections.

So the limit constrains a request loop, not the number of jobs you have
running. When you are issuing calls yourself, keep concurrency well under 10
and leave headroom for anything else using the account. Two things make that
pool smaller than it looks:

- A request that times out on your side may still be running on Mailchimp's,
  holding its connection. Retrying a timeout immediately narrows the pool you
  have left, which is how one slow request turns into a run of `429`s.
- At high volume you can get a `429` or `403` with no JSON body, so a handler
  that parses the body to decide whether to retry will throw on the response
  that most needs handling. Branch on the status code.

Back off exponentially on `429` with jitter, and cap the retries. If backoff is
doing real work, the job wants the batch endpoint rather than a bigger pool.

## Build operations with the body as a string

Each entry in `operations` needs `method` and `path`; `operation_id` and
`body` are optional and you want both. `path` is relative to `/3.0`, and
`body` is a **string** holding the JSON payload, not a nested object:

```json
{
  "method": "PUT",
  "path": "/lists/{list_id}/members/{subscriber_hash}",
  "operation_id": "crm-8815",
  "body": "{\"email_address\":\"person@example.com\",\"status_if_new\":\"subscribed\"}"
}
```

Serializing the payload is a step people skip, because every other JSON API
takes an object here and the field is typed loosely enough that a nested
object does not fail until the operation runs. Send `params` rather than
`body` for GET operations.

Set `operation_id` to your own record's identifier. It is the only value that
maps a result back to the row it came from, and operations are not guaranteed
to run in order, so position tells you nothing.

## Poll on a backoff, not a fixed interval

`POST /3.0/batches` returns a batch ID. Poll
[`GET /3.0/batches/{batch_id}`](https://preview.developer.mailchimp.com/marketing/api/batches/get.md)
for `status`, which moves through `pending`, `preprocessing`, `started`,
`finalizing`, and `finished`. Results are only available at `finished`.

Polling is the one part of a batch job that does consume your connections, and
a tight loop is a rate-limit problem in its own right. Each poll holds a
connection for its duration, and a batch that takes 20 minutes polled every
second is 1,200 requests competing with the work you are trying to do. Start
around 5 seconds, double up to a ceiling of a minute or so, and set an overall
deadline so a wedged job fails loudly instead of looping forever. Polling
several batches at once multiplies this, so back off per job rather than
polling each one hard.

Polling suits a one-off run someone is watching. For a scheduled or recurring
job, create a
[batch webhook](https://preview.developer.mailchimp.com/marketing/api/batch-webhooks/create.md)
and let Mailchimp tell you the batch finished. Two constraints come with them: the
callback URL is validated with a GET before the webhook is accepted, so the
endpoint has to answer GET as well as POST, and pending batch webhook events
throttle new batch creation, which surfaces as a `429` on submit rather than
on the webhook. The `subscribe-to-webhooks` skill covers handler-side
verification and idempotency.

## A finished batch is not a successful batch

This is the failure that ships. `status: "finished"` means Mailchimp ran every
operation, not that any of them worked, and `finished_operations` counts
operations that returned an error. So the obvious completeness check passes on
a job that half-failed:

```
finished_operations == total_operations   // true even when everything errored
```

Read `errored_operations` instead. Treat the job as successful only when the
status is `finished` **and** `errored_operations` is 0; report the count
otherwise.

`errored_operations` tells you how many failed, not which or why. For that,
fetch `response_body_url`, a gzipped tar archive of JSON files holding one
entry per operation:

```json
[
  {
    "status_code": 400,
    "operation_id": "user-8815",
    "response": "{\"title\":\"Invalid Resource\",\"detail\":\"...\"}"
  }
]
```

Two things about that archive catch people out. `response` is a JSON string
that needs a second parse, not a nested object. And there is one file per
operation only until an operation returns paged data, at which point its
responses split across several files, so walk every file in the archive rather
than assuming a fixed layout.

## Retry the failed subset, not the batch

Resubmitting the whole batch re-runs every operation that already succeeded.
Build the retry from the `operation_id`s that failed, and split them by
`status_code` first, because the causes are not alike:

| Status | Meaning | Action |
|---|---|---|
| `429` | Throttled | Resubmit after a backoff |
| `5xx` | Mailchimp-side | Resubmit after a backoff |
| `400`, `422` | The operation is malformed or the data is invalid | Fix the record; resubmitting is a loop |
| `404` | The target does not exist | Fix the path or the record |

A bad email address returns `400` every time it is sent. Blind retries on the
whole failed set turn a reportable data problem into an infinite loop that
still ends with the same records missing.

Keep the archive, or a digest of it, after the job. Once the batch ages out you
lose the only per-operation record of what happened.

## Before you ship

- Endpoint chosen for the job's shape, not the record count alone.
- Open connections stay well under 10 at once, counting polls; submitted
  batches do not count. Backoff on `429` branches on status code rather than
  response body.
- Timeouts are not retried immediately.
- Batch operations send `body` as a JSON string, with `operation_id` set to
  your own record identifier.
- Polling backs off and has a deadline; recurring jobs use a batch webhook.
- Success requires `errored_operations` of 0, not just `status: "finished"`.
- Retries cover only the failed subset, split by status code.
