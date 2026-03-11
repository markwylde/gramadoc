import { describe, expect, it } from 'vitest'
import {
  highPriorityGapEvaluationFixtures,
  highPriorityGapFalsePositiveFixtures,
} from './evaluation-fixtures.js'

describe('evaluation fixture hygiene', () => {
  it('keeps family names unique across detection and false-positive corpora', () => {
    const families = [
      ...highPriorityGapEvaluationFixtures.map((fixture) => fixture.family),
      ...highPriorityGapFalsePositiveFixtures.map((fixture) => fixture.family),
    ]

    expect(new Set(families).size).toBe(families.length)
  })

  it('keeps every fixture tied to at least one explicit rule id', () => {
    for (const fixture of highPriorityGapEvaluationFixtures) {
      expect(
        fixture.expectedRuleIds.length +
          (fixture.forbiddenRuleIds?.length ?? 0),
        fixture.family,
      ).toBeGreaterThan(0)
    }

    for (const fixture of highPriorityGapFalsePositiveFixtures) {
      expect(fixture.riskyRuleIds.length, fixture.family).toBeGreaterThan(0)
    }
  })

  it('requires risky ambiguity fixtures to declare a root cause', () => {
    for (const fixture of highPriorityGapFalsePositiveFixtures) {
      if (fixture.riskTier !== 'risky') {
        continue
      }

      expect(fixture.rootCause, fixture.family).toBeDefined()
    }
  })
})
