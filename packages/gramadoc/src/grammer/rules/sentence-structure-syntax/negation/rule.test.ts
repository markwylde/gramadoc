import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import { doubleNegativeRule, misplacedNotRule, negationRules } from './rule'

describe('doubleNegativeRule', () => {
  it('flags a curated set of double-negative patterns', () => {
    const matches = runRule(
      doubleNegativeRule,
      "We don't need no backup plan. She didn't say nothing. They won't go nowhere.",
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'This appears to use two negatives where one would usually do.',
    })
  })

  it('does not flag single negatives or quoted fragments without the pattern', () => {
    expect(
      runRule(
        doubleNegativeRule,
        "We don't need any backup plan. The sign read 'No entry'.",
      ),
    ).toEqual([])
  })
})

describe('misplacedNotRule', () => {
  it('flags simple misplaced-not auxiliary sequences', () => {
    const matches = runRule(
      misplacedNotRule,
      'We not can stay late. They not will agree.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Place "not" after the auxiliary verb in this phrase.',
      replacements: [{ value: 'cannot' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'will not' }],
    })
  })

  it('does not flag ordinary negatives that are already placed correctly', () => {
    expect(
      runRule(
        misplacedNotRule,
        'We cannot stay late. They will not agree. Not only can we stay, we can help.',
      ),
    ).toEqual([])
  })
})

describe('negationRules', () => {
  it('exports the grouped negation rules', () => {
    expect(negationRules).toEqual([doubleNegativeRule, misplacedNotRule])
  })
})
