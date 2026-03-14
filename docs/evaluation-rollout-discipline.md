# Evaluation And Rollout Discipline

## Purpose

As Gramadoc adds more adjacent coverage, the main risk shifts from
missing rules to noisy ones.

This document keeps the expansion discipline simple:

- precision first for new deterministic rules
- false positives tracked separately from missed detections
- correctness and editorial packs labeled differently
- optional rollout for lower-confidence packs

## Shared Evaluation Set

The baseline evaluation fixtures for current high-priority gap families live in:

- [`packages/gramadoc/src/grammer/evaluation-fixtures.ts`](../packages/gramadoc/src/grammer/evaluation-fixtures.ts)
- [`packages/gramadoc/src/grammer/evaluation-fixtures.test.ts`](../packages/gramadoc/src/grammer/evaluation-fixtures.test.ts)

The fixtures are intentionally split into two groups:

- expected detections
- false-positive guards

That keeps “did we catch it?” separate from “did we annoy the user?”.

Confusion-family work now uses the same shared fixture source instead of an
ad hoc side corpus. Keep `your/you're`, `its/it's`, `whose/who's`, and
`their/there/they're` examples in the shared evaluation fixtures so the release
gate and regression suite measure the same benchmark.

## Precision-First Process

When adding a new deterministic pack:

1. add a small positive fixture set that proves the intended detections
2. add nearby negative examples that should remain quiet
3. keep the pack default-off if the negative examples are still unstable
4. only broaden the pack after the false-positive cases are consistently quiet

## Correctness Vs Editorial Labeling

Use these labels consistently in docs, tests, and future product surfaces:

- correctness-oriented:
  spelling, punctuation, agreement, and deterministic wrong-form corrections
- editorial:
  plain-English rewrites, tone suggestions, style preferences, and house-style
  conventions

Editorial suggestions should never be described as hard errors.

Use `correctness` when a rule primarily catches an objectively wrong or
malformed form.

Examples:

- subject-verb agreement
- punctuation spacing
- wrong-word confusion pairs
- explicit variant replacements when the selected mode is known

Use `editorial` when the suggestion depends on tone, house style, or audience
preference.

Examples:

- E-Prime
- unit conversion suggestions
- house-style naming preferences
- plain-English rewrites that are helpful but optional

## Rollout Guidance

- default-on:
  narrow deterministic packs with a strong replacement and low false-positive
  risk
- optional or confidence-gated:
  style-heavy packs, contested usage, and context-sensitive suggestions
- later:
  broader contextual scoring packs until a stronger evaluation corpus exists

Every broad pack should ship with:

- positive fixtures that prove the intended hits
- negative fixtures that protect against false positives
- at least one docs-style or technical-writing example when the rule is
  expected to run in product copy

## Confusion-Family Graduation Checklist

A confusion family is ready for stronger default-on behavior when all of these
stay true together:

- positive fixtures pass
- quiet fixtures pass
- duplicate warnings are gone for the same confusion span
- comparison reporting improves instead of merely changing behavior
- technical-writing precision stays clean

## Release Visibility

When a rule pack gets materially larger, note it in release notes or changelog
copy so product behavior changes are observable instead of silent. Confusion
family precision changes should be called out explicitly.

When a major rule pack lands, note:

- what family was added or expanded
- whether it is default-on or optional
- the highest-confidence examples it now catches
- any major anti-patterns or exclusions added to keep false positives low

## Release Gate

Before shipping riskier style or editorial expansions, run:

```sh
pnpm test:release-gate
```

The gate currently checks:

- risky-rule false-positive rate on the shared precision fixtures
- risky-rule recall on the explicitly labeled risky positives

For syntax-sensitive correctness rules, also track unsafe rewrites separately
from ordinary false positives. A noisy suggestion is bad; a confident rewrite
based on weak subject or clause evidence is worse and should get its own
reviewed fixtures.

The thresholds default to strict values and can be overridden with:

- `GRAMADOC_RELEASE_GATE_RISKY_FP_RATE`
- `GRAMADOC_RELEASE_GATE_RISKY_RECALL_FLOOR`
