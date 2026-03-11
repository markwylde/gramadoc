import { describe, expect, it } from 'vitest'
import { analyzeText } from './utils'

const positiveFixtures = [
  {
    family: 'paragraph whitespace',
    text: 'The release shipped.Thanks for checking.',
    expectedRuleIds: ['MISSING_SPACE_AFTER_SENTENCE_BOUNDARY'],
  },
  {
    family: 'house style terms',
    text: 'Github Actions validates Typescript on ipv6 traffic.',
    expectedRuleIds: ['HOUSE_STYLE_TERMS'],
  },
  {
    family: 'variant replacement',
    text: 'The colour palette helped us organise the centre display.',
    expectedRuleIds: [
      'MIXED_LANGUAGE_VARIANTS',
      'DOCUMENT_VARIANT_CONSISTENCY',
    ],
    languageCode: 'en-US' as const,
  },
]

const quietFixtures = [
  {
    family: 'quoted house style literal',
    text: 'The migration guide mentions "G Suite" as a former name.',
    blockedRuleIds: ['HOUSE_STYLE_TERMS'],
  },
  {
    family: 'plain technical prose',
    text: 'GitHub Actions validates TypeScript on IPv6 traffic.',
    blockedRuleIds: ['HOUSE_STYLE_TERMS'],
  },
  {
    family: 'already spaced sentences',
    text: 'The release shipped. Thanks for checking.',
    blockedRuleIds: ['MISSING_SPACE_AFTER_SENTENCE_BOUNDARY'],
  },
]

describe('high-priority gap evaluation set', () => {
  it('keeps high-priority gap families firing on known positives', () => {
    for (const fixture of positiveFixtures) {
      const ruleIds = new Set(
        analyzeText(fixture.text, {
          languageCode: fixture.languageCode,
        }).warnings.matches.map((match) => match.rule.id),
      )

      for (const expectedRuleId of fixture.expectedRuleIds) {
        expect(ruleIds.has(expectedRuleId), fixture.family).toBe(true)
      }
    }
  })

  it('tracks false positives separately with quiet fixtures', () => {
    for (const fixture of quietFixtures) {
      const ruleIds = analyzeText(fixture.text).warnings.matches.map(
        (match) => match.rule.id,
      )

      for (const blockedRuleId of fixture.blockedRuleIds) {
        expect(ruleIds, fixture.family).not.toContain(blockedRuleId)
      }
    }
  })
})
