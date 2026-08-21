# Tier 4 — Release notes and deprecations

Strict register, with one exception: a genuinely new capability may be introduced in Tier 1 warmth for a single sentence before dropping back to plain.

Release notes are read two ways: skimmed on publication, and searched months later by someone asking "when did this change?" Write for the second reader.

Breaking changes and deprecations are pure Tier 4. Someone's integration is going to break, and the only kind thing to do is be exact.

---

## Example 1: A new feature

### Before

> ## Exciting New Features!
>
> We're thrilled to announce that we've been hard at work improving the Marketing API! This release brings a host of powerful new capabilities that will transform how you work with audiences. We can't wait to see what you build!

### After

> ## March 2026
>
> ### Added
>
> **Bulk tag operations on the segments endpoint.** You can now add or remove up to 500 contacts from a tag in a single request, instead of one call per contact.
>
> ```
> POST /lists/{list_id}/segments/{segment_id}/members
> ```
>
> Existing single-contact calls continue to work unchanged.

### What changed and why

- Cut the entire announcement paragraph. "We're thrilled," "hard at work," "a host of powerful new capabilities," "transform how you work," "can't wait to see what you build." Every clause is content-free.
- Replaced the vague heading with a date. Release notes are a chronological record; the date is the primary key.
- Added `Added` as a change-type heading. Use a consistent set: **Added**, **Changed**, **Fixed**, **Deprecated**, **Removed**.
- Stated the actual improvement with its actual number: 500 per request instead of one per call.
- Showed the endpoint.
- Added the backward-compatibility note, which is the first question any existing integrator has.
- Bold on the lead phrase is correct here: each entry is effectively a definition-list term (§5).

---

## Example 2: A breaking change

### Before

> ## Important Update
>
> Please be aware that we'll be making some changes to how the members endpoint handles status updates. This shouldn't affect most users, but you may want to review your integration just in case. The change will roll out over the coming months.

### After

> ## Changed
>
> **Breaking: `PUT /lists/{list_id}/members/{subscriber_hash}` no longer resubscribes `unsubscribed` contacts.**
>
> Effective **1 June 2026**, a PUT request that sets `status` to `subscribed` for a contact whose current status is `unsubscribed` returns `400` instead of resubscribing them. Contacts who have opted out must opt back in themselves.
>
> To keep working after 1 June:
>
> - Check the contact's current status before the PUT, and skip contacts who are `unsubscribed`.
> - Or use `status_if_new` to set status only for contacts who don't already exist.
>
> Requests made before 1 June behave as they do today.

### What changed and why

- "Important Update" is not a change type, and "Please be aware" is not information.
- **Labeled it "Breaking" in the first three words.** A breaking change that doesn't announce itself as breaking is a broken integration and a support ticket.
- Cut "This shouldn't affect most users." The reader cannot act on a probability estimate about themselves. Tell them precisely which calls change and let them check.
- Replaced "over the coming months" with a hard date, twice. Vague timing in a deprecation notice is the cruelest thing in technical writing.
- Named the exact endpoint, the exact precondition, and the exact new response code.
- Gave two concrete migration paths.
- Added the compliance reason in one sentence. For a change driven by consent rules, the *why* prevents a support ticket arguing about it.
- Bold on the date because it's the scannable payload.

---

## Example 3: A deprecation

### Before

> The old endpoint is being deprecated in favor of a newer, more robust solution. We recommend migrating at your earliest convenience.

### After

> **Deprecated: `GET /reports/{campaign_id}/email-activity` with no pagination.**
>
> Unpaginated requests to this endpoint are deprecated and will return `400` after **1 September 2026**. Pass `count` and `offset`; maximum `count` is `1000`.
>
> The endpoint itself is not going away. Only the unpaginated form is.

### What changed and why

- `robust` cut. "In favor of a newer solution" cut; it named nothing.
- "At your earliest convenience" replaced with the date the calls start failing. That's the only timing information that matters.
- Stated what to do (`count` and `offset`) and the bound (`1000`).
- **Added the clarifying negative.** "The endpoint itself is not going away" prevents a panicked migration that wasn't needed. When a deprecation is narrower than it sounds, say so explicitly.

---

## Release note rules

**Date every entry.** Month-level headings, newest first.

**Use a fixed vocabulary of change types:** Added, Changed, Fixed, Deprecated, Removed.

**Label breaking changes as breaking, first.**

**Every deprecation needs a hard date and a migration path.** No "soon," no "in a future release," no "at your earliest convenience."

**Name the exact endpoint, parameter, or field.** In code formatting.

**Say what does *not* change.** It's often the most reassuring and most-needed sentence.

**Don't editorialize about your own release.** No "exciting," no "we're thrilled," no "long-awaited." The change is the news.

**Fixed entries should say what was broken.** "Fixed an issue with the campaigns endpoint" is useless; "`GET /campaigns` returned `create_time` in the account's local timezone instead of UTC" lets a reader recognize a bug they've been working around.
