import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  acronymCapitalizationRule,
  incorrectAbbreviationFormsRule,
  incorrectAcronymsRule,
  misspelledNamesRule,
  undefinedAcronymsRule,
} from './rule'

describe('misspelledNamesRule', () => {
  it('flags misspelled names from the demo lexicon', () => {
    const matches = runRule(
      misspelledNamesRule,
      'Jonh thanked Micheal and Saraa.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'John' }])
    expect(matches[1].replacements).toEqual([{ value: 'Michael' }])
    expect(matches[2].replacements).toEqual([{ value: 'Sarah' }])
  })
})

describe('incorrectAcronymsRule', () => {
  it('flags known acronym misspellings', () => {
    const matches = runRule(
      incorrectAcronymsRule,
      'The HTLM and JOSN files loaded.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: 'HTML' }])
    expect(matches[1].replacements).toEqual([{ value: 'JSON' }])
  })
})

describe('acronymCapitalizationRule', () => {
  it('flags lowercase and mixed-case acronym forms', () => {
    const matches = runRule(
      acronymCapitalizationRule,
      'The api returned Json via html.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'API' }])
    expect(matches[1].replacements).toEqual([{ value: 'JSON' }])
    expect(matches[2].replacements).toEqual([{ value: 'HTML' }])
  })
})

describe('undefinedAcronymsRule', () => {
  it('flags the first use of a known acronym without a prior definition', () => {
    const matches = runRule(
      undefinedAcronymsRule,
      'The API returned data. The API stayed stable.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Define "API" before using it.',
    })
  })

  it('does not flag acronyms that have already been defined', () => {
    expect(
      runRule(
        undefinedAcronymsRule,
        'The application programming interface (API) returned data.',
      ),
    ).toEqual([])
  })
})

describe('incorrectAbbreviationFormsRule', () => {
  it('flags abbreviations that are missing punctuation', () => {
    const matches = runRule(
      incorrectAbbreviationFormsRule,
      'Bring fruit, e.g apples, i.e pears, in the apples vs oranges section.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'e.g.' }])
    expect(matches[1].replacements).toEqual([{ value: 'i.e.' }])
    expect(matches[2].replacements).toEqual([{ value: 'vs.' }])
  })
})
