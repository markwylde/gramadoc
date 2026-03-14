# Morphology Design Note

This note defines the shared morphology contract for Gramadoc after the lemma
and verb-form refactor.

## Goal

Give the analyzer one deterministic answer to:

- what the token's primary lemma is
- which verb form the token most likely represents
- how trustworthy that answer is
- whether ambiguity should suppress rule output

Rules should consume this shared analysis instead of deriving local stems from
suffixes.

## Token Contract

Each token exposes:

- `lemma`: the primary normalized lemma the engine will use for grouping and
  shared reasoning
- `morphology`: the structured analysis object

The `morphology` object carries:

- `lemma`: primary lemma
- `lemmaAlternates`: other plausible lemmas when the surface is ambiguous
- `provenance`: one of `identity`, `contraction`, `irregular`, `regular`,
  `heuristic`, `ambiguous`, or `unresolved`
- `confidence`: `high`, `medium`, or `low`
- `isAmbiguous` and `ambiguityTags`
- `isDictionaryWord`
- `verb`: structured verb-form analysis

The `verb` object carries:

- whether the token is a credible verb candidate at all
- the detected surface form when one is available:
  `base`, `third-person-singular`, `past`, `past-participle`,
  `present-participle`
- the recovered base form
- whether the token can also plausibly be base, past, participle, or present
  participle
- whether the token is lexicalized enough that adjective-style readings are
  expected

## Lemma Semantics

`lemma` is a best shared normalization for rule coordination, not a guarantee of
an unambiguous linguistic lemma in every context.

That means:

- high-confidence irregular and regular inflections should normalize to the base
  lemma
- contractions should normalize to the lemma of the underlying auxiliary or
  modal
- ambiguous surfaces may still expose a primary lemma, but must also mark the
  ambiguity explicitly
- rules should not treat `lemma === normalized` or `lemma !== normalized` as a
  semantic signal on its own

When ambiguity matters to product behavior, rules should consult
`token.morphology` directly instead of relying on the flat lemma string.

## Provenance And Confidence

The contract separates source from confidence.

Provenance meanings:

- `identity`: the token already matches a known base form
- `contraction`: lemma comes from a contraction resource
- `irregular`: lemma/form comes from irregular verb data
- `regular`: lemma/form comes from shared regular inflection rules
- `heuristic`: the engine only has pattern-based support
- `ambiguous`: multiple plausible readings remain
- `unresolved`: no trustworthy morphology answer was found

Confidence meanings:

- `high`: backed by explicit lexical or irregular data
- `medium`: supported by regular inflection logic with enough lexical support
- `low`: weak heuristic evidence only

Rules should be stricter as confidence drops. Default-on grammar suggestions
should generally require at least medium confidence and should suppress output
entirely on unresolved ambiguity.

## Ambiguity Handling

Ambiguity is a first-class outcome, not a failure mode.

Examples:

- surfaces like `read` can be base or past/past-participle
- some irregular surfaces share more than one form family
- some suffix shapes are compatible with both noun and verb readings

Expected rule behavior:

- ambiguity should suppress single-step rewrite suggestions unless the context
  resolves it safely
- analyzer-level diagnostics should prefer explainable suppression over guessing
- tests should cover quiet cases as deliberately as positive detections

## Dictionary Usage

Dictionary validation is a support signal, not the source of morphology truth.

Use it to:

- validate a regular candidate when multiple bases are possible
- avoid absurd stems from mechanical stripping
- provide a safety guard for weak heuristic recovery

Do not use it to:

- invent a lemma without an inflection pattern
- override explicit irregular data
- treat every dictionary-backed `-s` word as a verb

In practice, this means the shared layer can use dictionary evidence as a
tie-breaker for `-ed` and `-ing` recovery, while being more conservative for
third-person-singular `-s` forms that often collide with plural nouns.

## Form Families

The shared layer is expected to handle:

- regular `-ed`
- consonant doubling such as `planned`
- `-ied` to `-y` such as `studied`
- `+d` verbs such as `agreed`
- `-ing`, including `make -> making` and `die -> dying`
- third-person singular `-s`
- irregular past and participle forms
- lexicalized items that look inflected but should not force verb-only logic

## Rule Conservatism

The refactor is meant to improve correctness without broadening noisy rule
behavior.

Rules should stay conservative in these situations:

- prepositional `to`
- quoted example sentences
- headings, list items, and blockquotes when the rule family already suppresses
  them
- editorial or dialectal examples that the product treats as mentions rather
  than errors

Shared morphology should make rules more consistent, not more eager.
