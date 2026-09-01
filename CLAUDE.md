# Mailchimp developer docs

Fern-based docs site. Content lives in `fern/`; only files referenced from
`fern/docs.yml` (or a product nav under `fern/products/`) are built.

Validate any change with:

```bash
fern check
```

## Writing style — read this before writing docs content

**The style guide is in `fern/style-guide/`. Load it before writing or editing
any page.**

Do not load all of it. Load the core guide plus the ONE example file matching
what you are writing:

| Writing... | Load |
|---|---|
| Overview, quickstart, next steps | `mailchimp-api-voice.md` + `examples/01-quickstart.md` |
| Conceptual guide (auth, webhooks, rate limits, batching) | `mailchimp-api-voice.md` + `examples/02-conceptual.md` |
| Task tutorial | `mailchimp-api-voice.md` + `examples/03-tutorial.md` |
| Endpoint / parameter reference | `mailchimp-api-voice.md` + `examples/04-reference.md` |
| Errors, troubleshooting, limits | `mailchimp-api-voice.md` + `examples/05-errors.md` |
| Release notes, deprecations | `mailchimp-api-voice.md` + `examples/06-release-notes.md` |

The examples shape output more than the rules do. Sending all six wastes
context on tiers you are not writing.

**After drafting, run the self-check in §6 of `mailchimp-api-voice.md` against
your own output before returning it.** Models comply with the rules
substantially better when asked to verify against them than when merely given
them up front.

### Tone tiers — the core idea

Every page gets exactly one register, chosen by page type. Identify the tier
before writing a word.

| Tier | Pages | Humor |
|---|---|---|
| **1 — Warm** | Overviews, quickstarts, next steps | Sparingly; 1–2 light touches per page max |
| **2 — Neutral-helpful** | Conceptual guides, task tutorials | Default to none; explain *why* |
| **3 — Dry** | Endpoint and parameter reference | None |
| **4 — Strict** | Errors, limits, deprecations | None, ever |

Personality leaking down into tiers 3 and 4 makes the docs worse, not more
Mailchimp. Brand voice in an error table is worse than no brand voice at all.

## Content structure

Marketing API (the active reorg — see `../notes/proposed-ia.md`):

| Tab | URL | What belongs there |
|---|---|---|
| Overview | `/marketing` | Landing page |
| Mailchimp core concepts | `/marketing/concepts/*` | Domain model. Would this page exist if Mailchimp had no API? If yes, here. |
| API core concepts | `/marketing/api-concepts/*` | Interface mechanics. Also holds deep mechanism guides (OAuth 2, webhooks, batch) — for those topics the mechanism *is* the concept. |
| Building with Mailchimp | `/marketing/build/*` | Get started → Quickstarts → Start developing → Build with AI tools |
| API Reference | `/marketing/api` | Generated from `fern/apis/mailchimp-openapi` |

### Naming rules

- **Quickstarts** name the **outcome** ("Import and export contacts"), never
  the mechanism.
- **API core concepts** name the **mechanism** ("Batch operations", "OAuth 2")
  — that is what developers search for.
