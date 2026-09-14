#!/usr/bin/env python3
"""Regenerate fern/.well-known/agent-skills/index.json.

Fern's CLI validates that index.json exists and parses, but never writes it and
never computes `digest` (verified against the `valid-well-known-skills` rule in
fern-api 5.89.4). So the manifest is ours to maintain: run this after adding or
editing any SKILL.md, or the published digests go stale.

Reads name/description from each SKILL.md's frontmatter so the manifest cannot
disagree with the skill itself.
"""
import hashlib
import json
import pathlib
import re
import sys

SKILLS_DIR = pathlib.Path(__file__).resolve().parent.parent / "fern/.well-known/agent-skills"


def frontmatter(text, path):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not m:
        sys.exit(f"{path}: no YAML frontmatter")
    fields = {}
    for key in ("name", "description"):
        km = re.search(rf"^{key}:\s*(.+?)\s*$", m.group(1), re.MULTILINE)
        if not km:
            sys.exit(f"{path}: frontmatter is missing `{key}`")
        fields[key] = km.group(1).strip().strip('"\'')
    return fields


def main():
    skills = []
    for skill_md in sorted(SKILLS_DIR.glob("*/SKILL.md")):
        raw = skill_md.read_bytes()
        meta = frontmatter(raw.decode("utf-8"), skill_md)
        directory = skill_md.parent.name
        if meta["name"] != directory:
            sys.exit(f"{skill_md}: name '{meta['name']}' != directory '{directory}'")
        skills.append({
            "name": meta["name"],
            "description": meta["description"],
            "url": f"/.well-known/agent-skills/{directory}/SKILL.md",
            "digest": "sha256:" + hashlib.sha256(raw).hexdigest(),
        })

    if not skills:
        sys.exit(f"No SKILL.md files found under {SKILLS_DIR}")

    out = SKILLS_DIR / "index.json"
    out.write_text(json.dumps({"version": "0.2.0", "skills": skills}, indent=2) + "\n")
    print(f"Wrote {out} ({len(skills)} skill{'s' if len(skills) != 1 else ''})")
    for s in skills:
        print(f"  {s['name']}  {s['digest']}")


if __name__ == "__main__":
    main()
