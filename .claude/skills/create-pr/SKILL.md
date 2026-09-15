---
name: create-pr
description: Use when work on a branch in the fern-marketing-api-docs repo is ready to ship — outputs the push and `gh pr create` commands for the user to run, drafts the PR description, then drafts and (on approval) posts the announcement to #idi-api-core. Triggers on "create a PR", "open a PR", "ship this", "announce this PR".
---

# Create a PR for fern-marketing-api-docs

You **cannot push or open the PR yourself.** Your job is to produce the exact
commands for the user to run, then handle the announcement once the PR exists.

Work through the four steps in order. Do not skip ahead — step 2 needs the
branch pushed, step 3 needs the PR URL.

## Before you start

Verify the branch is ready:

```bash
git status --short && git log --oneline origin/main..HEAD
```

If there are uncommitted changes, commit them first (end the message with
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`). If the branch has no
commits ahead of `main`, stop and say so.

Branch names follow the Jira key: `APIC-1234-short-slug`. Commit and PR titles
use conventional-commit prefixes seen in this repo — `docs(marketing):`,
`fix(docs):`, `fix(skills):` — with the Jira key in parens at the end of the
title when the work has one.

## Step 1 — Output the push command

Print it in its own `bash` fence, nothing else in the fence:

```bash
git push -u origin APIC-1234-short-slug
```

Say plainly that you can't push and they need to run it. Wait for them to
confirm it succeeded before moving on.

## Step 2 — Output the PR command with the description

Write the description first, then wrap it in a heredoc so the whole thing is
one runnable block:

```bash
gh pr create --base main --head APIC-1234-short-slug \
  --title "docs(marketing): short imperative title (APIC-1234)" \
  --body "$(cat <<'EOF'
## What

One or two sentences on what changed, in plain language.

## Why

The reason — the Jira ticket's intent, the bug, or the review feedback.

## Notes

Anything a reviewer needs: pages touched, whether `fern check` passes, a
preview link if one exists. Omit this section when there's nothing to say.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Description rules:
- Derive **What** and **Why** from the actual diff, not the branch name.
- If the change touches `fern/` content, note that `fern check` was run and
  what it returned. Run it yourself first if you haven't.
- Keep it short. Reviewers on this repo read the diff; the body is orientation,
  not a transcript.

Ask the user to paste back the PR URL that `gh` prints.

## Step 3 — Draft the Slack message

Exact format, no deviation:

```
:pr-2338: *<PR URL|PR title>* @mc-api-core
<brief description of changes>
```

- `:pr-2338:` is literal — it is the team's PR emoji, not the PR number.
- The title is bold and links to the PR using Slack's `<url|text>` link syntax.
- `@mc-api-core` is on the first line, after the title.
- The description goes on its own line below, one to three sentences. Say what
  changed and why someone should care, not a file list.

Show the draft and **wait for explicit approval.** Do not post an unapproved
message.

## Step 4 — Post to #idi-api-core

Only after the user approves. Send the approved text verbatim to
`#idi-api-core` with the Slack send-message tool.

If the Slack tool isn't connected in this session, say so and hand the user the
message to paste rather than silently skipping the step.

Confirm the post with a link or timestamp when it lands.
