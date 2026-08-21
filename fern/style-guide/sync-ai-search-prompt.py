#!/usr/bin/env python3
"""Re-inline ai-search-system-prompt.md into fern/docs.yml.

Fern's `ai-search.system-prompt` accepts inline strings only — no file paths —
so the prompt has to be duplicated into docs.yml. This keeps the two in sync.

Usage (from repo root):
    python3 fern/style-guide/sync-ai-search-prompt.py          # write
    python3 fern/style-guide/sync-ai-search-prompt.py --check   # verify only
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCS_YML = HERE.parent / "docs.yml"
PROMPT_MD = HERE / "ai-search-system-prompt.md"

BANNER = (
    "  # GENERATED from fern/style-guide/ai-search-system-prompt.md — do not edit\n"
    "  # here. Edit that file, then re-inline it: Fern's system-prompt accepts\n"
    "  # inline strings only (no file paths).\n"
)


def extract_prompt() -> str:
    """Pull the prompt body out of the ```yaml fence in the source file.

    The markdown around the fence is design commentary and maintainer notes —
    it must NOT be shipped to the assistant. Inside the fence the content is
    already nested under `ai-search:` / `system-prompt: |`, so strip that
    wrapper and return the prompt text at zero indent.
    """
    text = PROMPT_MD.read_text()
    m = re.search(r"```yaml\n(.*?)\n```", text, re.DOTALL)
    if not m:
        raise SystemExit(
            "error: no ```yaml fence found in ai-search-system-prompt.md; "
            "cannot determine what to ship as the prompt"
        )
    block = m.group(1)
    lines = block.split("\n")
    try:
        start = next(
            i for i, l in enumerate(lines) if l.strip().startswith("system-prompt:")
        )
    except StopIteration:
        raise SystemExit("error: no `system-prompt:` key inside the yaml fence")
    body = lines[start + 1 :]
    # Drop the 4-space nesting the fence uses; keep relative indentation.
    dedented = [l[4:] if l.startswith("    ") else l for l in body]
    while dedented and not dedented[0].strip():
        dedented.pop(0)
    while dedented and not dedented[-1].strip():
        dedented.pop()
    return "\n".join(dedented)


def build_block() -> str:
    prompt = extract_prompt()
    body = "\n".join(("    " + l).rstrip() for l in prompt.split("\n"))
    return BANNER + "  system-prompt: |\n" + body + "\n"


def main() -> int:
    check = "--check" in sys.argv
    docs = DOCS_YML.read_text()
    block = build_block()

    # Replace everything from the generated banner (or system-prompt key)
    # through the end of the ai-search block.
    pattern = re.compile(
        r"(ai-search:\n(?:  (?!\S)[^\n]*\n|  location:\n(?:    - [^\n]*\n)+)*?)"
        r"(?:  # GENERATED[^\n]*\n(?:  #[^\n]*\n)*)?"
        r"(?:  system-prompt: \|\n(?:(?:    [^\n]*|)\n)*)?"
        r"(?=\S|\n[a-z])",
        re.MULTILINE,
    )
    m = pattern.search(docs)
    if not m:
        print("error: could not locate ai-search block in docs.yml", file=sys.stderr)
        return 2

    updated = docs[: m.end(1)] + block + docs[m.end() :]

    if check:
        if updated != docs:
            print("docs.yml is OUT OF SYNC with ai-search-system-prompt.md")
            print("run: python3 fern/style-guide/sync-ai-search-prompt.py")
            return 1
        print("docs.yml system-prompt is in sync")
        return 0

    if updated == docs:
        print("already in sync; nothing to do")
        return 0
    DOCS_YML.write_text(updated)
    print(f"inlined {len(PROMPT_MD.read_text())} chars into docs.yml")
    return 0


if __name__ == "__main__":
    sys.exit(main())
