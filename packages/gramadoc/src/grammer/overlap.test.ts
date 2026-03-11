import { describe, expect, it } from 'vitest'
import { analyzeText } from './utils'

describe('rule overlap metrics', () => {
  it('reports overlap groups when two rule families flag the same span', () => {
    const analysis = analyzeText(
      'Send an email from the website. The web site sends updates to a co-worker.',
    )

    expect(
      analysis.metrics?.ruleMatchCounts.LEXICAL_CONSISTENCY,
    ).toBeGreaterThan(0)
    expect(
      analysis.metrics?.ruleMatchCounts.CLOSED_VS_OPEN_COMPOUNDS,
    ).toBeGreaterThan(0)
    expect(
      analysis.metrics?.overlappingMatchGroups.some(
        (group) =>
          group.ruleIds.includes('LEXICAL_CONSISTENCY') &&
          group.ruleIds.includes('CLOSED_VS_OPEN_COMPOUNDS'),
      ),
    ).toBe(true)
  })
})
