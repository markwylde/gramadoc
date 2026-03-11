# Rule Pack Foundations

Date: 2026-03-11

## Summary

This update strengthens the infrastructure around future gap-focused work
without pretending the harder contextual rule families are already done.

## Added

- lexical pack inventory snapshots in
  `packages/gramadoc/src/grammer/lexical-packs.test.ts`
- a shared high-priority gap evaluation set in
  `packages/gramadoc/src/grammer/evaluation-fixtures.ts`
- evaluation hygiene and false-positive separation tests in
  `packages/gramadoc/src/grammer/evaluation.test.ts` and
  `packages/gramadoc/src/grammer/evaluation-fixtures.test.ts`
- benchmark and performance guards in
  `packages/gramadoc/src/grammer/benchmark.test.ts` and
  `packages/gramadoc/src/grammer/performance.test.ts`

## Documented

- contributor rule authoring guidance
- overlap boundaries between conciseness, word-choice, and wordiness resources
- English variant strategy and consistency-first policy
- evaluation and rollout discipline, including editorial vs correctness labeling

## Still Open

- broader idiom and multi-token correction packs
- house-style wording implementation
- learner-specific packs
- contextual wrong-word scoring
- acceptance-rate analytics
