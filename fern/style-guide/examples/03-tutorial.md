# Tier 2 — Task tutorials

Same register as conceptual guides, different shape. A tutorial has one destination and the reader is following along in a terminal. Every sentence either advances the task or prevents a mistake.

The failure mode here is narration: telling the reader what they're about to do, then doing it, then telling them what they did.

---

## Example 1: Step introduction

### Before

> ## Step 2: Adding Your First Contact
>
> Now that we've successfully created our audience, let's move on to the exciting part — adding contacts! In this step, we'll walk through the process of adding a contact to your newly created audience. Let's break down what you'll need.

### After

> ## Add a contact
>
> Adding a contact takes two values: their email address and a subscription status. Status is the part worth pausing on, because `subscribed` and `pending` behave differently:
>
> - `subscribed` adds the contact immediately. Use it when you already have permission to email them.
> - `pending` sends a confirmation email first, and the contact isn't subscribed until they click through.

### What changed and why

- Cut the entire narration paragraph. "Now that we've... let's move on to... in this step we'll walk through..." is three sentences of scaffolding around zero information.
- Removed "the exciting part" and the exclamation point, plus "Let's break down" (banned transition).
- Dropped "Step 2:" from the heading and made it sentence case. Numbered headings go stale when you reorder a page; the sequence is already visible in the page structure.
- Replaced narration with the actual decision the reader faces. A tutorial step should open with the choice or constraint, not with a transition.
- Added *when* to use each status. `pending` versus `subscribed` is a compliance question as much as a technical one, and the docs should say so.

---

## Example 2: Prerequisites

### Before

> ## Prerequisites
>
> Before we begin this journey, there are a few crucial things you'll need to have in place. First, you'll need an established Mailchimp audience. Second, you'll need your Audience/List ID. Third, you'll need your API credentials, including both your API key and your server prefix.

### After

> ## Before you start
>
> You'll need:
>
> - A Mailchimp audience
> - Your audience's `list_id`, from the audience settings page or the [Lists endpoint](#)
> - Your API key and server prefix
>
> If you don't have an audience yet, [create your first audience](#) first.

### What changed and why

- "Before we begin this journey" and `crucial`: both cut.
- The original is **listicle-in-a-trench-coat** (§5): "First... Second... Third..." written as prose when it's plainly a list. Converted to a real list.
- Added *where to find* the `list_id`. A prerequisite you can't satisfy isn't a prerequisite, it's a dead end.
- Added the escape hatch for readers who don't have an audience. Tutorials should catch the reader who arrived one step too early.
- Note the bullets don't start with bold text. These are facts, not definitions (§5).

---

## Example 3: Explaining a result

### Before

> Great! If everything worked, you should see a response. The `id` field in the response is the contact's unique identifier — it's actually the MD5 hash of their lowercase email address, which is pretty neat because it means you can compute it yourself without having to store it anywhere.

### After

> The response includes an `id` for the contact. That value is the MD5 hash of their lowercase email address, so you can compute it yourself instead of storing it—every subsequent call for this contact uses that hash in the URL path.

### What changed and why

- Cut "Great!" and "If everything worked, you should see a response." The reader can see whether they got a response.
- Removed "which is pretty neat." Our humor is dry and our tone doesn't editorialize about our own API. If the design is good, the reader will notice.
- Fixed the spaced em dash and reduced two em-dash-ish breaks to one closed-up dash.
- `actually` cut; a magic adverb doing no work.
- Added the consequence the reader needs: *this is what you'll use in future call paths*. The original explained the trivia; the revision explains the usage.

---

## Structural rules for tutorials

**Show the whole request before explaining its parts.** Developers copy first and read second. Meet them there.

**State what success looks like.** Show the actual response body. The current audience guide does this well.

**Put failure modes at the point of failure.** If a step commonly breaks, say so in that step, not in a troubleshooting section at the bottom. Note that any such warning shifts to Tier 4 register: short, action-first, no personality.

**Don't recap.** When the task is done, the tutorial is over. Link to what's next (Tier 1 register is fine for that closing section) and stop.
