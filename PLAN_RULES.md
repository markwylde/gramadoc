# Rules Checklist

## Current Status

The folder restructure is effectively complete for the rule families that are currently implemented.

`src/grammer/index.ts` now exports grouped rules from these implemented subcategories:

- [x] `spelling-orthography/basic-spelling`
- [x] `spelling-orthography/capitalization`
- [x] `spelling-orthography/compound-words`
- [x] `spelling-orthography/names-acronyms-specialized-terms`
- [x] `grammar/agreement-errors`
- [x] `grammar/articles-determiners`
- [x] `grammar/conjunctions`
- [x] `grammar/prepositions`
- [x] `grammar/pronouns`
- [x] `sentence-structure-syntax/negation`
- [x] `semantics-clarity/word-confusion`
- [x] `grammar/verb-usage`
- [x] `internationalization/foreign-terms`
- [x] `internationalization/language-variants`
- [x] `formatting-typography/dates-times`
- [x] `formatting-typography/currency-units`
- [x] `formatting-typography/lists-layout`
- [x] `formatting-typography/numbers`
- [x] `data-validation-structured-text/identifiers`
- [x] `punctuation/apostrophes`
- [x] `punctuation/commas`
- [x] `punctuation/other-punctuation`
- [x] `punctuation/periods-sentence-boundaries`
- [x] `punctuation/quotation-marks`
- [x] `formatting-typography/spacing`
- [x] `style-readability/repetition`
- [x] `style-readability/conciseness`
- [x] `style-readability/informality-tone`
- [x] `style-readability/word-choice`
- [x] `style-readability/wordiness`
- [x] `data-validation-structured-text/urls-emails`

Each implemented subcategory has:

- [x] a `rule.ts`
- [x] a sibling `rule.test.ts`
- [x] inclusion in the main `grammerRules` export where appropriate

## Review Notes

Findings from the latest pass through the rules:

- [x] Fixed the `SUBJECT_VERB_AGREEMENT` false positive for helper-led phrases like `There are ...`, `should have`, and `might have`.
- [x] Added `grammar/verb-usage` with deterministic checks for modal `of`, irregular past participles, and bad do-support verb forms.
- [x] Added `grammar/pronouns` with low-risk checks for subject/object pronoun swaps, preposition-edge cases like `between you and I`, and reflexive pronouns misused as subjects.
- [x] Added `sentence-structure-syntax/negation` with low-risk checks for double negatives and simple misplaced `not` patterns.
- [x] Added `semantics-clarity/word-confusion` with narrow fixed-phrase checks for `affect/effect` confusions.
- [x] Added `internationalization/foreign-terms` with a short curated set of stable borrowed-term spellings.
- [x] Added `formatting-typography/dates-times` with deterministic checks for duplicated meridiems and repeated date/time separators.
- [x] Added `formatting-typography/currency-units` with deterministic checks for currency-code spacing and simple unit formatting mistakes.
- [x] Added `formatting-typography/lists-layout` with deterministic checks for mixed bullet markers, numbering jumps, and missing list-marker spacing.
- [x] Added `formatting-typography/numbers` with deterministic checks for ordinal suffixes and duplicated numeric symbols.
- [x] Added `data-validation-structured-text/identifiers` with deterministic checks for malformed UUID-like values and broken ticket-style identifiers.
- [x] Added `style-readability/conciseness` with curated hedge and filler-phrase reductions.
- [x] Added `style-readability/informality-tone` with curated chat shorthand and informal spoken contractions.
- [x] Added `style-readability/word-choice` with curated phrase and single-word corrections like `could care less`, `irregardless`, and `alot`.
- [x] Added `style-readability/wordiness` with curated redundant and wordy phrase replacements.
- [x] Added `internationalization/language-variants` with sentence-local US/UK spelling consistency checks for a short curated pair list.
- [x] Added `punctuation/other-punctuation` with deterministic checks for doubled semicolons, repeated colons outside time-like expressions, and overlong inline dash runs.
- [x] Expanded end-to-end coverage in `src/grammer/index.test.ts` so the full analyzer is exercised by a larger corpus, not just per-rule unit tests.
- [x] Added an explicit meta-test in `src/grammer/index.test.ts` to assert that `grammerRules` contains every intended grouped export.

Remaining structural observations:

- [x] Moved `INCORRECT_APOSTROPHES` into `punctuation/apostrophes` so apostrophe fixes live under a single visible category.
- [x] Added direct coverage for `src/grammer/rules/spelling-orthography/basic-spelling/helpers.ts` through a dedicated `helpers.test.ts`.
- [x] Tightened `SENTENCE_CAPITALIZATION` so sentence-internal abbreviations like `a.m.`, `e.g.`, and `i.e.` no longer trigger false positives.

## Suggested Next Targets

The next deterministic rule families most likely to add value without needing AI-heavy inference are:

- [ ] `grammar/pronouns`
  Continue with additional low-risk agreement checks only where antecedent boundaries are clear.
- [ ] `semantics-clarity/contextual-errors`
  Focus on narrow deterministic confusions that do not require broad world knowledge.
- [ ] `sentence-structure-syntax/clause-structure`
  Start with malformed fragment patterns that are easy to detect without deep parsing.
- [ ] `internationalization/language-variants`
  Expand the curated variant list only after validating dictionary interactions and false-positive risk.

## Done Definition

This checklist can be treated as largely complete for the implemented deterministic core when all of the following remain true:

- [x] Every shipped rule family lives under `category/subcategory/rule.ts`
- [x] Every shipped family has a sibling `rule.test.ts`
- [x] The main export only includes implemented, tested rule families
- [x] End-to-end tests exercise the combined analyzer across mixed good and bad prose
- [x] Empty placeholder folders have been intentionally removed
