#!/usr/bin/env python3
"""Re-hoist duplicated inline subschemas back into components/schemas.

Mailchimp authors the Marketing spec with shared `$ref`s, but the export step
dereferences them, so the published description inlines the same subschema many
times over. The 41-branch segment-condition union lands 26 times at ~66 KB each
(~1.73 MB of duplication), which is enough to make Fern's registerApiDefinition
fail with an opaque HTTP 500.

This walks the document, finds byte-identical subschemas that repeat, and lifts
each into components/schemas with a `$ref` at every site. Semantics are
unchanged - it is the inverse of the dereference their exporter applies.

It also drops `x-oneOf` where it byte-for-byte duplicates the sibling `anyOf`
(the exporter emits the union twice; standard consumers ignore `x-` keys), and
repairs `parameters` emitted as an object rather than an array.

Deliberately NOT done: promoting `x-discriminator` to a standard
`discriminator`. Only 1 of the 41 segment-condition branches marks
`condition_type` as required, and OpenAPI requires the discriminator property
to be required in every branch. Adding that is a semantic change we cannot
verify against a live account, and required-but-sometimes-absent fields are
exactly what broke the Transactional SDKs. Revisit with real response data.

Idempotent: running it twice is a no-op, because hoisted nodes become `$ref`.

Usage:
    python3 scripts/rehoist-inline-schemas.py fern/apis/mailchimp-openapi/openapi.json
    python3 scripts/rehoist-inline-schemas.py --dry-run <spec>
    python3 scripts/rehoist-inline-schemas.py --min-bytes 4096 --min-copies 3 <spec>
"""

import argparse
import collections
import hashlib
import json
import re
import sys

# Only consider nodes that actually look like a schema worth naming.
SCHEMA_MARKERS = ("anyOf", "oneOf", "allOf", "properties", "items", "enum")


def canonical(node):
    return json.dumps(node, sort_keys=True, separators=(",", ":"))


def digest(node):
    return hashlib.sha256(canonical(node).encode()).hexdigest()


def looks_like_schema(node):
    return isinstance(node, dict) and any(k in node for k in SCHEMA_MARKERS)


SINGULARIZE = (("ies", "y"), ("ses", "s"), ("s", ""))


def name_from_path(path):
    """Build a readable name from where the schema is used.

    e.g. ["paths", "/3.0/facebook-ads", "get", ..., "facebook_ads", "items"]
    -> FacebookAd
    """
    if not path:
        return None
    parts = [p for p in path if isinstance(p, str)]
    # the property key immediately before "items" is the best hint
    hint = None
    for i, seg in enumerate(parts):
        if seg == "items" and i > 0 and parts[i - 1] not in ("properties", "schema"):
            hint = parts[i - 1]
    endpoint = next((p for p in parts if p.startswith("/")), None)
    segs = []
    if endpoint:
        segs = [x for x in endpoint.strip("/").split("/")
                if not x.startswith("{") and x != "3.0"]
    if hint is None:
        hint = segs[-1] if segs else None
    if not hint:
        return None
    # Prefix with the leading endpoint segments when they add information,
    # so /3.0/reporting/facebook-ads does not collide with /3.0/facebook-ads.
    norm = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
    prefix = ""
    if len(segs) > 1 and norm(segs[-1]) == norm(hint):
        prefix = "".join(re.sub(r"[^0-9A-Za-z]+", " ", x).title().replace(" ", "")
                         for x in segs[:-1])
    for suf, rep in SINGULARIZE:
        if hint.endswith(suf) and len(hint) > len(suf) + 1:
            hint = hint[: -len(suf)] + rep
            break
    name = re.sub(r"[^0-9A-Za-z]+", " ", hint).title().replace(" ", "")
    return (prefix + name) if name else None


def qualified_name(path):
    """Fully-qualified fallback used when the short name already exists.

    Distinguishes e.g. the campaign object returned by /campaigns from the one
    returned by /campaigns/{id}/actions/replicate, rather than emitting
    Campaign / Campaign2.
    """
    if not path:
        return None
    parts = [p for p in path if isinstance(p, str)]
    endpoint = next((p for p in parts if p.startswith("/")), None)
    if not endpoint:
        return None
    segs = [x for x in endpoint.strip("/").split("/")
            if not x.startswith("{") and x != "3.0"]
    method = next((p for p in parts
                   if p in ("get", "post", "put", "patch", "delete")), None)
    words = list(segs)
    if method and method != "get":
        words.append(method)
    name = "".join(re.sub(r"[^0-9A-Za-z]+", " ", w).title().replace(" ", "")
                   for w in words)
    return name or None


