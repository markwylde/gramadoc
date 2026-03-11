import { describe, expect, it } from 'vitest'
import {
  highPriorityGapEvaluationFixtures,
  highPriorityGapFalsePositiveFixtures,
} from './evaluation-fixtures.js'
import { analyzeText } from './utils'

describe('high-priority gap evaluation fixtures', () => {
  it('covers expected detections for the current low-risk high-priority gap families', () => {
    for (const fixture of highPriorityGapEvaluationFixtures) {
      const ruleIds = new Set(
        analyzeText(fixture.text, {
          languageCode: fixture.languageCode,
          enabledRulePacks: fixture.enabledRulePacks,
          optionalRulePacks: fixture.optionalRulePacks,
          nativeLanguageProfile: fixture.nativeLanguageProfile,
        }).warnings.matches.map((match) => match.rule.id),
      )

      for (const expectedRuleId of fixture.expectedRuleIds) {
        expect(ruleIds.has(expectedRuleId), fixture.family).toBe(true)
      }

      for (const forbiddenRuleId of fixture.forbiddenRuleIds ?? []) {
        expect(ruleIds.has(forbiddenRuleId), fixture.family).toBe(false)
      }
    }
  })

  it('tracks false positives separately for the same high-priority families', () => {
    for (const fixture of highPriorityGapFalsePositiveFixtures) {
      const ruleIds = new Set(
        analyzeText(fixture.text, {
          languageCode: fixture.languageCode,
          enabledRulePacks: fixture.enabledRulePacks,
          optionalRulePacks: fixture.optionalRulePacks,
          nativeLanguageProfile: fixture.nativeLanguageProfile,
        }).warnings.matches.map((match) => match.rule.id),
      )

      for (const riskyRuleId of fixture.riskyRuleIds) {
        expect(ruleIds.has(riskyRuleId), fixture.family).toBe(false)
      }
    }
  })

  it('keeps the measured false-positive rate at zero on the current gap precision corpus', () => {
    let falsePositiveCount = 0
    let totalRiskChecks = 0
    const falsePositivesByRule = new Map<string, number>()

    for (const fixture of highPriorityGapFalsePositiveFixtures) {
      const ruleIds = new Set(
        analyzeText(fixture.text, {
          languageCode: fixture.languageCode,
          enabledRulePacks: fixture.enabledRulePacks,
          optionalRulePacks: fixture.optionalRulePacks,
          nativeLanguageProfile: fixture.nativeLanguageProfile,
        }).warnings.matches.map((match) => match.rule.id),
      )

      totalRiskChecks += fixture.riskyRuleIds.length

      for (const riskyRuleId of fixture.riskyRuleIds) {
        if (ruleIds.has(riskyRuleId)) {
          falsePositiveCount += 1
          falsePositivesByRule.set(
            riskyRuleId,
            (falsePositivesByRule.get(riskyRuleId) ?? 0) + 1,
          )
        }
      }
    }

    const falsePositiveRate =
      totalRiskChecks === 0 ? 0 : falsePositiveCount / totalRiskChecks

    expect(falsePositiveRate).toBe(0)
    expect([...falsePositivesByRule.entries()]).toEqual([])
  })

  it('emits stable suggestion telemetry for replacement-style matches', () => {
    const analysis = analyzeText(
      'We met in order to discuss the release. Please reply at your earliest convenience.',
    )
    const replacementMatch = analysis.warnings.matches.find(
      (match) => match.rule.id === 'WORDY_PHRASE',
    )
    const suggestionMatch = analysis.warnings.matches.find(
      (match) => match.rule.id === 'WORDY_PHRASE_SUGGESTION',
    )

    expect(replacementMatch?.suggestionSetId).toBe('WORDY_PHRASE::to')
    expect(replacementMatch?.replacements).toEqual([{ value: 'to' }])
    expect(suggestionMatch?.suggestionSetId).toBe(
      'WORDY_PHRASE_SUGGESTION::soon|when you can',
    )
    expect(analysis.metrics?.replacementSuggestionSets).toEqual([
      {
        suggestionSetId: 'WORDY_PHRASE_SUGGESTION::soon|when you can',
        ruleId: 'WORDY_PHRASE_SUGGESTION',
        occurrenceCount: 1,
        suggestionCount: 2,
        replacementValues: ['soon', 'when you can'],
      },
      {
        suggestionSetId: 'WORDY_PHRASE::to',
        ruleId: 'WORDY_PHRASE',
        occurrenceCount: 1,
        suggestionCount: 1,
        replacementValues: ['to'],
      },
    ])
  })
})
