import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  identifiersRules,
  malformedUuidRule,
  repeatedIdentifierSeparatorRule,
  splitIdentifierNumberRule,
} from './rule'

describe('malformedUuidRule', () => {
  it('flags UUID-like values with invalid group lengths', () => {
    const matches = runRule(
      malformedUuidRule,
      'Use 123e4567-e89b-12d3-a456-42661417400 and 123e456-e89b-12d3-a456-426614174000.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'This UUID looks malformed.',
      replacements: [],
    })
  })

  it('does not flag valid UUIDs', () => {
    expect(
      runRule(
        malformedUuidRule,
        'Use 123e4567-e89b-12d3-a456-426614174000 in the example.',
      ),
    ).toEqual([])
  })
})

describe('repeatedIdentifierSeparatorRule', () => {
  it('flags repeated separators inside identifiers', () => {
    const matches = runRule(
      repeatedIdentifierSeparatorRule,
      'Use ABC--123 and TASK__45 in the examples.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a single separator in this identifier.',
      replacements: [{ value: '-' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: '_' }],
    })
  })

  it('does not flag normal identifiers or prose punctuation', () => {
    expect(
      runRule(
        repeatedIdentifierSeparatorRule,
        'Use ABC-123 and TASK_45 in the examples. We paused -- briefly -- afterward.',
      ),
    ).toEqual([])
  })
})

describe('splitIdentifierNumberRule', () => {
  it('flags stray spaces between identifier separators and numbers', () => {
    const matches = runRule(
      splitIdentifierNumberRule,
      'Use ABC- 123 and TASK_ 45 in the examples.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Remove the space inside this identifier.',
      replacements: [{ value: '' }],
    })
  })

  it('does not flag identifiers without internal spaces', () => {
    expect(
      runRule(
        splitIdentifierNumberRule,
        'Use ABC-123 and TASK_45 in the examples.',
      ),
    ).toEqual([])
  })
})

describe('identifiersRules', () => {
  it('exports the grouped identifier rules', () => {
    expect(identifiersRules).toEqual([
      malformedUuidRule,
      repeatedIdentifierSeparatorRule,
      splitIdentifierNumberRule,
    ])
  })
})