def prune_orphans(spec):
    """Drop components nothing references (superseded by a later, larger hoist)."""
    schemas = ((spec.get("components") or {}).get("schemas") or {})
    if not schemas:
        return []
    blob = json.dumps({k: v for k, v in spec.items() if k != "components"})
    comp_blob = json.dumps(schemas)
    dropped = []
    changed = True
    while changed:
        changed = False
        for name in list(schemas):
            ref = f'"#/components/schemas/{name}"'
            others = json.dumps({k: v for k, v in schemas.items() if k != name})
            if ref not in blob and ref not in others:
                del schemas[name]
                dropped.append(name)
                changed = True
    return dropped


def derive_name(node, fallback_index, path=None):
    """Prefer the schema's own title; then the usage site; then a counter."""
    title = node.get("title")
    if isinstance(title, str) and title.strip():
        name = re.sub(r"[^0-9A-Za-z]+", " ", title).title().replace(" ", "")
        if name:
            return name
    # Usage site beats a bare discriminator value: a `type: "regular"` tag
    # would otherwise yield the meaningless `RegularSchema`.
    from_path = name_from_path(path)
    if from_path:
        return from_path
    props = node.get("properties") or {}
    for key in ("condition_type", "type", "kind"):
        spec = props.get(key)
        if isinstance(spec, dict):
            vals = spec.get("enum") or ([spec["const"]] if "const" in spec else [])
            if vals and isinstance(vals[0], str):
                return re.sub(r"[^0-9A-Za-z]+", "", vals[0].title()) + "Schema"
    return f"SharedSchema{fallback_index}"


def strip_redundant_extensions(spec):
    """Drop `x-oneOf` where it merely duplicates the sibling `anyOf`.

    The exporter emits the union twice at each site: once as the proprietary
    `x-oneOf` and once as standard `anyOf`. Standard consumers ignore `x-`
    extensions, so the `x-oneOf` copy is pure weight - 21% of this document.

    Only removed when the two are byte-identical; a divergent `x-oneOf` is left
    alone so we never silently discard information.
    """
    removed = [0, 0]

    def walk(node):
        if isinstance(node, dict):
            xo = node.get("x-oneOf")
            if xo is not None:
                if "anyOf" in node and canonical(xo) == canonical(node["anyOf"]):
                    removed[0] += len(canonical(xo))
                    removed[1] += 1
                    del node["x-oneOf"]
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(spec)
    return removed[1], removed[0]


def normalize_parameters(spec):
    """Repair `parameters` emitted as an object keyed "0","1",... .

    A sparse array (an element was deleted without re-indexing) cannot be
    represented in JSON, so some serializers fall back to an object. OpenAPI
    requires an array. Re-index in numeric key order.
    """
    fixed = []
    for path, item in (spec.get("paths") or {}).items():
        if not isinstance(item, dict):
            continue
        for method, op in item.items():
            if not isinstance(op, dict):
                continue
            params = op.get("parameters")
            if isinstance(params, dict) and params and all(k.isdigit() for k in params):
                op["parameters"] = [params[k] for k in sorted(params, key=int)]
                fixed.append(f"{method.upper()} {path} ({len(params)} params)")
    return fixed


def collect(spec, min_bytes, min_copies):
    """Return {digest: (node, [paths])} for repeated, large-enough subschemas."""
    seen = collections.defaultdict(list)
    nodes = {}

    def walk(node, path):
        if isinstance(node, dict):
            if "$ref" in node:
                return  # already shared
            if looks_like_schema(node):
                blob = canonical(node)
                if len(blob) >= min_bytes:
                    d = digest(node)
                    seen[d].append(list(path))
                    nodes.setdefault(d, node)
                    # Keep descending: nested subschemas may also be duplicated,
                    # and stopping here would hide them (a large `recipients`
                    # node would mask the segment-condition union inside it).
            for k, v in node.items():
                walk(v, path + [k])
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, path + [i])

    walk(spec.get("paths", {}), ["paths"])
    # For already-hoisted components, skip the root node (it is the shared copy)
    # and look for duplicates *inside* it - that is where nested unions hide.
    existing = (spec.get("components") or {}).get("schemas") or {}
    for name, body in existing.items():
        base = ["components", "schemas", name]
        # skip the component root itself (it *is* the shared copy)
        if isinstance(body, dict):
            for k, v in body.items():
                walk(v, base + [k])
    return {d: (nodes[d], p) for d, p in seen.items() if len(p) >= min_copies}


