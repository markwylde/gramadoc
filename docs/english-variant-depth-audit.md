# English Variant Depth Audit

## Current Inventory

Gramadoc currently ships a compact curated variant layer in
[`packages/gramadoc/src/grammer/resources/variant-mappings.ts`](../packages/gramadoc/src/grammer/resources/variant-mappings.ts)
with 10 US/UK spelling pairs:

- `analyze` / `analyse`
- `behavior` / `behaviour`
- `center` / `centre`
- `color` / `colour`
- `favorite` / `favourite`
- `honor` / `honour`
- `labor` / `labour`
- `organize` / `organise`
- `traveler` / `traveller`
- `traveled` / `travelled`

The active runtime behavior today is consistency-oriented:

- sentence-local mixed-variant detection
- document-level mixed-variant detection
- lexical consistency groups for terms like `email`, `website`, and `coworker`

The active language codes in fixtures and rule metadata are still:

- `en`
- `en-US`
- `en-GB`

## Target Variant Comparison

The main English variants worth tracking long term are:

- `en-US`
- `en-GB`
- `en-CA`
- `en-AU`
- `en-NZ`
- `en-ZA`

Current coverage is strongest for `en-US` and `en-GB`.
The other variants are effectively unsupported beyond inheriting whichever form
is closest to the base English defaults.

That means Gramadoc currently has:

- real consistency support for US/GB writing
- no dedicated spelling inventory for CA/AU/NZ/ZA
- no variant-specific product/style packs outside the shared lexical resources

## Decision: Consistency First, Not Full Enforcement

For the next phase, Gramadoc should remain consistency-first instead of trying
to do full spelling enforcement per variant.

Why:

- the current pair inventory is too small for confident full enforcement
- full enforcement would collide with the spelling engine before variant
  dictionaries are deep enough
- consistency checks already deliver visible value with much lower false-positive
  risk
- a consistency-first model fits the current deterministic TypeScript rule stack
  better than pretending we already have full regional dictionaries

Near-term policy:

- keep `en-US` and `en-GB` as the explicit variant modes
- treat CA/AU/NZ/ZA as future expansion targets, not silently “supported”
- expand the curated replacement inventory before expanding enforcement claims

## Interaction Rules

Variant selection should interact with other rule families like this:

- spelling:
  Variant mode should only bias suggestions for entries that are explicitly in
  the curated variant inventory. Non-variant spelling rules should stay neutral.
- compounds:
  Compound and hyphenation rules should not silently normalize toward a region
  unless the compound itself is in a variant-aware resource.
- style and house-style:
  Editorial or house-style packs may add regional preferences, but they should
  be labeled as convention-driven rather than correctness-only.
- lexical consistency:
  Document-level consistency can remain active even when full per-variant
  enforcement is not.

## Recommended Expansion Order

1. Deepen the US/GB inventory with more high-confidence curated pairs.
2. Add tests for pairs that interact with compounds and morphology.
3. Introduce separate research inventories for CA/AU/NZ/ZA before any runtime
   enforcement.
4. Only consider full spelling enforcement when the curated inventories are wide
   enough to avoid contradicting the spelling layer.
