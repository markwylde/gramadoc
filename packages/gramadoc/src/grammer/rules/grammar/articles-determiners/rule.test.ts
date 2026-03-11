import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  articleBeforeConsonantRule,
  articleBeforeVowelRule,
  demonstrativeMisuseRule,
  incorrectDeterminersRule,
  missingArticlesRule,
} from './rule'

describe('articleBeforeVowelRule', () => {
  it('flags "a" before a vowel and preserves capitalization', () => {
    const lowerMatches = runRule(
      articleBeforeVowelRule,
      'I ate a apple before lunch.',
    )
    const upperMatches = runRule(
      articleBeforeVowelRule,
      'She saw A orange in the bowl.',
    )

    expect(lowerMatches).toHaveLength(1)
    expect(lowerMatches[0]).toMatchObject({
      message: 'Use "an" before "apple".',
      offset: 6,
      length: 1,
      replacements: [{ value: 'an' }],
      sentence: 'I ate a apple before lunch',
    })

    expect(upperMatches).toHaveLength(1)
    expect(upperMatches[0].replacements).toEqual([{ value: 'AN' }])
  })

  it('does not flag when punctuation separates the words', () => {
    expect(
      runRule(articleBeforeVowelRule, 'Choose a, apple if needed.'),
    ).toEqual([])
  })

  it('flags across line breaks because the article and noun are still adjacent words', () => {
    const matches = runRule(articleBeforeVowelRule, 'Pick a\norange for later.')

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "an" before "orange".',
    })
  })

  it('does not flag vowel-led words with consonant sounds', () => {
    expect(
      runRule(articleBeforeVowelRule, 'A user can open one account.'),
    ).toEqual([])
  })
})

describe('articleBeforeConsonantRule', () => {
  it('flags "an" before a consonant and preserves capitalization', () => {
    const lowerMatches = runRule(
      articleBeforeConsonantRule,
      'She packed an banana for the trip.',
    )
    const upperMatches = runRule(
      articleBeforeConsonantRule,
      'He bought AN book yesterday.',
    )

    expect(lowerMatches).toHaveLength(1)
    expect(lowerMatches[0]).toMatchObject({
      message: 'Use "a" before "banana".',
      offset: 11,
      length: 2,
      replacements: [{ value: 'a' }],
      sentence: 'She packed an banana for the trip',
    })

    expect(upperMatches).toHaveLength(1)
    expect(upperMatches[0].replacements).toEqual([{ value: 'A' }])
  })

  it('does not flag when punctuation separates the words', () => {
    expect(
      runRule(articleBeforeConsonantRule, 'Bring an, banana for later.'),
    ).toEqual([])
  })

  it('does not flag when the next token does not start with a consonant', () => {
    expect(
      runRule(articleBeforeConsonantRule, 'Bring an apple for later.'),
    ).toEqual([])
  })

  it('does not flag consonant-led words with silent-h vowel sounds', () => {
    expect(
      runRule(articleBeforeConsonantRule, 'It took an hour to finish.'),
    ).toEqual([])
  })
})

describe('missingArticlesRule', () => {
  it('flags singular count nouns that are missing an article in simple verb-object phrases', () => {
    const matches = runRule(
      missingArticlesRule,
      'She bought book yesterday. We found orange on the table.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Add "a" before "book".',
      replacements: [{ value: 'a book' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Add "an" before "orange".',
      replacements: [{ value: 'an orange' }],
    })
  })

  it('does not flag nouns that already have a determiner', () => {
    expect(
      runRule(
        missingArticlesRule,
        'She bought the book yesterday. We found an orange on the table.',
      ),
    ).toEqual([])
  })
})

describe('incorrectDeterminersRule', () => {
  it('flags countable and uncountable determiner mismatches', () => {
    const matches = runRule(
      incorrectDeterminersRule,
      'Much books were helpful. Many water remained. Less books were missing. Fewer money was available.',
    )

    expect(matches).toHaveLength(4)
    expect(matches[0].replacements).toEqual([{ value: 'many' }])
    expect(matches[1].replacements).toEqual([{ value: 'much' }])
    expect(matches[2].replacements).toEqual([{ value: 'fewer' }])
    expect(matches[3].replacements).toEqual([{ value: 'less' }])
  })

  it('does not flag valid determiner choices', () => {
    expect(
      runRule(
        incorrectDeterminersRule,
        'Many books were helpful. Much water remained. Fewer books were missing. Less money was available.',
      ),
    ).toEqual([])
  })
})

describe('demonstrativeMisuseRule', () => {
  it('flags demonstratives that do not agree with noun number', () => {
    const matches = runRule(
      demonstrativeMisuseRule,
      'This books were helpful. Those guide is clear. These plans changed. That apples fell.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0].replacements).toEqual([{ value: 'These' }])
    expect(matches[1].replacements).toEqual([{ value: 'That' }])
    expect(matches[2].replacements).toEqual([{ value: 'Those' }])
  })

  it('does not flag demonstratives that already agree with the noun', () => {
    expect(
      runRule(
        demonstrativeMisuseRule,
        'These books were helpful. That guide is clear.',
      ),
    ).toEqual([])
  })

  it('does not treat following verbs as nouns in this/these sentences', () => {
    expect(
      runRule(
        demonstrativeMisuseRule,
        'This is exciting. These are exciting. These is exciting. This are exciting.',
      ),
    ).toEqual([])
  })

  it('does not flag demonstratives followed by verbs like "reminds"', () => {
    expect(
      runRule(
        demonstrativeMisuseRule,
        'This reminds me of one time, when I was in band camp, I tried saying "Hello" to my teacher, but he ignored me.',
      ),
    ).toEqual([])
  })
})
