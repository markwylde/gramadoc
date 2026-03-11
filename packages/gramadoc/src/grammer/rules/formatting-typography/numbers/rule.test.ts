import { describe, expect, it } from 'vitest'
import { analyzeHtml } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  duplicateCurrencySymbolRule,
  duplicatePercentSignRule,
  numbersRules,
  ordinalSuffixRule,
  smallNumberStyleRule,
} from './rule'

describe('ordinalSuffixRule', () => {
  it('flags wrong ordinal suffixes and keeps teen exceptions intact', () => {
    const matches = runRule(
      ordinalSuffixRule,
      'This is the 21th draft. She finished in 2th place. It was the 13rd revision.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Use "st" as the ordinal suffix for 21.',
      replacements: [{ value: 'st' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'nd' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'th' }],
    })
  })

  it('does not flag correct ordinals', () => {
    expect(
      runRule(
        ordinalSuffixRule,
        'This is the 21st draft. She finished in 2nd place. It was the 13th revision.',
      ),
    ).toEqual([])
  })
})

describe('duplicateCurrencySymbolRule', () => {
  it('flags repeated currency symbols before numbers', () => {
    const matches = runRule(
      duplicateCurrencySymbolRule,
      'The refund was $$20 and the fee was ££30.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a single currency symbol here.',
      replacements: [{ value: '$' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: '£' }],
    })
  })

  it('does not flag normal currency usage or currency words', () => {
    expect(
      runRule(
        duplicateCurrencySymbolRule,
        'The refund was $20 and the fee was EUR 30.',
      ),
    ).toEqual([])
  })
})

describe('duplicatePercentSignRule', () => {
  it('flags repeated percent signs after numbers', () => {
    const matches = runRule(
      duplicatePercentSignRule,
      'The discount was 50%% today and 12.5%% yesterday.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a single percent sign here.',
      replacements: [{ value: '%' }],
    })
  })

  it('does not flag normal percentages', () => {
    expect(
      runRule(
        duplicatePercentSignRule,
        'The discount was 50% today and 12.5% yesterday.',
      ),
    ).toEqual([])
  })
})

describe('numbersRules', () => {
  it('suggests spelling out isolated small numbers in prose', () => {
    const matches = runRule(
      smallNumberStyleRule,
      'We found 3 issues in the draft and 2 examples to trim.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Spell out small numbers in running prose when possible.',
      replacements: [{ value: 'three' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'two' }],
    })
  })

  it('stays quiet for technical units, versions, and code-like blocks', () => {
    expect(
      runRule(
        smallNumberStyleRule,
        'Use version 3 and wait 3 ms before retry 3 times.',
      ),
    ).toEqual([])

    const matches = analyzeHtml(
      '<pre><code>### Deploy\nnpm run build -- --retry 3\nWait.. then ship v3</code></pre>',
    ).warnings.matches

    expect(
      matches.filter((match) => match.rule.id === smallNumberStyleRule.id),
    ).toEqual([])
  })

  it('exports the grouped number rules', () => {
    expect(numbersRules).toEqual([
      ordinalSuffixRule,
      duplicateCurrencySymbolRule,
      duplicatePercentSignRule,
      smallNumberStyleRule,
    ])
  })
})
