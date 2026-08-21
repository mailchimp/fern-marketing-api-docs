# Tier 3 — Endpoint and parameter reference

Dry. Terse and factual. No warmth, no humor, no "why" unless the behavior is genuinely surprising.

Reference pages get read in fragments by someone who is mid-task and impatient. They are also increasingly read by machines. Both audiences want the same thing: predictable structure and no prose to wade through.

**The revisions in this file are mostly deletions.** If an "after" looks plainer than the "before," that is the correct outcome, not a loss of brand.

---

## Example 1: Endpoint description

### Before

> This powerful endpoint allows you to seamlessly retrieve a comprehensive list of all the audiences in your Mailchimp account, giving you complete visibility into your contact data and empowering you to build robust integrations.

### After

> Returns all audiences in the account, with pagination.

### What changed and why

- 34 words to 8. Nothing informative was lost.
- Cut `powerful`, `seamlessly`, `comprehensive`, `empowering`, and `robust`: five banned words in one sentence, which is what generated reference prose usually looks like.
- "allows you to retrieve" → "Returns." Endpoint descriptions start with a verb describing what the endpoint does, not what it permits the reader to do.
- Cut the benefit clause entirely. "Complete visibility into your contact data" is a marketing claim and doesn't belong in technical prose (rule 9).
- Added "with pagination," which is a fact the reader needs and the original omitted while spending 34 words.

---

## Example 2: Endpoint description with a real caveat

### Before

> Delete a list. Please note that this action is permanent and cannot be undone, so it's crucial to be absolutely certain before proceeding!

### After

> Permanently deletes an audience and all of its contacts. This cannot be undone; contacts are not recoverable and their subscription history is lost.

### What changed and why

- Cut "Please note that" and `crucial` and the exclamation point.
- Removed "be absolutely certain before proceeding." Reference docs state consequences; they don't counsel.
- **Added scope information the original hid**: it deletes the contacts too, and the history is gone. The original's alarm was vague; the revision's is specific. A destructive endpoint's description should say exactly what is destroyed.
- Semicolon joins two related independent clauses, per §4.
- This is the exception where a Tier 3 page carries a warning. Keep it factual, and never soften it.

---

## Example 3: Parameter descriptions

### Before

> - **`count`** — This parameter allows you to specify the number of records that you would like to have returned in the response.
> - **`offset`** — This is used for specifying how many records you'd like to skip over.
> - **`fields`** — A powerful parameter that lets you limit the response to only the fields you need!
> - **`exclude_fields`** — This one does the opposite.

### After

| Parameter | Description |
|---|---|
| `count` | The number of records to return. Maximum `1000`, default `10`. |
| `offset` | The number of records to skip. Default `0`. |
| `fields` | A comma-separated list of fields to include in the response. Mutually exclusive with `exclude_fields`. |
| `exclude_fields` | A comma-separated list of fields to omit from the response. Mutually exclusive with `fields`. |

### What changed and why

- Removed "This parameter allows you to," "This is used for," "A powerful parameter that lets you." Parameter descriptions begin with a noun phrase naming what the value *is* (§4).
- Made all four grammatically parallel. Sibling parameters should read as a set; inconsistent structure makes a table harder to scan than the content justifies.
- Fixed "This one does the opposite," which forces the reader to hold the previous row in their head. Every row must stand alone, because readers arrive by search and by anchor link.
- Added the bounds (`1000`, `10`, `0`) and the mutual exclusivity. Constraints are the whole reason someone reads a parameter table (rule 10).
- Dropped the em dashes; a table column does that work.
- Removed the bold-plus-dash pattern in favor of a real table.

---

## Example 4: Response field descriptions

### Before

> The response object contains a `total_items` field, which represents the total number of items that matched your query, and a `_links` array, which serves as a collection of navigation links related to the resource.

### After

| Field | Type | Description |
|---|---|---|
| `total_items` | integer | The total number of matching records, ignoring `count` and `offset`. |
| `_links` | array | HATEOAS-style navigation links for this resource. |

### What changed and why

- Replaced `represents` and `serves as` with direct statements (§5).
- Converted prose to a table. Response fields are structured data and should look like it.
- Added the type column.
- Added "ignoring `count` and `offset`." The actual question a developer has about `total_items` is whether it reflects the page or the whole result set, and the original prose didn't answer it.

---

## Tier 3 checklist

- Does every description start with a verb (endpoints) or a noun phrase (parameters and fields)?
- Are sibling items grammatically parallel?
- Does every item stand alone without its neighbors?
- Are all bounds, defaults, maximums, and mutual exclusions stated?
- Is there any warmth, humor, benefit language, or second-person encouragement? Delete it.
- Is anything hedged that should be stated flatly?
