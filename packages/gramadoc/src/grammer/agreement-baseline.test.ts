import { describe, expect, it } from 'vitest'
import { analyzeText } from './utils'

type AgreementBaselineFixture = {
  family: string
  text: string
  expected: 'flag' | 'quiet'
  expectedLanguageTool: 'flag' | 'quiet'
  unsafeRewriteRisk?: boolean
}

// LanguageTool expectations in this file were verified against the public
// check API on 2026-03-11 while hardening the agreement rule.
const baselineFixtures: AgreementBaselineFixture[] = [
  {
    family: 'coordinated regression stays quiet',
    text: "I can't stand it and every update makes it worse.",
    expected: 'quiet',
    expectedLanguageTool: 'quiet',
    unsafeRewriteRisk: true,
  },
  {
    family: 'classic prepositional subject mismatch',
    text: 'The list of issues are ready.',
    expected: 'flag',
    expectedLanguageTool: 'flag',
  },
  {
    family: 'sentence-final plural mismatch',
    text: 'These plans works.',
    expected: 'flag',
    expectedLanguageTool: 'flag',
  },
  {
    family: 'adjectival complement plural mismatch',
    text: 'The results seems wrong.',
    expected: 'flag',
    expectedLanguageTool: 'flag',
  },
  {
    family: 'prepositional complement plural mismatch',
    text: 'Many teams depends on this.',
    expected: 'flag',
    expectedLanguageTool: 'flag',
  },
  {
    family: 'lexical ambiguity remains skipped',
    text: 'My friends likes coffee.',
    expected: 'flag',
    expectedLanguageTool: 'flag',
  },
]

function hasAgreementMatch(text: string) {
  return analyzeText(text).warnings.matches.some(
    (match) => match.rule.id === 'SUBJECT_VERB_AGREEMENT',
  )
}

describe('agreement baseline against LanguageTool', () => {
  it('separates false positives, false negatives, and unsafe rewrites', () => {
    const falsePositives: string[] = []
    const falseNegatives: string[] = []
    const unsafeRewrites: string[] = []
    const languageToolFalseNegatives: string[] = []

    for (const fixture of baselineFixtures) {
      const observed = hasAgreementMatch(fixture.text) ? 'flag' : 'quiet'

      if (fixture.expected === 'quiet' && observed === 'flag') {
        falsePositives.push(fixture.family)
      }

      if (fixture.expected === 'flag' && observed === 'quiet') {
        falseNegatives.push(fixture.family)
      }

      if (
        fixture.unsafeRewriteRisk &&
        fixture.expected === 'quiet' &&
        observed === 'flag'
      ) {
        unsafeRewrites.push(fixture.family)
      }

      if (
        fixture.expectedLanguageTool === 'quiet' &&
        fixture.expected === 'flag'
      ) {
        languageToolFalseNegatives.push(fixture.family)
      }
    }

    expect(falsePositives).toEqual([])
    expect(falseNegatives).toEqual(['lexical ambiguity remains skipped'])
    expect(unsafeRewrites).toEqual([])
    expect(languageToolFalseNegatives).toEqual([])
  })

  it('keeps the remaining reviewed skip explicit instead of hiding it in recall totals', () => {
    const reviewedSkips = baselineFixtures
      .filter(
        (fixture) =>
          fixture.expected === 'flag' && fixture.expectedLanguageTool === 'flag',
      )
      .filter((fixture) => !hasAgreementMatch(fixture.text))
      .map((fixture) => fixture.family)

    expect(reviewedSkips).toEqual(['lexical ambiguity remains skipped'])
  })

  it('keeps the unsafe rewrite set as a strict subset of false positives', () => {
    const unsafeRewriteFamilies = baselineFixtures
      .filter(
        (fixture) =>
          fixture.unsafeRewriteRisk &&
          fixture.expected === 'quiet' &&
          hasAgreementMatch(fixture.text),
      )
      .map((fixture) => fixture.family)

    expect(unsafeRewriteFamilies).toEqual([])
  })
})
