# Morphology Maintenance Guide

This guide covers how to extend the shared morphology layer without reintroducing
rule-local stemming.

## When To Change Data

Update the shared morphology resources when you need:

- a new irregular past or participle mapping
- a new contracted auxiliary or modal mapping
- a new known base verb that should count as lexical support
- a lexicalized participial adjective or suffix-lookalike exception

Avoid patching individual rules first. If the behavior is morphology-sensitive,
the shared layer should usually change before the rule does.

## Extension Order

1. Add or update the shared resource in
   `packages/gramadoc/src/grammer/morphology.ts`.
2. Add or extend unit coverage in
   `packages/gramadoc/src/grammer/morphology.test.ts`.
3. Add rule-level regression coverage only after the shared analysis behaves as
   expected.

## Irregular Verbs

When adding an irregular verb:

- add the base lemma to the shared irregular table
- include whichever surfaces matter: past, past participle, third-person
  singular, and present participle
- add at least one rewrite-context test when the surface should change in a rule

Prefer complete verb entries over isolated one-off surface mappings.

## Exceptions And Quiet Cases

If a word only looks inflected, add data or tests so the shared layer stays
quiet.

Typical examples:

- nouns ending in `-s` such as `status` or `series`
- base verbs ending in `-ed` such as `need`
- ambiguous zero-change forms such as `read`
- quoted examples, technical prose, headings, and blockquotes

## Rule Author Checklist

Before shipping a morphology-sensitive rule change:

- confirm the rule uses `token.morphology` or a shared helper
- confirm ambiguity suppresses unsafe rewrites
- add one positive example and one quiet-case example
- check technical prose and quoted-example behavior
- update `PLAN.md` only after the implementation and tests are done
