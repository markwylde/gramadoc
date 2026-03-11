import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  phraseWordChoiceRule,
  singleWordChoiceRule,
  wordChoiceRules,
} from './rule'

describe('phraseWordChoiceRule', () => {
  it('flags curated split/join mistakes and nonstandard fixed phrases', () => {
    const matches = runRule(
      phraseWordChoiceRule,
      'I could care less about that. They are one in the same person. My be your should fix this, and there fore we should ship it. We would of noticed sooner.',
    )

    expect(matches).toHaveLength(6)
    expect(matches[0]).toMatchObject({
      message: 'Use "couldn’t care less" for this meaning.',
      replacements: [{ value: 'couldn’t care less' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "one and the same" here.',
      replacements: [{ value: 'one and the same' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'Maybe' }],
    })
    expect(matches[3]).toMatchObject({
      replacements: [{ value: 'you should' }],
    })
    expect(matches[4]).toMatchObject({
      replacements: [{ value: 'therefore' }],
    })
    expect(matches[5]).toMatchObject({
      replacements: [{ value: 'would have' }],
    })
  })

  it('does not flag when punctuation breaks the phrase apart', () => {
    expect(
      runRule(
        phraseWordChoiceRule,
        'I could, care less if I tried. They are one, in the same room, now. My, be that as it may, your; should remain quoted, and there-fore is not this pattern.',
      ),
    ).toEqual([])
  })

  it('stays quiet on code-adjacent tokens and unrelated prose', () => {
    expect(
      runRule(
        phraseWordChoiceRule,
        'Set there_fore in the fixture, keep your_should in the example, and document why this module could offer typed adapters.',
      ),
    ).toEqual([])
  })
})

describe('singleWordChoiceRule', () => {
  it('flags curated single-word choices and joined typo forms', () => {
    const matches = runRule(
      singleWordChoiceRule,
      'Irregardless, we had alot of time and atleast enough context to respond aswell. In fact, incase it helps, infact is here too.',
    )

    expect(matches).toHaveLength(6)
    expect(matches[0]).toMatchObject({
      message: 'Use "regardless" instead of "irregardless".',
      replacements: [{ value: 'Regardless' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'a lot' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'at least' }],
    })
    expect(matches[3]).toMatchObject({
      replacements: [{ value: 'as well' }],
    })
    expect(matches[4]).toMatchObject({
      replacements: [{ value: 'in case' }],
    })
    expect(matches[5]).toMatchObject({
      replacements: [{ value: 'in fact' }],
    })
  })

  it('does not flag the standard forms', () => {
    expect(
      runRule(
        singleWordChoiceRule,
        'Regardless, we had a lot of time, at least enough context, as well as an in case fallback and an in fact note.',
      ),
    ).toEqual([])
  })

  it('stays quiet in code-adjacent and identifier-like text', () => {
    expect(
      runRule(
        singleWordChoiceRule,
        'The fixture uses config.incaseFallback and renderAswellSoon for backwards compatibility.',
      ),
    ).toEqual([])
  })
})

describe('wordChoiceRules', () => {
  it('exports the grouped word choice rules', () => {
    expect(wordChoiceRules).toEqual([
      phraseWordChoiceRule,
      singleWordChoiceRule,
    ])
  })
})