- **Mailchimp core concepts** name the **domain object** ("Audiences and
  contacts").
- **Start developing** names the **task** ("Send your first API request").
- Titles use **sentence case**.

### What a quickstart is

Complete, end-to-end tutorials of real, specific use cases. Two hard rules
learned the hard way:

- **No UI walkthroughs.** If a page has no code and documents clicking through
  the Mailchimp app, it belongs in the help center, not here. A page with zero
  code fences is a red flag.
- **Integrators build against audiences that already exist.** Do not write
  "create your first audience" content; import, export, and sync against
  existing audiences instead.

## Scope

Current work is **Marketing API only**. Transactional, Release Notes, and Blog
are out of scope — do not restructure them. Transactional is a separate
product; do not treat its pages as templates or precedent for Marketing.

## Links

**Self-references use root-relative paths, never a hostname.** Write
`/marketing/api-concepts/errors`, not
`https://mailchimp.com/developer/marketing/api-concepts/errors`.

Two reasons, the second being the one that bites:

1. The site will live at different hostnames over time (preview builds, staging,
   the eventual production domain). Absolute links pin content to one host.
2. **`fern docs broken-links` cannot validate a link that has a hostname** — it
   treats it as external and skips it. In Aug 2026 a sweep found 64 absolute
   self-links, **23 of whose paths were already dead**, all passing checks
   clean. Relative links get policed; absolute ones do not.

Absolute URLs are correct for genuinely external destinations: `mailchimp.com`
marketing pages, help center articles, GitHub, and the CDN-hosted
`mailchimp.com/developer/static/...` images (no local asset exists for those).

**API reference deep links** use `/{product}/api/{tag}/{action}`, e.g.
`/marketing/api/lists/create-member-event`. Do NOT derive these from the
OpenAPI `operationId` — the slug differs and you will get a 404. Read the real
URL off the rendered reference index (`/marketing/api`, `/transactional/api`)
and verify it returns 200 before committing it.

## Re-vendoring the Marketing OpenAPI spec

**Every time `fern/apis/mailchimp-openapi/openapi.json` is replaced with a new
export, run this before anything else:**

```bash
python3 scripts/rehoist-inline-schemas.py fern/apis/mailchimp-openapi/openapi.json
fern check
```

Mailchimp authors the spec with shared `$ref`s but their exporter dereferences
everything, so the raw export inlines the same subschema dozens of times. This
is not cosmetic — it breaks the docs build. `registerApiDefinition` returns
HTTP 500 with an empty body and no publish, while `fern check` passes with 0
errors and the IR builds fine locally. There is nothing in the error to tell
you what is wrong, so if you skip this step you will lose an afternoon.

They have been asked to fix it upstream and declined
(see `../mailchimp-marketing-spec-issues.md`), so this is permanent.

The script is idempotent — running it twice is a no-op — and it does three
things:

| | |
|---|---|
| Re-hoists byte-identical repeated subschemas into `components/schemas` with a `$ref` at each site | the fix that unblocks the build |
| Drops `x-oneOf` where it exactly duplicates the sibling `anyOf` | the exporter emits the union twice; 21% of the raw file |
| Repairs `parameters` emitted as an object keyed `"0","1",...` | a sparse array that cannot round-trip as JSON; crashes the converter with `m.parameters is not iterable` |

On the Sept 2026 export: **10.4 MB → 2.9 MB on disk, IR 241 MB → 175 MB, 63
shared schemas, 1,221 named types.**

Do NOT try to do this in `overrides.yml`. Fern's override merge is a deep
merge — it can add the shared component but cannot remove the inline copies
(`anyOf: null` does not delete them), so you end up with both. Measured: type
count 2,315 → 5,643 and the publish still failed. The `parameters` repair
*can* be done in overrides; the dedupe cannot.

Deliberately not automated: promoting `x-discriminator` to a standard
`discriminator`. Only 1 of the 41 segment-condition branches marks
`condition_type` required, and OpenAPI needs it required in every branch.
That is a semantic change we cannot verify without a live account, and
required-but-sometimes-absent fields are what broke the Transactional SDKs.

## Gotchas

- `fern/products/*.yml` carry slugs on the tab **definitions** (not the
  `- tab:` nav items) to preserve legacy URLs. Keep that pattern.
- `fern/docs/pages/tools/landing.mdx` is `layout: custom` — hand-built HTML
  with SDK card grids covering both products. Do not inline it into a prose
  page.
- Redirects live in `fern/docs.yml`. Moving or renaming a page means adding
  one. `fern check` validates redirects only when authenticated
  (`FERN_TOKEN`).
- `ai-search.system-prompt` in `docs.yml` is generated from
  `fern/style-guide/ai-search-system-prompt.md`. Edit the source file, then
  re-inline it — Fern accepts inline strings only, no file paths.
