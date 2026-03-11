# Confusion Precision Improvements

Date: 2026-03-11

## Summary

This update tightens high-value confusion families so Gramadoc is quieter on
common predicate prose while staying strict on real possessive and contraction
mistakes.

## Improved

- moved homophone context decisions onto the contextual confusion owner so the
  analysis pipeline emits one warning per confusion span instead of stacked
  duplicates
- strengthened predicate handling for `your/you're`, `its/it's`, and
  `their/there/they're` with richer POS evidence, `be + predicate`
  disambiguation, and explicit fallback-evidence downweighting
- added antipattern-backed suppression for common developer-writing phrases such
  as `you're welcome`, `you're under pressure`, `your API`, and `their API`

## Measured

- expanded the shared evaluation corpus with dedicated confusion-pair fixtures
- added confusion-heavy regression coverage for docs-style prose
- expanded family-level reporting for noisy confusion pairs

## Rollout

- kept broader contextual scoring behind the existing experimental confusion
  pack
- documented confusion-family release visibility so future behavior changes stay
  explicit in release notes
