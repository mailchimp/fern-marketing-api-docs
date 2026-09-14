---
name: run-bulk-jobs
description: Use when a Mailchimp Marketing API job is too large for one request—importing or updating thousands of contacts, pulling bulk report data, or any loop that would run for minutes—and you need to pick between the bulk endpoints, poll a batch without becoming a rate-limit problem, and tell a partially failed job from a successful one.
---

# Run a bulk job safely

Three limits shape every large job on the Marketing API: calls time out at 120
seconds, you get 10 simultaneous connections, and `POST /3.0/batches` is
asynchronous, so its response tells you a job started rather than that it
worked. [Rate limits and timeouts](/marketing/api-concepts/rate-limits-and-timeouts)
and [Batch operations](/marketing/api-concepts/batch-operations) carry the
numbers and the batch mechanism. This skill covers choosing the right endpoint,
polling it, and reading the result.

The job to avoid is the one that parallelizes into `429`s and then reports
success on a batch where a third of the operations failed.

## Pick the endpoint before you write the loop

Three shapes of bulk write exist, and they are not interchangeable.

| Approach | Use when | Returns |
|---|---|---|
| A loop of single calls | Under a few hundred records, or you need each result immediately | Per-call responses |
| `POST /3.0/lists/{list_id}` | Adding or updating contacts on one audience, 500 or fewer per call | Per-address results in the same response |
| `POST /3.0/batches` | Thousands of operations, mixed methods or paths, or a job that would exceed 120 seconds | A batch ID to poll |

`POST /3.0/lists/{list_id}`, batch subscribe or unsubscribe, is the one people
miss. For contact imports it takes up to 500 members per call and returns
`new_members`, `updated_members`, and `errors` synchronously, so an
8,000-contact import is 16 calls you can read the results of directly. Send
`update_existing: true` to make a re-run safe; without it, addresses already on
the audience come back as errors.

Reach for `POST /3.0/batches` when the work does not fit that shape: operations
against different paths, methods other than a member upsert, or a volume where
you would rather hand the job to Mailchimp than hold a connection open.

The two 500s are unrelated, and conflating them produces oddly shaped code.
`POST /3.0/lists/{list_id}` caps at 500 members **per call**. The batch
endpoint's 500 is a cap on **pending batch requests** across your account.
There is no documented cap on operations inside a single batch; the worked
example in [Batch operations](/marketing/api-concepts/batch-operations) submits
1,000 in one call.

## Do not parallelize to go faster

The limit is 10 simultaneous connections, and it is per user, not per API key
or per client. Issuing a second key or splitting work across processes buys
nothing; those connections land in the same bucket, and the eleventh gets a
[429](/marketing/api-concepts/errors/#error-glossary).

Two consequences worth designing around:

- A request that times out on your side may still be running on Mailchimp's,
  holding its connection. Retrying a timeout immediately narrows the pool
  you have left, which is how one slow request turns into a run of `429`s.
- At high volume you can get a `429` or `403` with no JSON body, so a handler
  that parses the body to decide whether to retry will throw on the response
  that most needs handling. Branch on the status code.

Keep concurrency well under 10 and leave headroom for anything else using the
account. Back off exponentially on `429` with jitter, and cap the retries. If
you are at the limit often enough that backoff is doing real work, the job
wants the batch endpoint rather than a bigger pool.

## Poll on a backoff, not a fixed interval

`POST /3.0/batches` returns a batch ID. Poll
[`GET /3.0/batches/{batch_id}`](/marketing/api/batches/get) for `status`, which
moves through `pending`, `preprocessing`, `started`, `finalizing`, and
`finished`. Results are only available at `finished`.

A tight poll loop is itself a rate-limit problem: every poll holds one of your
10 connections, and a batch that takes 20 minutes polled every second is 1,200
requests that displace the work you are trying to do. Start around 5 seconds,
double up to a ceiling of a minute or so, and set an overall deadline so a
wedged job fails loudly instead of looping forever.

Poll only when a person or process is waiting. For anything recurring, create a
[batch webhook](/marketing/api/batch-webhooks/create) and let Mailchimp tell you
the job finished. Two constraints come with them: the callback URL is validated
with a GET before the webhook is accepted, so the endpoint has to answer GET as
well as POST, and 500 pending batch webhook events throttle new batch creation,
which surfaces as a `429` on submit rather than on the webhook. The
`subscribe-to-webhooks` skill covers handler-side verification and idempotency.

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

Set `operation_id` to your own record's identifier when you build the batch.
It is the only value that maps a result back to the row it came from, and
operations are not guaranteed to run in order, so position tells you nothing.

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
- Concurrency stays under 10, with backoff on `429` that branches on status
  code rather than response body.
- Timeouts are not retried immediately.
- Polling backs off and has a deadline; recurring jobs use a batch webhook.
- Success requires `errored_operations` of 0, not just `status: "finished"`.
- `operation_id` carries your own record identifier.
- Retries cover only the failed subset, split by status code.
