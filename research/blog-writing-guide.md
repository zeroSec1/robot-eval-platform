# Robot Eval blog writing method

Purpose: our posts sell trust in an evaluation service. Trust comes from two
things at once: rigor the reader can check, and language the reader can
actually read. Rigor without readability sells nothing; readability without
rigor is marketing. Every post must do both.

## The evidence this method rests on

- Comprehension exceeds 90% at ~14-word sentences and collapses below 10%
  around 43 words (American Press Institute data, via
  readabilityguidelines.wikidot.com/sentence-length and
  toolsforwriting.com/blog/ideal-sentence-length-for-readability).
- Readers start struggling at ~20 words per sentence; plain-English floor is
  a Flesch Reading Ease score of 60 (Rudolf Flesch, via readable.com).
- The average US adult reads below 9th-grade level (literacy research, via
  clad.tccld.org/measuring-readability).
- Web readers scan in an F-pattern and read at most 28% of the words on a
  page, usually ~20% (Nielsen Norman Group eyetracking, 232 users:
  nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered).

## The rules

1. **Targets, measured not guessed**: Flesch Reading Ease 60+, grade level
   ~8-9, average sentence under 18 words. Run
   `python3 scripts/readability-check.py <slug>` before publishing.
2. **Write for the scanner first.** Headings state the takeaway. First
   sentence of each section carries the point. Bullets over paragraphs when
   listing. A reader who only reads headings and first sentences must still
   get the argument (F-pattern).
3. **Small words unless the big word is the accurate one.** "Use" not
   "utilize", "check" not "assess". Keep necessary technical terms (WMS,
   AMR) but define each on first use in plain words.
4. **Never state a fact without a source.** Numbered citations [n] with a
   sources list. Quote the source's exact words when a verified quote
   exists; a direct quote builds more trust than a paraphrase.
5. **Label estimates as estimates.** If no primary source exists (vendor
   pricing), say so in the text, not a footnote.
6. **Disclose our limits in the first screen.** What we tested ourselves vs
   what is market research. The disclosure IS the sales pitch: it shows the
   discipline we sell.
7. **One simple graphic beats a dense table.** Use-case content gets visual
   cards or meters a reader can grasp in seconds. Charts follow the dataviz
   validation rules (CVD-safe colors, labels carry identity, never color
   alone).
8. **No em dashes.** House style.

## Post checklist

- [ ] readability-check passes (FRE 60+, grade <= 9, avg sentence <= 18)
- [ ] headings alone tell the story
- [ ] every number has [n]; every [n] resolves; quotes used where verified
- [ ] estimates labeled in the text
- [ ] our-limits disclosure present
- [ ] graphic for anything list-like or comparative
- [ ] no em dashes; build passes; screenshot reviewed in light and dark