def set_at(root, path, value):
    """path is absolute from the spec root, e.g. ["paths", "/x", ...]."""
    cur = root
    for key in path[:-1]:
        cur = cur[key]
    cur[path[-1]] = value


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--min-bytes", type=int, default=2048,
                    help="ignore subschemas smaller than this (default 2048)")
    ap.add_argument("--min-copies", type=int, default=2,
                    help="only hoist when repeated at least this many times (default 2)")
    ap.add_argument("--keep-x-oneof", action="store_true",
                    help="do not strip `x-oneOf` duplicates of `anyOf`")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(args.spec) as fh:
        spec = json.load(fh, object_pairs_hook=collections.OrderedDict)

    if not args.keep_x_oneof:
        n_ext, bytes_ext = strip_redundant_extensions(spec)
        if n_ext:
            print(f"dropped redundant `x-oneOf` at {n_ext} sites "
                  f"({bytes_ext:,} bytes; identical to sibling `anyOf`)")

    repaired = normalize_parameters(spec)
    for r in repaired:
        print(f"repaired `parameters` object -> array: {r}")
    if repaired:
        print()

    before = len(json.dumps(spec))
    targets = collect(spec, args.min_bytes, args.min_copies)
    if not targets:
        print("nothing to hoist - no duplicated subschemas above threshold")
        if repaired and not args.dry_run:
            with open(args.spec, "w") as fh:
                json.dump(spec, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            print(f"wrote {args.spec} (parameter repairs only)")
        return 0

    components = spec.setdefault("components", collections.OrderedDict())
    schemas = components.setdefault("schemas", collections.OrderedDict())

    if args.dry_run:
        ranked = sorted(targets.items(),
                        key=lambda kv: -len(canonical(kv[1][0])) * (len(kv[1][1]) - 1))
        print(f"{'name':40} {'copies':>7} {'bytes each':>12} {'reclaimed':>12}")
        print("-" * 74)
        total = 0
        for idx, (_, (node, paths)) in enumerate(ranked):
            size = len(canonical(node)); rec = size * (len(paths) - 1)
            total += rec
            nm = derive_name(node, idx, paths[0] if paths else None)
            print(f"{nm:40} {len(paths):>7} {size:>12,} {rec:>12,}")
        print("-" * 74)
        print(f"{'TOTAL (upper bound, overlapping)':40} {'':>7} {'':>12} {total:>12,}")
        print("\n(dry run - no changes written)")
        return 0

    # Greedy fixed point: hoist the single highest-value duplicate, then
    # re-collect. Re-collecting each pass keeps paths valid after mutation and
    # naturally handles nesting (hoisting a parent removes its children from
    # consideration; hoisting a child shrinks the parent).
    used, saved, hoisted_count = set(), 0, 0
    print(f"{'name':40} {'copies':>7} {'bytes each':>12} {'reclaimed':>12}")
    print("-" * 74)
    for _ in range(500):
        found = collect(spec, args.min_bytes, args.min_copies)
        if not found:
            break
        _, (node, paths) = max(
            found.items(), key=lambda kv: len(canonical(kv[1][0])) * (len(kv[1][1]) - 1))
        first = paths[0] if paths else None
        name = derive_name(node, hoisted_count, first)
        if name in schemas or name in used:
            alt = qualified_name(first)
            if alt and alt not in schemas and alt not in used:
                name = alt
        base, n = name, 2
        while name in schemas or name in used:
            name = f"{base}{n}"; n += 1
        used.add(name)

        size = len(canonical(node)); rec = size * (len(paths) - 1)
        saved += rec; hoisted_count += 1
        print(f"{name:40} {len(paths):>7} {size:>12,} {rec:>12,}")

        body = json.loads(json.dumps(node))
        body.setdefault("title", name)
        schemas[name] = body
        for pth in paths:
            set_at(spec, pth,
                   collections.OrderedDict([("$ref", f"#/components/schemas/{name}")]))

    print("-" * 74)
    print(f"{'TOTAL':40} {hoisted_count:>7} {'':>12} {saved:>12,}")

    orphans = prune_orphans(spec)
    if orphans:
        print(f"pruned {len(orphans)} orphaned component(s): {', '.join(orphans)}")

    with open(args.spec, "w") as fh:
        json.dump(spec, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    after = len(json.dumps(spec))
    print(f"\nspec {before/1e6:.1f} MB -> {after/1e6:.1f} MB "
          f"({100*(before-after)/before:.0f}% smaller)")
    print(f"components/schemas: {len(schemas)}")
    print(f"wrote {args.spec}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
