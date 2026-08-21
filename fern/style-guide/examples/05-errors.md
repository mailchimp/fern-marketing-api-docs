# Tier 4 — Errors, troubleshooting, and limits

Strictest tier. The reader is blocked, possibly at 2am, possibly with a production incident open. Every word between them and the fix is a cost.

**Structure for every error entry: what happened, why it happened, what to do.** In that order. Nothing else.

No humor. Not dry humor, not a light touch, none. This is the one place where Mailchimp's brand personality is simply the wrong tool, and using it here reads as indifference to the reader's problem.

---

## Example 1: An error entry

### Before

> ### 401 Unauthorized
>
> Uh oh! It looks like something went wrong with your authentication. This usually means that the API key you're using isn't quite right. Don't worry though — this is one of the most common errors and it's usually a quick fix! Double-check that you've copied your key correctly and that you're using the right server prefix. Still stuck? Reach out to our support team and we'll be happy to help.

### After

> ### 401 Unauthorized — API key invalid or disabled
>
> Your API key is missing, malformed, revoked, or belongs to a disabled account.
>
> 1. Confirm the key is passed as the password in HTTP Basic auth, with any non-empty string as the username.
> 2. Confirm the server prefix in the URL matches the key's account. A key from `us19` will not authenticate against `us6`.
> 3. Check whether the key was revoked in your account's API Keys page.
>
> If all three check out, contact support with the full request, the error code, and the response body.

### What changed and why

- Cut "Uh oh!", "Don't worry though," and "Still stuck?" This is the exact register to avoid. A reader debugging a 401 does not want reassurance; they want the cause list.
- Removed "usually means," "isn't quite right," and "usually a quick fix." Hedging in an error page is actively harmful—the reader can't tell whether they're in the common case or not.
- Fixed the spaced em dash. The one in the heading is closed up and separates the code from its short name.
- Replaced "double-check that you've copied your key correctly" with the three things that actually cause a 401, in the order they're worth checking. **The mismatched server prefix is the highest-value item and the original didn't mention it at all.**
- The concrete `us19`/`us6` example replaces abstract advice with something the reader can pattern-match against their own URL in two seconds.
- The support instruction names what to include, so the first support reply isn't a request for more information.

---

## Example 2: A rate limit

### Before

> ### 429 Too Many Requests
>
> You've been sending a lot of requests! Mailchimp limits the number of simultaneous connections in order to ensure a great experience for all of our users. Consider implementing some throttling in your application to stay within our generous limits.

### After

> ### 429 Too Many Requests
>
> You have exceeded one of two limits:
>
> - **10 simultaneous connections** per user
> - **500 pending webhook deliveries** per user
>
> Reduce your connection pool to 10 or fewer and retry with exponential backoff. If you're making many independent calls, send them to the [Batch endpoint](#) instead of parallelizing them.

### What changed and why

- Cut "You've been sending a lot of requests!" Cheerful blame is the worst possible register here.
- Removed "in order to ensure a great experience for all of our users." The reader does not care why the limit exists while they're being throttled, and the justification reads as corporate deflection. Explain limits on the rate-limits concept page, not in the error.
- Cut `generous`. Never characterize your own limits as generous to someone who just hit them.
- **Named both limits with their actual numbers.** The original said "the number of simultaneous connections" without stating it. This is the single most common failure in error documentation.
- Replaced "consider implementing some throttling" with the specific remedy: pool size, backoff, and the batch alternative.
- Bold is used here on the two limit values because they're the scannable payload of the page. This is the definition-list exception in §5, not decorative bolding.

---

## Example 3: A validation error

### Before

> ### 400 Bad Request
>
> Something about your request wasn't quite right. This could be a number of things! Check your JSON syntax, verify your parameters, and make sure everything is formatted correctly.

### After

> ### 400 Bad Request
>
> The request body isn't valid JSON, or the request used an HTTP method the endpoint doesn't accept.
>
> The response's `detail` field names the specific problem. For method errors, note that `X-HTTP-Method-Override` only works on POST requests; sending it with GET, PATCH, PUT, or DELETE returns this error.
>
> For field-level validation failures, expect a `422` with a `errors` array instead of a `400`.

### What changed and why

- Cut "wasn't quite right" and "This could be a number of things!" A 400 page that shrugs is worse than no page.
- Named the two actual causes.
- **Pointed at the `detail` field.** The most useful sentence in any error doc is the one that tells the reader where the specific answer lives.
- Added the `X-HTTP-Method-Override` trap, which is a real and non-obvious cause of 400s in this API.
- Distinguished `400` from `422`. Adjacent error codes must be disambiguated, or readers debug the wrong one.

---

## Tier 4 rules

**Lead with the code and a short name.** `429 Too Many Requests` and then the specific limit. Readers arrive by searching the code.

**State causes as facts, not possibilities.** "Your API key is missing, malformed, revoked, or belongs to a disabled account" beats "this usually means something is wrong with your key."

**Always give the numbers.** Every limit, quota, timeout, and maximum, as a numeral.

**Always give the next action.** An error entry with no remedy is incomplete.

**Point to the machine-readable detail.** If the response carries a `detail` or `errors` field, say so.

**Disambiguate neighbors.** 400 versus 422, 401 versus 403, 404 versus 414.

**Never:** apologize, reassure, exclaim, joke, hedge, blame the reader, or justify the limit.

---

## A note on the `X-Trigger-Error` header

The current docs mention that developers can test error handling with `X-Trigger-Error` and an error name like `APIKeyMissing`. That's genuinely useful and under-advertised. Every error entry should name its trigger value so readers can reproduce it deliberately:

> Test this error by sending `X-Trigger-Error: APIKeyMissing`.

One line, Tier 4 register, high value.
