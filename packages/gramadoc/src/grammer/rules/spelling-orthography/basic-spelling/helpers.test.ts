import { describe, expect, it } from 'vitest'
import {
  classifyUnknownWord,
  hasSupportedWordCasing,
  isKnownDictionaryWord,
  levenshteinDistance,
  shouldAnalyzeSpellingWord,
} from './helpers'

describe('basic spelling helpers', () => {
  it('recognizes dictionary words and excluded apostrophe forms correctly', () => {
    expect(isKnownDictionaryWord('grammar')).toBe(true)
    expect(isKnownDictionaryWord('color')).toBe(true)
    expect(isKnownDictionaryWord('colour')).toBe(true)
    expect(isKnownDictionaryWord('automattic')).toBe(true)
    expect(isKnownDictionaryWord('equifax')).toBe(true)
    expect(isKnownDictionaryWord('dont')).toBe(false)
    expect(isKnownDictionaryWord('youre')).toBe(false)
  })

  it('limits spelling analysis to simple lowercase words of useful length', () => {
    expect(shouldAnalyzeSpellingWord('clear')).toBe(true)
    expect(shouldAnalyzeSpellingWord('AI')).toBe(false)
    expect(shouldAnalyzeSpellingWord("can't")).toBe(false)
  })

  it('accepts supported casing shapes and rejects mixed unsupported casing', () => {
    expect(hasSupportedWordCasing('clear')).toBe(true)
    expect(hasSupportedWordCasing('Clear')).toBe(true)
    expect(hasSupportedWordCasing('CLEAR')).toBe(true)
    expect(hasSupportedWordCasing('cLeAr')).toBe(false)
  })

  it('caps Levenshtein work when the distance is already too large', () => {
    expect(levenshteinDistance('cat', 'cat')).toBe(0)
    expect(levenshteinDistance('cat', 'dog', 1)).toBe(2)
  })

  it('classifies several unknown-word shapes with stable suggestions', () => {
    expect(classifyUnknownWord('teh')).toMatchObject({
      kind: 'TRANSPOSED_LETTERS',
      suggestions: ['the'],
    })
    expect(classifyUnknownWord('simpl')).toMatchObject({
      kind: 'MISSING_LETTERS',
    })
    expect(classifyUnknownWord('simpl')?.suggestions).toContain('simple')
    expect(classifyUnknownWord('paragraphh')).toMatchObject({
      kind: 'EXTRA_LETTERS',
    })
    expect(classifyUnknownWord('paragraphh')?.suggestions).toContain(
      'paragraph',
    )
    expect(classifyUnknownWord('clebr')).toMatchObject({
      kind: 'TYPOGRAPHICAL_ERRORS',
    })
    expect(classifyUnknownWord('clebr')?.suggestions).toContain('clear')
    expect(classifyUnknownWord('zxqvvv')).toMatchObject({
      kind: 'NON_DICTIONARY_WORDS',
      suggestions: [],
    })
  })

  it('does not classify standard us or uk spellings as unknown words', () => {
    expect(classifyUnknownWord('color')).toBeNull()
    expect(classifyUnknownWord('colour')).toBeNull()
    expect(classifyUnknownWord('center')).toBeNull()
    expect(classifyUnknownWord('centre')).toBeNull()
  })

  it('treats TypeScript/docs-first technical vocabulary as known words', () => {
    expect(isKnownDictionaryWord('tsconfig')).toBe(true)
    expect(isKnownDictionaryWord('codegen')).toBe(true)
    expect(isKnownDictionaryWord('monorepo')).toBe(true)
    expect(isKnownDictionaryWord('vitepress')).toBe(true)
    expect(isKnownDictionaryWord('turborepo')).toBe(true)
    expect(classifyUnknownWord('webhook')).toBeNull()
    expect(classifyUnknownWord('graphql')).toBeNull()
  })
})
