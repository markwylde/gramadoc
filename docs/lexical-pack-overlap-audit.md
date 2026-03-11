# Lexical Pack Overlap Audit

This note audits the current overlap between `wordiness`, `word-choice`,
`conciseness`, and related wording resources so future pack growth stays
intentional.

## Current boundaries

| Resource | Current role | Good fit |
| --- | --- | --- |
| `resources/wordiness.ts` | multi-token phrase rewrites, redundancy, plain-English suggestions, sentence-level readability nudges | phrases that are explainable as style, clarity, or concision |
| `resources/word-choice.ts` | umbrella export over `simple-replace` word and phrase substitutions | confusion pairs and conventional wrong-form replacements |
| `resources/simple-replace.ts` | fixed spelling or phrase corrections with one preferred surface form | correctness-leaning canonical replacements |
| `resources/conciseness.ts` | tiny set of hedge and filler-lead-in patterns | short lead-ins or stacked hedges that are better modeled as compression |
| `resources/house-style.ts` | preferred brand casing and product-name conventions | convention-driven names and forms, not generic grammar |

## Overlap findings

- `word-choice` and `wordiness` both hold replacement-style suggestions, but they are not the same surface.
- `word-choice` is strongest when one form is simply wrong for the intended meaning.
- `wordiness` is strongest when the phrase is understandable but longer, stiffer, or more redundant than necessary.
- `word-choice` intentionally overlaps with `simple-replace` because it is the
  user-facing grouping over that inventory.
- `conciseness` overlaps with `wordiness` today because both target brevity-oriented rewrites.

## Recommended boundaries

- Keep `word-choice` for correctness-leaning substitutions and confusion sets.
- Keep `simple-replace` for low-ambiguity canonical fixes with one clear target
  form.
- Keep `wordiness` for phrase-level rewrites where tone, redundancy, or readability is the primary reason.
- Treat `conciseness` as a specialist subset for short filler and hedge compressions, or fold it into the `wordiness` family if it remains tiny.
- Keep `house-style` separate from generic spelling and generic word choice because it is convention-driven.

## Migration rules for future additions

1. If both sides are grammatical but one is preferred for brevity or tone, place it in `wordiness`.
2. If one side is simply the wrong lexical choice, place it in `word-choice`,
   `simple-replace`, or confusion resources.
3. If the rule exists because a team or product prefers a convention, place it in `house-style`.
4. If the pattern is just a short filler lead-in and does not need a separate user-facing category, keep it in `conciseness` until the pack grows enough to justify merging.

## Immediate cleanup guidance

- New micro-rules like `discuss about` belong in `wordiness` only if the message is framed as a phrase-level rewrite.
- Multi-token spelling corrections like `could of` should not live in `conciseness`; they belong in data-driven lexical replacement packs.
- Editorial wording such as `click here` or `blacklist` should not be hidden inside generic `wordiness` packs without explicit editorial labeling.
