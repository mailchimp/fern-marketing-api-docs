#!/usr/bin/env python3
"""Add a "Scopes required" line to each operation's description.

Mailchimp declares the OAuth scopes an operation needs in its `security`
requirement, e.g.

    security: [{bearerToken: []}, {oauth2: [campaigns:send]}]

Fern's API reference does not render per-operation scopes, so this writes them
into the operation description, which the reference does render:

    **Scopes required:** `campaigns:send`

Operations without their own `security` inherit the document-level one.
Requirements with no scopes (API key, unscoped OAuth) add nothing. Scopes from
alternative requirements that differ are joined with "or".

Idempotent: an existing "Scopes required" line is replaced, and removed when the
operation no longer has scopes.

Usage:
    python3 scripts/add-scope-descriptions.py fern/apis/mailchimp-openapi/openapi.json
    python3 scripts/add-scope-descriptions.py --check <spec>
"""

import argparse
import json
import re
import sys

METHODS = ("get", "put", "post", "delete", "options", "head", "patch", "trace")
LABEL = "**Scopes required:**"
EXISTING_LINE = re.compile(r"\n*^" + re.escape(LABEL) + r".*\Z", re.MULTILINE)


def scope_sets(security):
    sets = []
    for requirement in security or []:
        scopes = []
        for scheme_scopes in requirement.values():
            for scope in scheme_scopes or []:
                if scope not in scopes:
                    scopes.append(scope)
        if scopes and scopes not in sets:
            sets.append(scopes)
    return sets


def scopes_line(sets):
    if not sets:
        return None
    return LABEL + " " + " or ".join(", ".join(f"`{s}`" for s in scopes) for scopes in sets)


def apply(spec):
    changed = []
    root_security = spec.get("security")
    for path, item in (spec.get("paths") or {}).items():
        if not isinstance(item, dict):
            continue
        for method in METHODS:
            operation = item.get(method)
            if not isinstance(operation, dict):
                continue
            security = operation.get("security", root_security)
            line = scopes_line(scope_sets(security))
            description = operation.get("description") or ""
            stripped = EXISTING_LINE.sub("", description).rstrip()
            updated = stripped if line is None else (f"{stripped}\n\n{line}" if stripped else line)
            if updated != description:
                if updated:
                    operation["description"] = updated
                else:
                    operation.pop("description", None)
                changed.append(f"{method.upper()} {path}")
    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("spec")
    parser.add_argument("--check", action="store_true", help="exit 1 if the spec needs updating; do not write")
    args = parser.parse_args()

    with open(args.spec) as fh:
        spec = json.load(fh)

    changed = apply(spec)
    for op in changed:
        print(op)

    if args.check:
        if changed:
            print(f"{len(changed)} operation(s) need a scopes line; run {sys.argv[0]} {args.spec}", file=sys.stderr)
            sys.exit(1)
        print("Scope descriptions are up to date.")
        return

    if changed:
        with open(args.spec, "w") as fh:
            json.dump(spec, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    print(f"Updated {len(changed)} operation(s).")


if __name__ == "__main__":
    main()
