import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import { foreignTermSpellingRule, foreignTermsRules } from './rule'

describe('foreignTermSpellingRule', () => {
  it('flags a curated set of collapsed borrowed terms', () => {
    const matches = runRule(
      foreignTermSpellingRule,
      'We adopted an adhoc process with a bonafide exception, perse.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: 'ad hoc' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'bona fide' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'per se' }],
    })
  })

  it('does not flag correctly spaced borrowed terms or longer words', () => {
    expect(
      runRule(
        foreignTermSpellingRule,
        'We adopted an ad hoc process. Persephone approved the bona fide result.',
      ),
    ).toEqual([])
  })
})

describe('foreignTermsRules', () => {
  it('exports the grouped foreign term rules', () => {
    expect(foreignTermsRules).toEqual([foreignTermSpellingRule])
  })
})
