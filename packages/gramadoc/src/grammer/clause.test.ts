import { describe, expect, it } from 'vitest'
import {
  getClausePredicateTokens,
  getClauseSubjectTokens,
  getTokenClauseTokens,
} from './rule-helpers.js'
import { buildRuleCheckContext } from './utils'

describe('clause metadata', () => {
  it('splits introductory and comma-joined clauses and annotates clause parts', () => {
    const context = buildRuleCheckContext(
      'However, the release was shipped, it missed the deadline.',
    )

    expect(context.clauseRanges.map((clause) => clause.text)).toEqual([
      'However',
      'the release was shipped',
      'it missed the deadline',
    ])
    expect(
      context.tokens
        .filter((token) => token.clauseIndex === 1)
        .map((token) => `${token.value}:${token.clausePart}`),
    ).toEqual([
      'the:subject',
      'release:subject',
      'was:predicate',
      'shipped:predicate',
    ])
  })

  it('keeps post-nominal participles in the subject zone until the main predicate starts', () => {
    const context = buildRuleCheckContext(
      'The API designed for speed performs well under load.',
    )

    expect(
      context.tokens.map((token) => `${token.value}:${token.clausePart}`),
    ).toEqual([
      'The:subject',
      'API:subject',
      'designed:subject',
      'for:subject',
      'speed:subject',
      'performs:predicate',
      'well:predicate',
      'under:predicate',
      'load:predicate',
    ])
  })

  it('treats imperative clauses as predicate-led clauses', () => {
    const context = buildRuleCheckContext('Use clear names in docs.')

    expect(
      context.tokens.map((token) => `${token.value}:${token.clausePart}`),
    ).toEqual([
      'Use:predicate',
      'clear:predicate',
      'names:predicate',
      'in:predicate',
      'docs:predicate',
    ])
  })

  it('splits coordinated clauses around a local predicate after a coordinator', () => {
    const context = buildRuleCheckContext(
      "I can't stand it and every update makes it worse.",
    )
    const makes = context.tokens.find((token) => token.normalized === 'makes')

    expect(context.clauseRanges.map((clause) => clause.text)).toEqual([
      "I can't stand it",
      'and every update makes it worse',
    ])
    expect(makes?.clausePart).toBe('predicate')

    const makesClause = makes ? getTokenClauseTokens(context, makes) : []

    expect(getClauseSubjectTokens(makesClause).map((token) => token.value)).toEqual(
      ['every'],
    )
    expect(
      getClausePredicateTokens(makesClause).map((token) => token.value),
    ).toEqual(['update', 'makes', 'it', 'worse'])
  })
})
