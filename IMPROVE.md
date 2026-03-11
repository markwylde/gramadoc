# Improve Plan For Context Rules

This plan focuses on the gap exposed by `your/you're`-style false positives.

Removing the external wordlist dependency keeps the project clean, but it does
not solve the main problem in this area:

- Gramadoc still relies on a very small local POS lexicon
- unknown or weakly tagged words often fall back to `noun`
- our contextual confusion logic is shallow
- we currently emit overlapping warnings from multiple rule paths
- our evaluation set for these pairs is still too small

The goal is not to clone any external checker rule-for-rule. The goal is to
reach high trust for high-value confusion pairs while keeping Gramadoc's
technical-writing bias and rollout discipline.

## Current Gap

For `But you're stuck with macOS.` the comparison baseline stays quiet, while Gramadoc
currently misfires.

Why:

- `YOUR_YOURE` only looks at very small next-token cues
- `you're` gets weak support unless the next token is on a tiny whitelist or
  looks like a `verb`
- words like `stuck` are not modeled well in our POS hints, so they can collapse
  to `noun`
- the same bad ranking can surface from both the contextual confusion rule and
  the homophone spelling rule

## Success Criteria

We should consider this area healthy when all of the following are true:

- common predicate cases stay quiet:
  `you're stuck`, `you're free`, `you're offline`, `you're safe`, `you're done`
- possessive cases still fire correctly:
  `your team`, `your laptop`, `your account`, `your build`
- duplicate reports for the same confusion decision are removed
- new confusion rules ship with explicit positive and negative fixtures
- false positives keep shrinking for high-priority confusion pairs

## Phase 1: Stop The Easy False Positives

### 1. Make `YOUR_YOURE` more conservative

Tighten the rule before broadening it.

Work:

- require stronger evidence before suggesting `your` from a noun-like follower
- do not treat fallback-only POS guesses as strong evidence
- add a larger predicate-word allowlist for `you're`
- lower confidence or suppress the rule when both candidates have weak evidence

Expected outcome:

- immediate reduction in false positives on `you're + predicate/adjective-like`
  text

### 2. Remove duplicate warning paths

Right now the same confusion ranking logic effectively appears in both:

- `semantics-clarity/contextual-errors`
- `basic-spelling/HOMOPHONE_SPELLING_MISTAKES`

Work:

- pick a single owner for homophone context decisions
- either remove the spelling-layer duplicate or turn it into a thin wrapper over
  the contextual rule with deduplication
- ensure UI only gets one warning per span for the same confusion family

Expected outcome:

- fewer noisy stacked warnings
- cleaner analytics and easier debugging

### 3. Add regression fixtures immediately

Create a focused fixture pack for `your/you're`, `its/it's`, and
`whose/who's`.

Must include quiet examples like:

- `But you're stuck with macOS.`
- `You're done when the build is green.`
- `You're offline right now.`
- `Hope you're well.`
- `You're under pressure.`

Must include positive examples like:

- `Your team is ready.`
- `Your laptop is overheating.`
- `Your build is failing.`
- `Your account settings are here.`

Expected outcome:

- every future tweak in this area gets measured against real failure modes

## Phase 2: Upgrade Local Grammar Signals

### 4. Expand the local POS lexicon for predicate words

We need better coverage for words that commonly appear after `be`.

Work:

- add a curated predicate/adjective/state-word inventory:
  `stuck`, `done`, `offline`, `online`, `ready`, `safe`, `wrong`, `okay`,
  `fine`, `available`, `interested`, `busy`, `sorry`, `aware`, `alive`
- add high-value past-participle-as-adjective forms that frequently follow
  auxiliaries
- separate "safe lexical signal" from fallback guesses

Expected outcome:

- fewer noun fallbacks
- better scoring for confusion rules without jumping to broad statistical models

### 5. Improve contextual POS disambiguation around auxiliaries

Right now our disambiguation is helpful but still very narrow.

Work:

- add a `be + predicate` disambiguation pass
- let auxiliary context promote likely adjectives and participles, not just
  verbs
- allow a token to keep richer evidence internally even if the final hint set is
  reduced for downstream checks

Expected outcome:

- `you're stuck`, `it's broken`, `they're ready`, `we're offline` become easier
  to reason about correctly

### 6. Introduce evidence quality into confusion scoring

Not all POS evidence should count equally.

Work:

- distinguish:
  lexical evidence
  morphology evidence
  contextual disambiguation evidence
  fallback guesses
- downweight or ignore fallback-only noun evidence in high-risk confusion rules
- expose why a candidate won during tests and debug output

Expected outcome:

- safer scoring
- clearer rule authoring feedback

## Phase 3: Add Pattern Coverage

The broader benchmark is ahead here because it does not rely on one mechanism. It uses a
mix of:

- statistical confusion scoring
- rule-specific patterns
- large antipattern inventories
- real POS and chunk signals

We should copy the strategy, not necessarily the exact implementation.

### 7. Build targeted micro-rules for top confusion families

Start with the highest-value pairs:

- `your/you're`
- `its/it's`
- `whose/who's`
- `their/there/they're`

Work:

- add a narrow set of high-precision micro-rules for common contexts
- keep each rule family small and test-heavy
- separate:
  contraction-needed cases
  possessive-needed cases
  ambiguous or low-confidence cases

Expected outcome:

- stronger precision than a single generic confusion scorer

### 8. Add antipattern inventories

Trusted tools win a lot of trust by explicitly suppressing known bad matches.

Work:

