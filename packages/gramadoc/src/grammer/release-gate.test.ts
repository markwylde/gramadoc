import { describe, expect, it } from 'vitest'
import {
  highPriorityGapEvaluationFixtures,
  highPriorityGapFalsePositiveFixtures,
} from './evaluation-fixtures.js'
import { analyzeText } from './utils'

function toRuleIdSet(
  text: string,
  options?: Parameters<typeof analyzeText>[1],
) {
  return new Set(
    analyzeText(text, options).warnings.matches.map((match) => match.rule.id),
  )
}

describe('release gate for high-risk rule precision', () => {
  it('keeps risky false-positive fixtures at or below the configured failure rate', () => {
    const maxFalsePositiveRate = Number.parseFloat(
      process.env.GRAMADOC_RELEASE_GATE_RISKY_FP_RATE ?? '0',
    )
    let riskyChecks = 0
    let riskyFalsePositives = 0

    for (const fixture of highPriorityGapFalsePositiveFixtures) {
      const ruleIds = toRuleIdSet(fixture.text, {
        languageCode: fixture.languageCode,
        enabledRulePacks: fixture.enabledRulePacks,
        optionalRulePacks: fixture.optionalRulePacks,
        nativeLanguageProfile: fixture.nativeLanguageProfile,
      })

      for (const riskyRuleId of fixture.riskyRuleIds) {
        riskyChecks += 1

        if (ruleIds.has(riskyRuleId)) {
          riskyFalsePositives += 1
        }
      }
    }

    const observedFalsePositiveRate =
      riskyChecks === 0 ? 0 : riskyFalsePositives / riskyChecks

    expect(observedFalsePositiveRate).toBeLessThanOrEqual(maxFalsePositiveRate)
  })

  it('keeps risky positive fixtures above the configured recall floor', () => {
    const minRiskyRecall = Number.parseFloat(
      process.env.GRAMADOC_RELEASE_GATE_RISKY_RECALL_FLOOR ?? '1',
    )
    const riskyFixtures = highPriorityGapEvaluationFixtures.filter(
      (fixture) => fixture.riskTier === 'risky',
    )
    let riskyExpectedDetections = 0
    let riskyObservedDetections = 0

    for (const fixture of riskyFixtures) {
      const ruleIds = toRuleIdSet(fixture.text, {
        languageCode: fixture.languageCode,
        enabledRulePacks: fixture.enabledRulePacks,
        optionalRulePacks: fixture.optionalRulePacks,
        nativeLanguageProfile: fixture.nativeLanguageProfile,
      })

      for (const expectedRuleId of fixture.expectedRuleIds) {
        riskyExpectedDetections += 1

        if (ruleIds.has(expectedRuleId)) {
          riskyObservedDetections += 1
        }
      }
    }

    const observedRiskyRecall =
      riskyExpectedDetections === 0
        ? 1
        : riskyObservedDetections / riskyExpectedDetections

    expect(observedRiskyRecall).toBeGreaterThanOrEqual(minRiskyRecall)
  })
})
