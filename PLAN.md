# Morphology And Lemma Refactor Plan

This plan treats the current `need -> ne` false positive as a symptom, not the
main problem.

The real goal is to make inflection, lemma, and verb-form reasoning a shared,
reliable part of the analysis pipeline so rules stop inventing their own local
stemming logic.

## Principles

- [ ] Optimize for correctness and internal consistency over minimal change.
- [ ] Prefer one authoritative morphology pipeline over rule-local heuristics.
- [ ] Prefer explicit data models over implicit string slicing.
- [ ] Treat ambiguous forms as ambiguous instead of forcing a guess.
- [ ] Keep rules deterministic and explainable.
- [ ] Make quiet-case coverage as important as positive detection coverage.

## Phase 1: Define The Target Model

- [ ] Write a short design note that defines the desired contract for:
  - `lemma`
  - inflection/form analysis
  - confidence/provenance
  - ambiguity handling
- [ ] Decide whether `lemma` should represent:
  - a best-effort normalized base form
  - a high-confidence linguistic lemma only
  - a richer structure with primary lemma plus alternates
- [ ] Decide what token-level morphology data should exist beyond `lemma`, such
  as:
  - verb form classification
  - candidate base form
  - tense/aspect clues
  - irregular/heuristic/dictionary provenance
  - ambiguity flags
- [ ] Define the expected behavior for these form families:
  - regular `-ed`
  - consonant doubling
  - `-ied` / `-y`
  - `+d` verbs such as `agreed`
  - `-ing`
  - third-person singular `-s`
  - irregular past and participle forms
  - lexicalized words that merely end in verb-like suffixes
- [ ] Decide how dictionary validation should be used:
  - support signal
  - tie-breaker
  - safety guard
  - never the sole source of morphology truth
- [ ] Define which current rule behaviors are intended to become stricter,
  looser, or more conservative under the new model.

## Phase 2: Audit The Current System

- [ ] Inventory every place that derives or depends on lemmas, stems, or verb
  forms.
- [ ] Document all rule-local morphology logic and ad hoc suffix handling.
- [ ] Document all places where `lemma === normalized` is used as a semantic
  signal.
- [ ] Audit the current contents and coverage quality of:
  - irregular lemma resources
  - verb lexicons
  - participial adjective allowlists
  - fallback POS guesses
  - dictionary resources
- [ ] Build a written list of known failure modes, including:
  - false positives like `want to need`
  - false negatives the current rules miss
  - cases where two parts of the engine disagree about the same token
- [ ] Identify every public type or helper that will need to change if token
  morphology becomes richer.

## Phase 3: Build A Shared Morphology Layer

- [ ] Introduce a dedicated shared module for morphology and inflection
  analysis.
- [ ] Move all base-form recovery logic into that shared module.
- [ ] Replace string-slicing helpers with structured functions such as:
  - verb-form analysis
  - lemma derivation
  - candidate base-form recovery
  - irregular-form lookup
  - ambiguity reporting
- [ ] Represent analysis results as structured data rather than bare strings.
- [ ] Distinguish at least:
  - exact lexical match
  - irregular mapping
  - regular inflection mapping
  - heuristic guess
  - unresolved/ambiguous
- [ ] Ensure the shared module can answer both of these questions separately:
  - "What is this token's most likely lemma?"
  - "Is this token a non-base verb form that should be rewritten here?"
- [ ] Make the module context-aware where needed, especially for `to + verb`
  and auxiliary-driven verb contexts.
- [ ] Add clear provenance fields so rules can decide whether to trust or ignore
  a derived result.

## Phase 4: Strengthen The Linguistic Resources

- [ ] Replace tiny curated irregular mappings with a more complete irregular verb
  resource.
- [ ] Add explicit coverage for common regular inflection patterns and their
  exceptions.
- [ ] Add exception data for words that look inflected but are actually base
  forms or non-verbs.
- [ ] Expand or replace the current verb lexicon so it is suitable as a shared
  linguistic resource, not just a hint list.
