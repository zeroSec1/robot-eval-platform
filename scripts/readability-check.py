#!/usr/bin/env python3
"""Measure a blog post's readability against the targets in
research/blog-writing-guide.md.

Usage: python3 scripts/readability-check.py <slug>
Exits 1 when a hard target is missed (FRE < 55, grade > 9.5, or average
sentence length > 18 words) so it can gate publishing.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / "src" / "data" / "blog-posts.ts").read_text()


def syllables(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    if not w:
        return 0
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and n > 1 and not w.endswith(("le", "ye")):
        n -= 1
    return max(1, n)


def main():
    slug = sys.argv[1]
    marker = f'"{slug}"'
    start = SRC.index(marker)
    nxt = re.search(r'slug: "', SRC[start + len(marker):])
    end = start + len(marker) + nxt.start() if nxt else len(SRC)
    post = SRC[start:end]
    # Citation lists are reference matter, not prose; stop at the Sources heading.
    cut = post.find('text: "Sources"')
    if cut != -1:
        post = post[:cut]

    texts = re.findall(r'(?:text|summary):\s*"((?:[^"\\]|\\.)*)"', post)
    items = re.findall(r'"((?:[^"\\]|\\.)*)"', "".join(re.findall(r"items: \[(.*?)\]", post, re.S)))
    prose = " ".join(t.replace('\\"', '"').replace("\\n", " ") for t in texts + items)
    # citation markers and URLs are not read aloud; drop them before scoring
    prose = re.sub(r"\[\d+\]", "", prose)
    prose = re.sub(r"https?://\S+", "", prose)

    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", prose) if len(s.strip()) > 2]
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", prose)
    syl = sum(syllables(w) for w in words)
    asl = len(words) / len(sents)
    asw = syl / len(words)
    fre = 206.835 - 1.015 * asl - 84.6 * asw
    fk = 0.39 * asl + 11.8 * asw - 15.59

    print(f"{slug}: {len(words)} words, {len(sents)} sentences")
    print(f"  avg sentence length: {asl:.1f}  (target <= 18)")
    print(f"  Flesch Reading Ease: {fre:.0f}   (target 60+, hard floor 55)")
    print(f"  FK grade level:      {fk:.1f}  (target ~8-9)")
    over = [(len(re.findall(r"\w+", s)), s) for s in sents if len(re.findall(r"\w+", s)) > 25]
    if over:
        print(f"  sentences over 25 words ({len(over)}):")
        for n, s in sorted(over, reverse=True):
            print(f"    {n}w: {s[:100]}")

    if fre < 55 or fk > 9.5 or asl > 18:
        print("  RESULT: FAIL readability targets")
        sys.exit(1)
    print("  RESULT: PASS")


if __name__ == "__main__":
    main()