- add per-confusion-family antipatterns
- port only the cases that matter for developer and product writing first
- treat antipatterns as first-class assets with their own tests

Example targets:

- `you're welcome`
- `you're right`
- `you're free`
- `you're under`
- `you're on time`
- `your API`
- `your config`
- `your build`

Expected outcome:

- faster precision gains than trying to solve everything with deeper inference

## Phase 4: Measurement And Differential Work

### 9. Build a confusion-pair benchmark corpus

The shared evaluation set should get a dedicated confusion section with:

- positives Gramadoc must catch
- negatives Gramadoc must stay quiet on
- technical-writing examples
- casual prose examples
- edge cases copied from real bug reports

Suggested sections:

- predicate adjective cases
- participle cases
- noun phrase possessives
- quoted text
- sentence-start capitalization
- technical nouns and product vocabulary

### 10. Add differential reporting by family

The existing comparison reporting is useful, but we need more visibility for
this kind of gap.

Work:

- summarize false positives by confusion family
- explicitly report:
  baseline quiet / Gramadoc fired
  baseline fired / Gramadoc quiet
  both fired
- track noisy pairs separately from missed detections

Expected outcome:

- easier prioritization
- clearer proof when a change actually closes the evaluation gap

## Phase 5: Rollout Discipline

### 11. Keep risky confusion expansions gated until stable

Not every contextual rule should be default-on immediately.

Work:

- keep broader contextual packs behind the existing experimental toggle until
  precision is proven
- allow narrow deterministic or antipattern-backed rules to graduate first
- record major behavior changes in release notes

### 12. Define a graduation checklist

A confusion family can move to stronger default behavior only when:

- positive fixtures pass
- quiet fixtures pass
- no duplicate warnings remain
- comparison reporting shows improvement, not just different behavior
- technical-writing precision stays clean

## Suggested Execution Order

1. add regression fixtures for `your/you're`
2. remove duplicate homophone/contextual reporting
3. make fallback POS evidence non-authoritative in confusion scoring
4. expand predicate-word lexical coverage and `be + predicate` disambiguation
5. add narrow `your/you're` antipatterns and micro-rules
6. repeat the pattern for `its/it's` and `whose/who's`
7. improve the differential harness reporting for confusion families

## First Concrete Milestone

Ship a small milestone that only does this:

- fix `But you're stuck with macOS.`
- fix similar predicate cases such as `you're done`, `you're offline`,
  `you're safe`
- keep correct possessive detections like `your team` and `your build`
- eliminate duplicate warning emission for the same span
- add permanent regression coverage

If we do just that well, Gramadoc will already feel materially stronger in this
area without overcommitting to a huge architecture rewrite.

## Checklist

### Phase 1: Stop The Easy False Positives

- [x] Make `YOUR_YOURE` more conservative
- [x] Treat fallback-only POS guesses as weak evidence for confusion scoring
- [x] Add a larger predicate-word allowlist for `you're`
- [x] Suppress or lower-confidence matches when evidence is weak on both sides
- [x] Remove duplicate warning paths between contextual confusion and homophone spelling
- [x] Ensure the UI only receives one warning per confusion span
- [x] Add focused regression fixtures for `your/you're`
- [x] Add focused regression fixtures for `its/it's`
- [x] Add focused regression fixtures for `whose/who's`

### Phase 2: Upgrade Local Grammar Signals

- [x] Expand the local POS lexicon for predicate and state words
- [x] Add high-value participle-as-adjective coverage
- [x] Add `be + predicate` contextual POS disambiguation
- [x] Let auxiliary context promote likely adjectives and participles
- [x] Preserve richer evidence internally for downstream rule scoring
- [x] Distinguish lexical, morphology, contextual, and fallback evidence in scoring
- [x] Downweight or ignore fallback-only noun evidence in risky confusion rules
- [x] Expose candidate win evidence in tests or debug output

### Phase 3: Add Pattern Coverage

- [x] Build narrow `your/you're` micro-rules
- [x] Build narrow `its/it's` micro-rules
- [x] Build narrow `whose/who's` micro-rules
- [x] Build narrow `their/there/they're` micro-rules
- [x] Add per-family antipattern inventories
- [x] Port high-value developer-writing antipatterns first
- [x] Add tests for antipattern suppression cases

### Phase 4: Measurement And Differential Work

- [x] Create a dedicated confusion-pair benchmark corpus
- [x] Add positive fixtures Gramadoc must catch
- [x] Add negative fixtures Gramadoc must keep quiet on
- [x] Include technical-writing and product-writing examples
- [x] Include bug-report-derived edge cases
- [x] Add differential reporting by confusion family
- [x] Report `baseline quiet / Gramadoc fired`
- [x] Report `baseline fired / Gramadoc quiet`
- [x] Report `both fired`

### Phase 5: Rollout Discipline

- [x] Keep broader contextual expansions behind the experimental toggle until stable
- [x] Graduate narrow deterministic confusion rules first
- [x] Add release-note visibility for material behavior changes
- [x] Define a graduation checklist for default-on rollout

### First Milestone

- [x] Fix `But you're stuck with macOS.`
- [x] Fix similar predicate cases such as `you're done`
- [x] Fix similar predicate cases such as `you're offline`
- [x] Fix similar predicate cases such as `you're safe`
- [x] Keep correct possessive detections like `your team`
- [x] Keep correct possessive detections like `your build`
- [x] Eliminate duplicate warning emission for the same span
- [x] Add permanent regression coverage for the milestone cases
