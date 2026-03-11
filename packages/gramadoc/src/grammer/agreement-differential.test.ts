import { describe, expect, it } from 'vitest'
import {
  languageToolAgreementFalseNegativeFixtures,
  languageToolAgreementFalsePositiveFixtures,
} from './agreement-differential-fixtures.js'
import { analyzeText } from './utils'

function toRuleIdSet(text: string) {
  return new Set(
    analyzeText(text).warnings.matches.map((match) => match.rule.id),
  )
}

describe('agreement differential corpus vs LanguageTool', () => {
  it('keeps correct agreement fixtures quiet', () => {
    for (const fixture of languageToolAgreementFalsePositiveFixtures) {
      const ruleIds = toRuleIdSet(fixture.text)

      expect(ruleIds.has('SUBJECT_VERB_AGREEMENT'), fixture.family).toBe(false)

      for (const forbiddenRuleId of fixture.forbiddenRuleIds ?? []) {
        expect(ruleIds.has(forbiddenRuleId), fixture.family).toBe(false)
      }
    }
  })

  it('keeps incorrect agreement fixtures detectable', () => {
    for (const fixture of languageToolAgreementFalseNegativeFixtures) {
      const ruleIds = toRuleIdSet(fixture.text)

      for (const expectedRuleId of fixture.expectedRuleIds) {
        expect(ruleIds.has(expectedRuleId), fixture.family).toBe(true)
      }
    }
  })

  it('tracks false positives, false negatives, and unsafe rewrites separately', () => {
    let gramadocFalsePositives = 0
    let gramadocFalseNegatives = 0
    let gramadocUnsafeRewriteRegressions = 0
    let languageToolFalsePositiveFindings = 0
    let languageToolFalseNegativeFindings = 0

    for (const fixture of languageToolAgreementFalsePositiveFixtures) {
      const ruleIds = toRuleIdSet(fixture.text)
      const fired = ruleIds.has('SUBJECT_VERB_AGREEMENT')

      if (fired) {
        gramadocFalsePositives += 1
      }

      if (fixture.unsafeRewrite && fired) {
        gramadocUnsafeRewriteRegressions += 1
      }

      if (fixture.languageTool.flagged) {
        languageToolFalsePositiveFindings += 1
      }
    }

    for (const fixture of languageToolAgreementFalseNegativeFixtures) {
      const ruleIds = toRuleIdSet(fixture.text)
      const detected = fixture.expectedRuleIds.every((ruleId) =>
        ruleIds.has(ruleId),
      )

      if (!detected) {
        gramadocFalseNegatives += 1
      }

      if (!fixture.languageTool.flagged) {
        languageToolFalseNegativeFindings += 1
      }
    }

    expect({
      languageToolFalsePositiveFindings,
      languageToolFalseNegativeFindings,
      gramadocFalsePositives,
      gramadocFalseNegatives,
      gramadocUnsafeRewriteRegressions,
    }).toEqual({
      languageToolFalsePositiveFindings: 1,
      languageToolFalseNegativeFindings: 2,
      gramadocFalsePositives: 0,
      gramadocFalseNegatives: 0,
      gramadocUnsafeRewriteRegressions: 0,
    })
  })
})
