import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  documentVariantConsistencyRule,
  languageVariantsRules,
  lexicalConsistencyRule,
  mixedLanguageVariantsRule,
} from './rule'

describe('mixedLanguageVariantsRule', () => {
  it('flags curated US and UK variants mixed in one sentence', () => {
    const matches = runRule(
      mixedLanguageVariantsRule,
      'The color palette helped us organise the centre display.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use one spelling variant consistently within this sentence.',
      replacements: [{ value: 'organize' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'center' }],
    })
  })

  it('does not flag different variants used in separate sentences when no mode is forced', () => {
    expect(
      runRule(
        mixedLanguageVariantsRule,
        'The color palette worked well. The colour options were archived later.',
      ),
    ).toEqual([])
  })

  it('uses the chosen document mode to prefer one variant consistently', () => {
    const usMatches = runRule(
      mixedLanguageVariantsRule,
      'The colour palette helped us organise the centre display.',
      { languageCode: 'en-US' },
    )
    const ukMatches = runRule(
      mixedLanguageVariantsRule,
      'The color palette helped us organize the center display.',
      { languageCode: 'en-GB' },
    )

    expect(usMatches).toHaveLength(3)
    expect(usMatches[0]?.replacements).toEqual([{ value: 'color' }])
    expect(ukMatches).toHaveLength(3)
    expect(ukMatches[0]?.replacements).toEqual([{ value: 'colour' }])
  })

  it('covers a broader stable set of variant-local replacements', () => {
    const matches = runRule(
      mixedLanguageVariantsRule,
      'Their favourite behaviour honoured the travelled centre display.',
      { languageCode: 'en-US' },
    )

    expect(matches.map((match) => match.replacements[0]?.value)).toEqual([
      'favorite',
      'behavior',
      'traveled',
      'center',
    ])
  })

  it('ignores quoted variant mentions when discussing style choices', () => {
    expect(
      runRule(
        mixedLanguageVariantsRule,
        'The guide says "colour" in the UK notes, but the product uses color elsewhere.',
      ),
    ).toEqual([])
  })
})

describe('documentVariantConsistencyRule', () => {
  it('flags mixed variant usage across separate sentences in one document', () => {
    const matches = runRule(
      documentVariantConsistencyRule,
      'The color palette worked well. The colour options were archived later.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use one spelling variant consistently across the document.',
      replacements: [{ value: 'color' }],
    })
  })

  it('enforces the selected document variant across separate sentences', () => {
    const matches = runRule(
      documentVariantConsistencyRule,
      'The favourite icon was archived later. The behavior feels stable.',
      { languageCode: 'en-GB' },
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.replacements).toEqual([{ value: 'behaviour' }])
  })
})

describe('lexicalConsistencyRule', () => {
  it('flags mixed house-style lexical variants', () => {
    const matches = runRule(
      lexicalConsistencyRule,
      'Send an email from the website. The web site sends updates to each co-worker and every coworker.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "website" consistently instead of mixing website variants.',
      replacements: [{ value: 'website' }],
    })
    expect(matches[1]).toMatchObject({
      message:
        'Use "coworker" consistently instead of mixing coworker variants.',
      replacements: [{ value: 'coworker' }],
    })
  })
})

describe('languageVariantsRules', () => {
  it('exports the grouped language variant rules', () => {
    expect(languageVariantsRules).toEqual([
      mixedLanguageVariantsRule,
      documentVariantConsistencyRule,
      lexicalConsistencyRule,
    ])
  })
})
