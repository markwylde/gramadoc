# Morphology Audit

This audit records the pre-refactor morphology surface and the main migration
targets.

## Inventory

Primary morphology and lemma consumers:

- `packages/gramadoc/src/grammer/document.ts`
  - tokenization and token annotation wiring
- `packages/gramadoc/src/grammer/linguistics.ts`
  - lemma derivation, morphology hints, POS hint assembly
- `packages/gramadoc/src/grammer/disambiguation.ts`
  - contextual POS disambiguation after auxiliaries, `to`, and predicate cues
- `packages/gramadoc/src/grammer/clause.ts`
  - clause predicate scoring and finite-verb heuristics
- `packages/gramadoc/src/grammer/rule-helpers.ts`
  - helper-level finite-verb and participle checks
- `packages/gramadoc/src/grammer/rules/grammar/verb-usage/rule.ts`
  - infinitive, do-support, participle, and ellipsis rewrite rules
- `packages/gramadoc/src/grammer/rules/grammar/agreement-errors/rule.ts`
  - bare-verb and third-person singular agreement heuristics
- `packages/gramadoc/src/grammer/resources/preposition-collocations.ts`
  - gerund detection
- `packages/gramadoc/src/grammer/rules/style-readability/repetition/rule.ts`
  - lemma-based repetition grouping
- `packages/gramadoc/src/grammer/rules/style-readability/wordiness/rule.ts`
  - passive-voice participle detection

## Previous Rule-Local Morphology

The main pre-refactor rule-local logic lived in:

- `verb-usage/rule.ts`
  - local irregular maps for past participles, infinitives, and do-support
  - a local `getRegularBaseVerb()` stemmer
  - a local `toIngForm()` helper
- `agreement-errors/rule.ts`
  - string-shape checks for third-person singular and bare lexical verbs
- `rule-helpers.ts`, `clause.ts`, and `wordiness/rule.ts`
  - suffix checks for finite verbs and participles

## Lemma-Identity Signals

The old system relied on lemma equality as meaning, not just data:

- `candidate.lemma !== candidate.normalized`
  - used as a gerund signal in preposition collocations
- `token.lemma === token.normalized`
  - used as a bare-verb signal in agreement logic

These sites have been migrated to shared `token.morphology` checks.

## Resource Gaps Found

The pre-refactor engine had:

- a tiny irregular lemma resource
- a small hand-curated verb lexicon
- a tiny participial-adjective allowlist
- a short blocklist for `-s` lookalikes

The shared morphology layer now consolidates and expands those resources in one
module.

## Known Failure Modes

The main failures and risk areas that drove this refactor were:

- false positives such as `want to need -> nee`
- duplicate local answers to “what is the base form?”
- disagreement between POS/morphology hints and rule-local suffix stripping
- quoted examples being treated as live errors
- suffix-lookalike nouns such as `status` and `series`
- ambiguous zero-change forms such as `read`

## Public Surface Changes

The main public type affected is `Token`.

New shared shape:

- `token.morphology`
  - authoritative lemma, provenance, ambiguity, confidence, and verb-form data

Compatibility preserved:

- `token.lemma`

The flat lemma remains for ergonomic grouping and matching, but provenance now
lives only under `token.morphology`.
