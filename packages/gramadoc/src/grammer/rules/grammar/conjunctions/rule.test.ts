import { describe, expect, it } from 'vitest'
import { analyzeHtml } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  conjunctionsRules,
  correlativeConjunctionRule,
  redundantConjunctionPairRule,
  sentenceStartConjunctionRule,
} from './rule'

describe('redundantConjunctionPairRule', () => {
  it('flags redundant conjunction pairs in the same clause', () => {
    const matches = runRule(
      redundantConjunctionPairRule,
      'Although it was late, but we continued. Because it was late, so we stayed home.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Avoid using both "although" and "but" in the same clause.',
      replacements: [{ value: '' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Avoid using both "because" and "so" in the same clause.',
      replacements: [{ value: '' }],
    })
  })

  it('does not flag sentences that use only one conjunction', () => {
    expect(
      runRule(
        redundantConjunctionPairRule,
        'Although it was late, we continued. Because it was late, we stayed home.',
      ),
    ).toEqual([])
  })
})

describe('correlativeConjunctionRule', () => {
  it('flags mismatched either/and and neither/or pairs', () => {
    const matches = runRule(
      correlativeConjunctionRule,
      'Either we leave now and we stay here. Neither the notes or the summary helped.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "or" with "either".',
      replacements: [{ value: 'or' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "nor" with "neither".',
      replacements: [{ value: 'nor' }],
    })
  })

  it('does not flag correct correlative conjunction pairs', () => {
    expect(
      runRule(
        correlativeConjunctionRule,
        'Either we leave now or we stay here. Neither the notes nor the summary helped.',
      ),
    ).toEqual([])
  })
})

describe('sentenceStartConjunctionRule', () => {
  it('flags longer sentence-start and/but uses as advisory style guidance', () => {
    const matches = runRule(
      sentenceStartConjunctionRule,
      'We shipped the release after review. But the follow-up summary still needed careful editorial cleanup.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message:
        'Consider removing this sentence-start conjunction for a more direct sentence in formal prose.',
      replacements: [{ value: '' }],
    })
  })

  it('does not flag short fragments or the first sentence in a passage', () => {
    expect(
      runRule(sentenceStartConjunctionRule, 'But we stayed. And then we left.'),
    ).toEqual([])
  })

  it('stays quiet in headings and list items via rule scope', () => {
    const headingMatches = analyzeHtml(
      '<h2>But release notes still matter</h2>',
    ).warnings.matches.filter(
      (match) => match.rule.id === sentenceStartConjunctionRule.id,
    )
    const listMatches = analyzeHtml(
      '<ul><li>And the checklist still passes</li></ul>',
    ).warnings.matches.filter(
      (match) => match.rule.id === sentenceStartConjunctionRule.id,
    )

    expect(headingMatches).toEqual([])
    expect(listMatches).toEqual([])
  })

  it('exports the grouped conjunction rules', () => {
    expect(conjunctionsRules).toEqual([
      redundantConjunctionPairRule,
      correlativeConjunctionRule,
      sentenceStartConjunctionRule,
    ])
  })
})
