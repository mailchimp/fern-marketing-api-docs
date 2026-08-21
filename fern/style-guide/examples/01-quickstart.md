# Tier 1 — Quickstarts and overviews

Warm register. Second person, contractions, one light touch of personality at most. The reader is deciding whether this API is worth their afternoon.

---

## Example 1: The opening paragraph

### Before (generated, AI-tells)

> Welcome to the Mailchimp Marketing API! Let's dive in and explore everything this powerful platform has to offer. Whether you're building your first integration or scaling to millions of contacts, the Marketing API serves as your gateway to intelligent, seamless marketing automation. Ready to get started? Let's break it down.

### After

> This guide gives you everything you need to start using the Mailchimp Marketing API: managing audiences, controlling automation workflows, and syncing email activity with your database. We'll generate your API key, install a client library, and make your first call—a request to the Ping endpoint.

### What changed and why

- Cut "Welcome to" and the exclamation point. Enthusiasm isn't warmth.
- Removed "Let's dive in," "Let's break it down," and "Ready to get started?"—all banned transitions, and two of them in one paragraph is a strong AI tell (§5).
- Removed `powerful`, `seamless`, and `intelligent` (banned vocabulary).
- Replaced "serves as your gateway to" with concrete deliverables. "Serves as" is always replaceable (§5).
- Cut "Whether you're X or Y"—a false range that flatters the reader without informing them.
- The em dash before "a request to the Ping endpoint" is closed up and marks a genuine appositive break, so it earns its place (§4).
- Result is shorter and says more. That trade is almost always available.

---

## Example 2: A step with a warning

### Before

> Click **Create New Key**. It's crucial that you copy this key immediately! Your API key is incredibly powerful — it unlocks full access to your entire account. Think of it like the master key to your house. You'll definitely want to keep it safe.

### After

> Click **Create New Key** and give it a descriptive name that will remind you which application it's used for. Copy the generated key immediately and store it somewhere secure. You won't be able to see it again after you finish generating it.
>
> Your API key provides full account access, so treat it like a password. Mailchimp doesn't support client-side calls using CORS requests, and you shouldn't use API keys in mobile apps.

### What changed and why

- Cut `crucial`, `incredibly powerful`, and metaphorical `unlocks` (banned vocabulary).
- Removed "Think of it like the master key to your house." Banned framing, and the simile is doing no work that "treat it like a password" doesn't do better and shorter.
- Fixed the spaced em dash (`powerful — it`) by restructuring into two sentences.
- Replaced the vague warning with the actual consequence: you can't see the key again. That's the fact the reader needs.
- Added the CORS and mobile constraints. A security warning that doesn't tell you what not to do is decoration.
- "Treat it like a password" survives because it's a precise comparison, not an announced analogy.

---

## Example 3: A "next steps" section

### Before

> ## In Conclusion
>
> Congratulations! You've successfully made your first API call. You're now ready to embark on your journey with the Mailchimp Marketing API. The possibilities are endless — from building audiences, to crafting campaigns, to unlocking powerful insights about your customers. Where you go next is up to you!

### After

> ## Next steps
>
> You're making authenticated requests, so you're ready to build something real. Two good places to go next:
>
> - [Create your first audience](#) walks through adding contacts and managing subscription status.
> - [Methods and parameters](#) covers the conventions you'll hit across every endpoint: pagination, filtering, and partial responses.

### What changed and why

- "In Conclusion" is a banned signposted conclusion, and it's title case. Replaced with a sentence-case functional heading.
- Cut "Congratulations!" and "embark on your journey." Nothing was accomplished that deserves a parade; a ping succeeded.
- Removed the padded tricolon ("from building audiences, to crafting campaigns, to unlocking powerful insights") plus its spaced em dash and `unlocking`.
- Replaced "The possibilities are endless" and "Where you go next is up to you" with two actual links. A next-steps section that doesn't point anywhere has failed at its only job.
- Links sit on descriptive text, not "here" (§4).
- Note the deliberate choice of two items rather than three. Three would have meant inventing a third (§5, tricolon abuse).

---

## Where Tier 1 personality is allowed

The existing quickstart already does this correctly:

> If everything was set up correctly and the request to `ping` was successful, the response should look like this:
>
> ```json
> {
>    "health_status": "Everything's Chimpy!"
> }
> ```

The delight is in the product, and the prose just points at it without nudging the reader. Don't add "fun, right?" Let it land on its own.

Also correct:

> Hitting this endpoint acts as a health check on the Mailchimp API service; it won't affect your account in any way.

The semicolon is doing exactly the work §4 describes, and the second clause answers the reader's actual worry before they voice it. This is what warmth looks like in documentation: anticipation, not enthusiasm.
