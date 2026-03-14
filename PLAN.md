# Agreement False Positive Plan

This plan is for fixing the agreement false positive behind:

`Sometimes I think that I can fly.`

Today the engine incorrectly produces:

`Use "thinks" with "Sometimes".`

We are not treating this as a quick patch. The goal is to fix the underlying architecture sustainably so the engine becomes less likely to produce this entire class of false positives in the future.

## Goals

- [x] Stop the current false positive reliably.
- [x] Preserve existing high-value agreement detections.
- [x] Move ambiguity handling upstream when possible instead of growing rule-local exceptions.
- [x] Reduce duplication between clause analysis and agreement subject recovery.
- [x] Expand regression coverage so similar failures are caught automatically.

## Current Understanding

The failure is not caused by one isolated bug. It is a stacked failure across three layers:

1. Token annotation:
   `Sometimes` is currently treated as noun-like instead of adverbial.
   `fly` is also misread in this sentence, which weakens the parser's view of the embedded clause.
2. Clause analysis:
   The parser prefers `can` as the predicate head, so `think` stays in the clause subject span instead of being recognized as the matrix predicate.
3. Agreement rule recovery:
   The agreement rule then rebuilds subject structure locally and incorrectly promotes `Sometimes` to the subject head.

This means a rule-local exception on `sometimes` would be too narrow. It would hide the symptom without fixing the structural cause.

## Confirmed Breaking Examples

### Primary false positive

- [x] `Sometimes I think that I can fly.`

Why it breaks:
`Sometimes` is treated as noun-like, `think` is not anchored as the clause predicate, and the agreement rule's local subject scan resolves `Sometimes` as a singular subject.

How we want it to behave:
No agreement suggestion at all.

### Related quiet example already in the corpus

- [x] `Sometimes I think that I need to want to need to do the right thing.`

Why it matters:
This sentence already exists in the broader false-positive corpus, but that corpus is currently focused on a narrow subset of risky rule families and does not protect against agreement false positives.

How we want it to behave:
Remain quiet across agreement and infinitive-related rules unless we have very strong evidence of an actual error.

### Existing true positive we must preserve

- [x] `Still, archaeologists caution that discoveries like these often raises as many questions as it answers.`

Why it matters:
This is one reason the agreement rule allows certain adverbial material in its local scan. We still want to catch cases where an adverb like `often` appears between the true subject and the finite verb.

How we want it to behave:
Continue flagging `raises` and suggest `raise`.

### Existing true positive we must preserve

- [x] `Every update make it worse.`

Why it matters:
This is the bare-verb recovery path that provides useful coverage today. We do not want to weaken the rule so much that it stops catching clear singular-subject bare-verb mismatches.

How we want it to behave:
Continue flagging `make` and suggest `makes`.

### Existing structural precedent we should reuse

- [x] `I know that apples fell during the storm.`

Why it matters:
Another rule already had to learn that clause-introducing `that` should not be treated as a local noun phrase signal. That logic is a good model for moving shared clause-awareness upstream.

How we want it to behave:
Treat `that` as introducing a content clause, not as evidence for a noun-headed subject window.

## Strategy

We should fix this in phases, from safest containment to deeper structural cleanup.

### Phase 1: Lock Down Regressions

- [x] Keep the new focused failing regression for `Sometimes I think that I can fly.` in the agreement rule suite.
- [x] Add analyzer-level regression coverage for this same sentence so we validate the full pipeline, not only the isolated rule.
- [x] Add a release-gate false-positive fixture for sentence-initial adverbial content clauses.
- [x] Add paired preservation tests for the important true positives we rely on today, especially adverb-intervening agreement cases and singular bare-verb recovery cases.

Why this phase matters:
We should not refactor syntax or disambiguation without pinning down both the bad behavior and the good behavior we need to preserve.

### Phase 2: Improve Subject Confidence Rules

- [x] Audit the sentence-initial subject recovery path that allowed weak opener tokens to survive into agreement resolution.
- [x] Introduce a stronger distinction between "strong subject evidence" and "weak open-class guess" across the reviewed agreement subject-confidence paths.
- [x] Prevent morphology-only noun-like sentence openers from outranking nearby high-confidence pronouns or determiners.
- [x] Review the capitalized-name heuristic so sentence-initial words followed by `I` do not accidentally look like proper names.

Why this phase matters:
Even if upstream parsing improves, agreement should still be cautious about emitting a grammar rewrite when the subject head is inferred from weak evidence.

Desired outcome:
The agreement rule should prefer a nearby high-confidence pronoun like `I` over a weak noun-like reading such as `Sometimes`.

### Phase 3: Fix Token-Level Annotation

- [x] Audit the adverb lexicon and contextual disambiguation for sentence-initial adverbials like `sometimes`, `usually`, `occasionally`, `frequently`, and similar discourse openers.
- [x] Revisit the trailing-`s` noun heuristic so it does not over-promote common adverbials.
- [x] Revisit the `-ly` adverb heuristic so words like `fly` are not incorrectly treated as adverbs in ordinary verbal contexts.
- [x] Add token-level tests for the specific annotation outcomes we need in matrix-clause plus content-clause sentences.

Why this phase matters:
If annotation is wrong, every downstream rule has to defend itself separately. That creates brittle, duplicated heuristics.

Desired outcome:
`Sometimes` should remain plausibly adverbial, and `fly` should remain plausibly verbal in `I can fly`.

### Phase 4: Improve Shared Clause Analysis

- [x] Teach the shared clause layer to recognize matrix verbs followed by content clauses, especially patterns like `I think that ...`, `We know that ...`, and similar embedding structures.
- [x] Promote clause-introducing `that` into shared syntax handling so the shared clause layer splits matrix and embedded clauses.
- [x] Prevent auxiliary-driven embedded clauses from hiding the matrix predicate in `... think that I can ...` style sentences by splitting the content clause upstream.
- [x] Add clause-annotation tests that assert the intended structure for sentences like `Sometimes I think that I can fly.`

