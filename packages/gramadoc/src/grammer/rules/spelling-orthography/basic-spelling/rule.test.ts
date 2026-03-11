import { describe, expect, it } from 'vitest'
import { analyzeHtml, analyzeText } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  extraLettersRule,
  homophoneSpellingMistakesRule,
  incorrectDiacriticsRule,
  missingLettersRule,
  misspelledWordsRule,
  nonDictionaryWordsRule,
  spellingRule,
  transposedLettersRule,
  typographicalErrorsRule,
} from './rule'

describe('misspelledWordsRule', () => {
  it('flags broader misspellings and returns close replacement suggestions', () => {
    const matches = runRule(
      misspelledWordsRule,
      'This sentence has a misspelled gramerx.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: '"gramerx" appears to be misspelled.',
      offset: 31,
      length: 7,
      sentence: 'This sentence has a misspelled gramerx',
    })
    expect(matches[0].replacements.length).toBeGreaterThan(0)
  })

  it('ignores valid dictionary words and single-letter tokens', () => {
    expect(runRule(spellingRule, 'I ate lunch before the trip.')).toEqual([])
  })

  it('ignores words whose normalized form matches the English dictionary', () => {
    expect(runRule(spellingRule, 'Grammar mistake.')).toEqual([])
  })

  it('does not flag standard us or uk spelling variants as misspellings', () => {
    expect(
      runRule(
        misspelledWordsRule,
        'Do people care about the color of the sky or the colour of the sea?',
      ),
    ).toEqual([])
  })

  it('flags title-cased misspellings inside heading html', () => {
    const matches = analyzeHtml('<h1>Doccument</h1>').warnings.matches.filter(
      (match) => match.rule.id === 'EXTRA_LETTERS',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: '"Doccument" appears to contain an extra letter.',
      replacements: [{ value: 'Document' }],
    })
  })
})

describe('typographicalErrorsRule', () => {
  it('flags a likely single-letter substitution', () => {
    const matches = runRule(
      typographicalErrorsRule,
      'The report was very clebr.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: '"clebr" looks like a typographical error.',
      replacements: [{ value: 'clear' }],
    })
  })
})

describe('transposedLettersRule', () => {
  it('flags adjacent letters that are swapped', () => {
    const matches = runRule(transposedLettersRule, 'This is teh test.')

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: '"teh" looks like it contains transposed letters.',
    })
    expect(matches[0].replacements[0]).toEqual({ value: 'the' })
  })

  it('does not flag a valid word that happens to contain the same letters', () => {
    expect(
      runRule(transposedLettersRule, 'The quick brown fox jumps.'),
    ).toEqual([])
  })
})

describe('missingLettersRule', () => {
  it('flags words that are missing one letter', () => {
    const matches = runRule(missingLettersRule, 'The writer sent a simpl note.')

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: '"simpl" appears to be missing a letter.',
    })
    expect(matches[0].replacements[0]).toEqual({ value: 'simple' })
  })
})

describe('extraLettersRule', () => {
  it('flags words that contain one extra letter', () => {
    const matches = runRule(
      extraLettersRule,
      'The editor fixed the paragraphh.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: '"paragraphh" appears to contain an extra letter.',
      replacements: [{ value: 'paragraph' }],
    })
  })
})

describe('homophoneSpellingMistakesRule', () => {
  it('flags common homophone mistakes when context makes the intent clear', () => {
    const matches = runRule(
      homophoneSpellingMistakesRule,
      'Your welcome. There team is ready.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.message).toBe(
      'Choose the possessive or contraction that fits the sentence.',
    )
    expect(matches[0]?.replacements[0]).toEqual({ value: "You're" })
    expect(matches[1].replacements).toEqual([{ value: 'Their' }])
  })

  it('avoids false positives for valid possessive and locative uses', () => {
    expect(
      runRule(
        homophoneSpellingMistakesRule,
        "Your book is there. Their team is here. It's ready and your API docs are live. We need to ship two tests.",
      ),
    ).toEqual([])
  })

  it('does not emit duplicate homophone warnings through the full analysis pipeline', () => {
    const matches = analyzeText('Your welcome.').warnings.matches

    expect(
      matches.filter(
        (match) => match.rule.id === 'HOMOPHONE_SPELLING_MISTAKES',
      ),
    ).toEqual([])
    expect(
      matches.filter((match) => match.rule.id === 'YOUR_YOURE'),
    ).toHaveLength(1)
  })
})

describe('incorrectDiacriticsRule', () => {
  it('flags borrowed words written without their expected diacritics', () => {
    const matches = runRule(
      incorrectDiacriticsRule,
      'The jalapeno made the naive writer email the fiance.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'jalapeño' }])
    expect(matches[1].replacements).toEqual([{ value: 'naïve' }])
    expect(matches[2].replacements).toEqual([{ value: 'fiancé' }])
  })
})

describe('nonDictionaryWordsRule', () => {
  it('flags gibberish when there is no close dictionary match', () => {
    const matches = runRule(
      nonDictionaryWordsRule,
      'The message contains zxqvvv.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: '"zxqvvv" is not in the English dictionary.',
      replacements: [],
    })
  })

  it('ignores capitalized words so proper nouns can be handled elsewhere', () => {
    expect(
      runRule(nonDictionaryWordsRule, 'OpenAI shipped the model.'),
    ).toEqual([])
  })

  it('ignores tokens that are part of email addresses and urls', () => {
    expect(
      runRule(
        nonDictionaryWordsRule,
        'My email address is mark@wex.com and the site is https://wex.com/docs.',
      ),
    ).toEqual([])
  })

  it('ignores tokens inside bare and malformed urls captured by structured-text spans', () => {
    expect(
      runRule(
        nonDictionaryWordsRule,
        'Browse www.wex.dev/docs now and fix https:/portal.wex.dev later.',
      ),
    ).toEqual([])
  })
})
