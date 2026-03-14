# Gramadoc Rule Authoring Guide

This guide covers the current authoring path for Gramadoc rules in
`packages/gramadoc/src/grammer`.

## Goal

Add new rules in a way that keeps the engine deterministic, explainable, and
cheap to maintain.

The fastest path is usually not a brand-new algorithm. It is normally a small
resource addition that plugs into the shared helpers already in
`packages/gramadoc/src/grammer/`.

## Design Principles

- Prefer deterministic rules before probabilistic scoring.
- Keep false positives lower than raw rule count.
- Use data-driven resources when a rule is a fixed token, phrase, or lexical
  set.
- Treat editorial guidance separately from correctness checks.
- Keep messages short enough to work in an editor tooltip.

## Choosing The Right Shape

- Add a resource entry when the check is a fixed token, phrase, variant pair, or
  house-style term.
- Add a generic-helper-backed rule when a family shares matching logic across
  many entries.
- Add custom rule logic only when the pattern needs syntax, sentence, clause, or
  block-level reasoning.

## Current Building Blocks

- `resources/lexical-rules.ts`: shared metadata and validation for lexical packs
- `morphology.ts`: shared lemma and verb-form analysis for morphology-sensitive
  rules
- `rule-helpers.ts`: token phrase matching, lexical guards, clause helpers, and
  block-aware matching
- `patterns.ts`: lower-level phrase and token pattern utilities
- `utils.ts`: `createMatch`, analysis helpers, and test context setup

Morphology-sensitive rules should also read:

- `docs/morphology-design-note.md`
- `docs/morphology-maintenance-guide.md`

## Where New Rules Usually Go

- `packages/gramadoc/src/grammer/resources/`
  Use for reusable token lists, phrase packs, variant maps, and lexical
  metadata.
- `packages/gramadoc/src/grammer/rules/<family>/<subcategory>/rule.ts`
  Use for the rule implementation and grouped export.
- `packages/gramadoc/src/grammer/rules/<family>/<subcategory>/rule.test.ts`
  Add focused rule-level coverage here.
- `packages/gramadoc/src/grammer/index.ts`
  Register the grouped export if the family is shipped by default.

## Preferred Implementation Order

1. Check whether the rule can be expressed as a resource entry in an existing
   pack.
2. Reuse shared helpers such as token phrase matching, lexical guards, or
   resource validation.
3. If the rule depends on lemmas, base verbs, participles, or inflection
   families, use the shared morphology helper instead of adding rule-local
   suffix stripping or stem recovery.
4. Add a dedicated rule only when the behavior cannot be expressed cleanly as
   data or shared helpers.
5. Add regression coverage that proves both the intended detection and the
   expected quiet cases.

## Resource Expectations

Large lexical packs should include:

- stable `id`
- clear `message`
- replacement text when the rewrite is safe to suggest
- `metadata.category`
- `metadata.severity`
- optional `allowlist`
- optional `antiPatterns`
- optional `variantRestrictions`
- `exampleCoverage` for positive and negative examples

Run shared validation tests when you add or expand a resource pack.

## Testing Expectations

- Add focused rule tests beside the rule.
- Add negative fixtures for docs prose, code-like spans, quoted literal
  mentions, and technical tokens when relevant.
- Add or update regression corpus entries when a rule family expands in a
  meaningful way.
- Prefer inline snapshot-style tests for large resource inventories where the
  inventory shape matters more than one individual example.
- Check that variant-restricted behavior only fires in the intended language
  mode.
- Check that the full analyzer still surfaces the rule through `analyzeText`
  when needed.

Useful existing coverage layers:

- per-rule tests under `rules/**/rule.test.ts`
- lexical helper tests in
  `packages/gramadoc/src/grammer/rule-helpers.test.ts`
- broad regression coverage in
  `packages/gramadoc/src/grammer/regression.test.ts`
- lexical pack inventory snapshots in
  `packages/gramadoc/src/grammer/lexical-packs.test.ts`
- performance guards in
  `packages/gramadoc/src/grammer/performance.test.ts`

## Editorial vs Correctness

Use correctness-oriented rules for:

- spelling, grammar, punctuation, agreement, and deterministic variant behavior

Use editorial rules for:

- plain-English rewrites
- house-style wording
- tone and readability suggestions

If a rule can be reasonable to ignore because of audience, tone, or company
policy, label it editorial in docs and messaging.

## False-Positive Discipline

Before shipping a new default-on rule, explicitly check:

- does this break on quoted examples?
- does this break on technical identifiers or docs prose?
- does this break in headings, lists, or blockquotes?
- does this depend on context the current tokenizer cannot see reliably?
- does this depend on morphology that should come from the shared helper rather
  than local string slicing?

If the answer is yes, either add a guard, move it into an optional pack, or
defer it until the contextual framework is stronger.

## Subject Confidence And Shared Syntax

For syntax-sensitive correctness rules, use this precedence order when deciding
whether to emit a rewrite:

1. trust shared clause structure first
2. fall back to bounded local recovery only when the evidence is still strong
3. use sentence-level fallback only as a last resort

Weak evidence should not drive a rewrite. In practice, treat these as weak:

- morphology-only noun guesses
- fallback noun guesses on unknown open-class words
- capitalization-only proper-name guesses

When subject identity is uncertain, prefer staying quiet over inventing a
specific agreement correction. This matters most for agreement, but the same
discipline applies anywhere a rule is tempted to rebuild syntax locally.

When you add a precision fix for this kind of rule, pair the quiet examples
with nearby true positives in executable tests so we do not solve one side by
breaking the other.

## When To Create A New Rule Family

Create a new family only when the problem has distinct user-facing semantics,
independent rollout needs, or different confidence rules. Otherwise prefer
extending an existing family with new resources.

Good reasons:

- a new pack needs separate enablement or labeling
- the detection logic has materially different confidence characteristics
- the explanations belong to a different user-facing category

Weak reasons:

- the current resource file feels long
- the rule names are slightly different
- the same helper can already support the new pack cleanly

## Implementation Checklist

1. Pick the narrowest matching primitive that solves the rule.
2. Add examples that show both the hit and the intentional non-hit.
3. Guard against quoted literal mentions and code-like contexts where relevant.
4. Keep messages short and explainable.
5. Prefer multiple suggestions only when several rewrites are genuinely useful.
6. Do not add bespoke morphology logic when the shared helper already covers the
   form family.
7. Update the relevant gap checklist only after tests and docs are in place.
