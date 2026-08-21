# Tier 2 — Conceptual guides

Neutral-helpful. This tier explains *why*. The reader wants a working mental model of how something behaves before they write code against it. Contractions are fine; jokes are not.

Conceptual pages are where Mailchimp's "translator" voice principle matters most, and where our current docs are strongest when they remember to explain themselves.

---

## Example 1: Explaining a surprising design decision

This is the single best passage in the current docs. It's the model for the whole tier.

### Keep as-is (annotated)

> When making a call for information about a particular contact, the Marketing API uses the MD5 hash of the lowercase version of the contact's email address. We use the MD5 hash because it makes it less likely to leak email addresses—these hashes can't be translated back to an email address, so if your API calls were leaked in some manner, your users' email addresses remain unexposed.
>
> You also don't need to maintain a mapping from your contact to Mailchimp's internal contact ID in your application's data store, or make additional calls to the API to look up that mapping. Calculating the MD5 hash of the lowercase version of your user's email address lets you use the email address as a canonical identifier that's shared across your data model and Mailchimp's.

### Why this works

- It states the surprising behavior, then immediately answers "why" **twice**: once for security, once for developer convenience. Rule 5 and rule 11 of the core guide, executed well.
- "We use the MD5 hash because" is correct first-person-plural usage: this is Mailchimp explaining a Mailchimp decision.
- The em dash after "email addresses" is closed up and marks a real break into explanation.
- No banned vocabulary, no announced analogy, no padding.
- One small edit applied above: the original wrote "Simply calculating the MD5 hash." `Simply` is deleted per §5—it tells the reader their difficulty is their own fault.

---

## Example 2: An intro that leans on banned patterns

### Before (real prose from the tags guide, lightly condensed)

> Tags are organizational labels that help structure your Mailchimp audience management strategy. You can leverage tags to structure campaigns for specific audiences, map tags directly from your CRM into Mailchimp, and convert customer behaviors into actionable tags for targeting.

### After

> Tags are labels you apply to contacts. Unlike segments, which Mailchimp builds for you from subscription dates and engagement history, tags hold whatever categorization you bring from your own systems—a CRM field, a spending threshold, a campaign name like `Holiday Send`.
>
> Because you define them, tags are the right tool when your targeting logic lives outside Mailchimp and needs to come along with your contact data.

### What changed and why

- `leverage` → gone. It's the most common single AI tell in technical prose (§5).
- Cut "help structure your audience management strategy." That phrase has no referent; it's three abstract nouns in a row.
- `actionable` cut as marketing vocabulary.
- The original was a padded tricolon of use cases. Replaced with a **definition by contrast**: tags versus segments. A conceptual page's job is to build a mental model, and contrast does that faster than a list of examples.
- Added the "because you define them" sentence, which answers *when should I reach for this*, the question a developer actually has on a concepts page.
- The em dash before "a CRM field" is closed up and introduces a genuine list of appositives.

---

## Example 3: A conventions page that forgot to explain

### Before

> ### Pagination
>
> It's worth noting that pagination is a crucial part of working with the API. We use `offset` and `count` in the URL query string. The maximum value for `count` is `1000` and the default value is `10`. If not included, `offset` defaults to `0`.

### After

> ### Pagination
>
> Use `offset` and `count` in the query string to request data in manageable chunks. We chose offset-based pagination over cursors because it lets you jump directly to any page of results rather than walking through them in order.
>
> `count` has a maximum of `1000` and defaults to `10`. `offset` defaults to `0`. To get the first ten results, set `count=10` and `offset=0`; for the next ten, keep `count=10` and set `offset=10`.
>
> The API times out after 120 seconds. If you're pulling a large data set, smaller pages will keep you under that limit—or send the work to the [Batch endpoint](#) instead.

### What changed and why

- Cut "It's worth noting that" (banned transition) and `crucial` (banned vocabulary). Both were pure filler; the sentence that remained said nothing, so it was cut too.
- Added the *why*: offset-based instead of cursor-based, and what that buys you. This is the tier's whole purpose and the original omitted it.
- Kept the concrete numbers and moved them together, since a developer scanning for limits shouldn't have to read prose to find them.
- Surfaced the 120-second timeout **here**, connected to pagination as a solution. In the original docs this fact lives in a separate note; the connection between "large request" and "timeout" is the useful part.
- The em dash before "or send the work" is closed up and marks a real alternative.
- Semicolon in the offset example separates two independent clauses, exactly per §4.

---

## Tier 2 anti-patterns to watch for

**Don't explain HTTP.** The current methods page includes "Make a GET request to retrieve data. GET requests will never cause an update or change to your data because they're safe and idempotent." The idempotency link is worth keeping; the definition of GET is not. Core guide rule: never over-explain what a competent engineer already knows.

**Don't announce structure.** No "In this section, we'll cover three things." Just cover them.

**Don't hedge the awkward parts.** When our naming is confusing, name it. The tags guide's admission that the endpoint says `segments` because tags used to be called static segments is exactly right, and it saves a developer twenty minutes of doubting themselves.