- [ ] Revisit participial adjectives and other lexicalized forms so they stop
  polluting verb-only reasoning.
- [ ] Decide whether to keep the current dictionary source, expand it, or
  replace it with a resource better suited to linguistic validation.

## Phase 5: Refactor Token Annotation

- [ ] Make token annotation call the shared morphology layer instead of the
  current naive lemma heuristics.
- [ ] Replace `getLemma` / `getLemmaAnnotation` with the new shared analysis
  path.
- [ ] Extend the `Token` type to expose the richer morphology data the rules
  need.
- [ ] Revisit POS hint generation so morphology evidence and lexical evidence
  are combined consistently.
- [ ] Revisit contextual disambiguation to consume the new token morphology
  fields instead of inferring from suffixes alone.
- [ ] Remove any token fields whose meaning becomes redundant or misleading
  after the refactor.

## Phase 6: Refactor Rules To Consume Shared Analysis

- [ ] Remove rule-local base-form recovery from verb usage rules.
- [ ] Refactor `INFINITIVE_BASE_VERB` to rely on shared morphology decisions.
- [ ] Refactor `QUESTION_LEAD_BASE_VERB` to rely on the same shared logic.
- [ ] Audit other grammar rules for hidden morphology assumptions.
- [ ] Audit style and repetition rules that depend on `lemma`.
- [ ] Audit helper resources and pattern filters that use `lemma !== normalized`
  as a proxy for verb-ness.
- [ ] Replace brittle string-shape checks with explicit morphology/form tests
  wherever possible.
- [ ] Delete obsolete helper code once the shared path fully replaces it.

## Phase 7: Build A Real Test Matrix

- [ ] Add dedicated unit tests for the shared morphology layer.
- [ ] Add table-driven coverage for:
  - base forms
  - regular inflections
  - irregular inflections
  - ambiguous forms
  - lexicalized exceptions
  - non-verbs with verb-like endings
- [ ] Add explicit regression tests for known bad suggestions, including:
  - `want to need`
  - `hoped to agreed`
  - prepositional `to`
  - quoted examples
  - technical prose
  - headings, list items, and blockquotes where relevant
- [ ] Add analyzer-level tests that prove token morphology and rule output agree
  with each other.
- [ ] Add differential tests that compare old and new outputs on a broader text
  corpus.
- [ ] Review performance impact and add targeted performance guards if the new
  morphology layer is materially more expensive.

## Phase 8: Recalibrate Rule Confidence And Product Behavior

- [ ] Revisit which grammar suggestions should fire only on high-confidence
  morphology evidence.
- [ ] Decide where ambiguity should suppress a suggestion entirely.
- [ ] Review replacement safety so the editor never offers low-confidence single
  rewrites as if they were certain.
- [ ] Reclassify any rules that turn out to be editorial rather than correctness
  driven once the morphology is more accurate.
- [ ] Add or refine diagnostics so future false positives are easier to explain
  from internal state.

## Phase 9: Documentation And Maintenance Guardrails

- [ ] Update the rule authoring guide to state that rule-local morphology logic
  is not allowed when a shared helper exists.
- [ ] Document the new token morphology fields and when rule authors should rely
  on them.
- [ ] Document ambiguity and confidence expectations for new grammar rules.
- [ ] Add a short maintenance guide for extending irregular verbs, exceptions,
  and lexicons.
- [ ] Add a checklist for future rule authors covering morphology-sensitive
  false-positive review.

## Phase 10: Completion Criteria

- [ ] All lemma and base-form recovery flows go through one shared analysis
  layer.
- [ ] No default-on grammar rule contains bespoke suffix-stripping logic.
- [ ] Shared morphology tests cover the full set of currently known failures.
- [ ] Rule-level regression tests cover both hits and quiet cases.
- [ ] Full package tests pass after the refactor.
- [ ] The editor no longer produces the `want to need -> ne` class of
  suggestion.
- [ ] The codebase has clearer types, fewer duplicate heuristics, and a single
  answer to "what form is this token?"