Why this phase matters:
Right now the clause system and the agreement rule each do their own structural guessing. That is expensive to maintain and a common source of false positives.

Desired outcome:
The shared syntax layer should identify `think` as the matrix predicate and `I can fly` as an embedded clause, giving downstream rules cleaner structure to rely on.

### Phase 5: Simplify the Agreement Rule

- [x] Refactor `SUBJECT_VERB_AGREEMENT` so it relies more on shared clause structure and less on rebuilding subject windows locally.
- [x] Reserve rule-local recovery only for carefully bounded cases where the shared structure is incomplete but the evidence is still strong.
- [x] Require stronger confidence before emitting singular-subject bare-verb rewrites.
- [x] Prefer "do not fire" over a speculative grammar rewrite when subject identification is uncertain.

Why this phase matters:
The current rule carries too much syntax responsibility. That makes it hard to reason about and hard to keep precise.

Desired outcome:
The agreement rule becomes simpler, more explainable, and less likely to invent subjects from weak local signals.

### Phase 6: Expand Sustainable Quality Gates

- [x] Add a dedicated set of agreement false-positive fixtures, especially around sentence-initial adverbials, content clauses, reporting verbs, and embedded predicates.
- [x] Add mixed suites that pair false-positive examples with nearby true positives so future changes do not solve one side by breaking the other.
- [x] Document the confidence model for subject resolution and when rules should decline to emit a suggestion.
- [x] Review other syntax-sensitive rules for duplicated clause/subject heuristics that could be centralized later.

Why this phase matters:
The sustainable fix is not only code. It is also test shape, review discipline, and shared abstractions.

## Implementation Principles

- [x] Prefer upstream fixes over rule-local exception lists.
- [x] Prefer shared syntax improvements over duplicated heuristics in individual rules.
- [x] Treat low-confidence structure as a reason to stay quiet.
- [x] Preserve precision even if recall improves more slowly.
- [x] Add tests before broadening heuristics.
- [x] Avoid shipping a patch that only fixes `sometimes` if the real failure mode is "sentence-initial adverbial mistaken for subject".

## Proposed Order Of Work

- [x] Land regression coverage first.
- [x] Add subject-confidence safeguards in the agreement rule to contain the current issue.
- [x] Improve token annotation for adverbial openers and `fly`-style `-ly` edge cases.
- [x] Upgrade shared clause analysis for content-clause structures.
- [x] Refactor agreement to consume shared structure and remove now-redundant local heuristics.
- [x] Expand release-gate coverage for agreement false positives.

## Definition Of Done

- [x] `Sometimes I think that I can fly.` stays quiet.
- [x] `Sometimes I think that I need to want to need to do the right thing.` stays quiet.
- [x] `discoveries like these often raises ...` still fires correctly.
- [x] `Every update make it worse.` still fires correctly.
- [x] Clause annotation for matrix verb plus `that`-clause sentences matches the intended structure.
- [x] Agreement suggestions are suppressed when subject resolution depends only on weak evidence.
- [x] The new tests clearly explain both the failure and the intended long-term behavior.

## Notes

This work should be done deliberately. The goal is not to make the rule more defensive by accretion. The goal is to reduce the amount of speculation the engine performs before emitting a grammar rewrite.

## Current Status

- [x] First sustainable implementation slice landed.
- [x] Shared annotation now keeps common sentence-initial frequency adverbs adverbial instead of noun-like.
- [x] Shared clause analysis now splits matrix predicates from `that`-introduced content clauses in the target pattern.
- [x] Shared content-clause `that` detection now lives in `packages/gramadoc/src/grammer/content-clauses.ts` and is reused by the clause layer and the articles/determiners rule.
- [x] Agreement subject recovery now trims sentence-initial adverbial lead-ins before resolving bare-verb rewrites.
- [x] Agreement proper-name heuristics now reject pronoun-bearing capitalization-only lead-ins such as `Today I ...` and `Tomorrow I ...`.
- [x] The confidence model is documented in `docs/rule-authoring-guide.md`, with rollout guidance in `docs/evaluation-rollout-discipline.md`.
- [x] The next shared-centralization targets are identified: `agreement-errors`, `articles-determiners`, and `pronouns`.
- [x] The broader agreement-rule simplification is now landed in a bounded form: finite-form agreement prefers shared clause subjects by default, while local recovery is reserved for incomplete clause subjects, coordinated continuations, and relative-clause antecedents.

## Final Slice

- [x] Extract shared content-clause `that` detection into `packages/gramadoc/src/grammer/content-clauses.ts`.
- [x] Reuse that helper from the clause layer and the articles/determiners rule while keeping their acceptance thresholds explicit.
- [x] Refactor `SUBJECT_VERB_AGREEMENT` to consume shared resolved subjects in bounded cases while preserving the current true-positive floor.

## Current Landing

- [x] Agreement subject-head resolution now goes through one shared resolver instead of separate clause and local subject-head parsers.
- [x] Finite-form agreement now prefers shared clause subjects by default and only expands locally when the clause subject is incomplete or clearly overridden by later structure.
- [x] Bare-verb recovery still exists, but it is now intentionally bounded to strong local evidence such as determiner-led singular heads, partitives, coordinated continuations, and relative-clause antecedents.
- [x] Coordinated continuation fallback still preserves document-level detections like `... demand ... are ...` without reopening the original sentence-initial adverb false positive.
- [x] Relative-clause antecedent recovery now preserves detections like `complex that include ...` and `process that can takes ...` without routing content-clause `that` through the same path.
