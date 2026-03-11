import { describe, expect, it } from 'vitest'
import {
  getPhraseHints,
  getPhraseHintTokens,
  getSentencePhraseHints,
} from './rule-helpers'
import { buildRuleCheckContext } from './utils'

describe('contextual disambiguation', () => {
  it('resolves "well" as an adverb after a verb', () => {
    const context = buildRuleCheckContext('The app performs well under load.')
    const well = context.tokens.find((token) => token.normalized === 'well')

    expect(well?.posHints).toEqual(['adverb'])
    expect(well?.disambiguationProvenance).toContain('verb-plus-well')
  })
})

describe('phrase hints', () => {
  it('exposes noun, verb, adverb, and prepositional phrase hints', () => {
    const context = buildRuleCheckContext(
      'The API response body performs well under load.',
    )

    expect(
      getSentencePhraseHints(context, 0, 'noun-phrase').map(
        (phraseHint) => phraseHint.text,
      ),
    ).toContain('The API response body')
    expect(
      getPhraseHints(context, { kind: 'verb-phrase' }).map(
        (phraseHint) => phraseHint.text,
      ),
    ).toContain('performs well')
    expect(
      getPhraseHints(context, { kind: 'adverb-phrase' }).map(
        (phraseHint) => phraseHint.text,
      ),
    ).toContain('well')
    expect(
      getPhraseHints(context, { kind: 'prepositional-phrase' }).map(
        (phraseHint) => phraseHint.text,
      ),
    ).toContain('under load')

    const verbPhrase = getPhraseHints(context, {
      kind: 'verb-phrase',
    }).find((phraseHint) => phraseHint.text === 'performs well')

    expect(
      getPhraseHintTokens(context, verbPhrase ?? context.phraseHints[0]).map(
        (token) => token.normalized,
      ),
    ).toEqual(['performs', 'well'])
  })

  it('recognizes curated multiword expressions before rules consume phrase boundaries', () => {
    const context = buildRuleCheckContext(
      'The web app uses an open source user interface kit at least for now.',
    )

    const multiwordLabels = getPhraseHints(context, {
      kind: 'multiword-expression',
    }).map((phraseHint) => phraseHint.label)

    expect(multiwordLabels).toEqual(
      expect.arrayContaining([
        'web app',
        'open source',
        'user interface',
        'at least',
      ]),
    )
  })
})
