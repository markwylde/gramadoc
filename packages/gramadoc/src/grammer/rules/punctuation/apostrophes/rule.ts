import type { Match } from '../../../../types.js'
import {
  namedPossessivePatterns,
  pluralPossessivePatterns,
  possessivePronounCorrections,
  whoseContractionFollowers,
} from '../../../resources/apostrophes.js'
import { findTokenPhraseMatches } from '../../../rule-helpers.js'
import type { GrammerRule, Token } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'
import {
  hasSupportedWordCasing,
  isKnownDictionaryWord,
} from '../../spelling-orthography/basic-spelling/helpers.js'

const LIKELY_POSSESSED_NOUNS = new Set([
  'battery',
  'cover',
  'deadline',
  'engine',
  'fault',
  'idea',
  'interface',
  'name',
  'policy',
  'price',
  'responsibility',
  'surface',
  'team',
  'voice',
])

const APOSTROPHE_REPLACEMENTS: Record<string, string> = {
  arent: "aren't",
  cant: "can't",
  couldnt: "couldn't",
  couldve: "could've",
  didnt: "didn't",
  doesnt: "doesn't",
  dont: "don't",
  hadnt: "hadn't",
  hasnt: "hasn't",
  havent: "haven't",
  hed: "he'd",
  heres: "here's",
  im: "I'm",
  isnt: "isn't",
  itll: "it'll",
  its: "it's",
  ive: "I've",
  lets: "let's",
  mightnt: "mightn't",
  mightve: "might've",
  mustnt: "mustn't",
  mustve: "must've",
  neednt: "needn't",
  shant: "shan't",
  shouldnt: "shouldn't",
  shouldve: "should've",
  thats: "that's",
  thatll: "that'll",
  theres: "there's",
  therell: "there'll",
  theyd: "they'd",
  theyll: "they'll",
  theyre: "they're",
  theyve: "they've",
  wasnt: "wasn't",
  werent: "weren't",
  weve: "we've",
  whos: "who's",
  wont: "won't",
  wouldnt: "wouldn't",
  wouldve: "would've",
  youd: "you'd",
  youll: "you'll",
  youre: "you're",
  youve: "you've",
}

const SPLIT_CONTRACTION_REPLACEMENTS: Record<string, string> = {
  "are|n't": "aren't",
  "ca|n't": "can't",
  "could|n't": "couldn't",
  "did|n't": "didn't",
  "do|n't": "don't",
  "does|n't": "doesn't",
  'he|d': "he'd",
  'he|ll': "he'll",
  'he|s': "he's",
  'here|s': "here's",
  "had|n't": "hadn't",
  "has|n't": "hasn't",
  "have|n't": "haven't",
  'how|s': "how's",
  'i|d': "I'd",
  'i|ll': "I'll",
  'i|m': "I'm",
  'i|ve': "I've",
  "is|n't": "isn't",
  'it|d': "it'd",
  'it|ll': "it'll",
  'it|s': "it's",
  'let|s': "let's",
  "might|n't": "mightn't",
  "must|n't": "mustn't",
  "need|n't": "needn't",
  'she|d': "she'd",
  'she|ll': "she'll",
  'she|s': "she's",
  "should|n't": "shouldn't",
  'should|ve': "should've",
  'that|d': "that'd",
  'that|ll': "that'll",
  'that|s': "that's",
  'there|d': "there'd",
  'there|ll': "there'll",
  'there|s': "there's",
  'they|d': "they'd",
  'they|ll': "they'll",
  'they|re': "they're",
  'they|ve': "they've",
  "was|n't": "wasn't",
  'we|d': "we'd",
  'we|ll': "we'll",
  'we|re': "we're",
  'we|ve': "we've",
  "were|n't": "weren't",
  'what|s': "what's",
  'when|s': "when's",
  'where|s': "where's",
  'who|d': "who'd",
  'who|ll': "who'll",
  'who|s': "who's",
  "wo|n't": "won't",
  "would|n't": "wouldn't",
  'would|ve': "would've",
  'why|s': "why's",
  'you|d': "you'd",
  'you|ll': "you'll",
  'you|re': "you're",
  'you|ve': "you've",
}

const SPLIT_APOSTROPHE_GAP = /^\s*['’]\s*$/u
const APOSTROPHE_STYLE_TARGET = /['’]/u
const INTERNAL_APOSTROPHE_TOKEN = /^\p{L}+(?:['’]\p{L}+)+$/u
const TRAILING_POSSESSIVE_TOKEN = /^\p{L}+['’]$/u
const DECADE_APOSTROPHE_TOKEN = /^(?:18|19|20)\d0['’]s$/u

function getSplitContractionReplacement(
  left: string,
  right: string,
  between: string,
) {
  if (right === "n't") {
    return /^\s+$/u.test(between)
      ? (SPLIT_CONTRACTION_REPLACEMENTS[`${left}|${right}`] ?? null)
      : null
  }

  if (!SPLIT_APOSTROPHE_GAP.test(between)) {
    return null
  }

  return SPLIT_CONTRACTION_REPLACEMENTS[`${left}|${right}`] ?? null
}

function getTokenApostropheStyle(token: Token) {
  const match = token.value.match(APOSTROPHE_STYLE_TARGET)

  return match?.[0] === '’' ? 'curly' : match?.[0] === "'" ? 'straight' : null
}

function isApostropheStyleCandidate(token: Token) {
  if (
    !APOSTROPHE_STYLE_TARGET.test(token.value) ||
    token.value.includes('`') ||
    /[._/\\]/u.test(token.value) ||
    /^[A-Z0-9_'’-]+$/u.test(token.value)
  ) {
    return false
  }

  return (
    INTERNAL_APOSTROPHE_TOKEN.test(token.value) ||
    TRAILING_POSSESSIVE_TOKEN.test(token.value) ||
    DECADE_APOSTROPHE_TOKEN.test(token.value)
  )
}

export const incorrectApostrophesRule: GrammerRule = {
  id: 'INCORRECT_APOSTROPHES',
  name: 'Incorrect Apostrophes',
  description:
    'Flags common contractions written without the expected apostrophe.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [
      { text: "I don't think that's right." },
      { text: "You're welcome to stay." },
    ],
    bad: [
      { text: 'I dont think thats right.' },
      { text: 'Youre welcome to stay.' },
    ],
  },
  check({ text, tokens }) {
    return tokens.flatMap((token) => {
      if (
        isKnownDictionaryWord(token.normalized) ||
        !hasSupportedWordCasing(token.value)
      ) {
        return []
      }

      const replacement = APOSTROPHE_REPLACEMENTS[token.normalized]

      if (!replacement) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use "${replacement}" with an apostrophe.`,
          replacements: [preserveCase(token.value, replacement)],
          rule: incorrectApostrophesRule,
        }),
      ]
    })
  },
}

export const splitContractionRule: GrammerRule = {
  id: 'SPLIT_CONTRACTION',
  name: 'Split Contraction',
  description:
    'Flags contractions that have been split apart by whitespace around the apostrophe.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [
      { text: "I'm sure we're ready." },
      { text: "That doesn't happen often." },
    ],
    bad: [
      { text: "I 'm sure we 're ready." },
      { text: "That does n't happen often." },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = tokens[index + 1]
      const between = text.slice(current.offset + current.length, next.offset)
      const replacement = getSplitContractionReplacement(
        current.normalized,
        next.normalized,
        between,
      )

      if (!replacement) {
        continue
      }

      const phrase = text.slice(current.offset, next.offset + next.length)

      matches.push(
        createMatch({
          text,
          offset: current.offset,
          length: next.offset + next.length - current.offset,
          message: `Join this contraction as "${replacement}".`,
          replacements: [preserveCase(phrase, replacement)],
          rule: splitContractionRule,
        }),
      )
    }

    return matches
  },
}

export const possessiveItsRule: GrammerRule = {
  id: 'POSSESSIVE_ITS',
  name: 'Possessive Its',
  description:
    'Flags "it’s" when the possessive pronoun "its" is more likely before a nearby noun.',
  shortMessage: 'Punctuation',
  issueType: 'grammar',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [
      { text: 'The company changed its policy.' },
      { text: 'The phone lost its battery cover.' },
    ],
    bad: [
      { text: 'The company changed it’s policy.' },
      { text: 'The phone lost it’s battery cover.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = tokens[index + 1]
      const between = text.slice(current.offset + current.length, next.offset)

      if (
        current.normalized !== "it's" ||
        !/^\s+$/.test(between) ||
        !LIKELY_POSSESSED_NOUNS.has(next.normalized)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: current.offset,
          length: current.length,
          message: `Use "${preserveCase(current.value, 'its')}" for possession.`,
          replacements: [preserveCase(current.value, 'its')],
          rule: possessiveItsRule,
        }),
      )
    }

    return matches
  },
}

export const pluralPossessiveApostropheRule: GrammerRule = {
  id: 'PLURAL_POSSESSIVE_APOSTROPHE',
  name: 'Plural Possessive Apostrophe',
  description:
    'Flags a small set of plural possessive phrases when the apostrophe is missing.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [{ text: "The writers' room was ready." }],
    bad: [{ text: 'The writers room was ready.' }],
  },
  check(context) {
    return findTokenPhraseMatches(context, pluralPossessivePatterns).map(
      ({ entry, tokens }) => {
        const firstToken = tokens[0]
        const lastToken = tokens.at(-1) ?? firstToken

        return createMatch({
          text: context.text,
          offset: firstToken.offset,
          length: lastToken.offset + lastToken.length - firstToken.offset,
          message: entry.message,
          replacements: [entry.replacement],
          rule: pluralPossessiveApostropheRule,
        })
      },
    )
  },
}

export const possessivePronounApostropheRule: GrammerRule = {
  id: 'POSSESSIVE_PRONOUN_APOSTROPHE',
  name: 'Possessive Pronoun Apostrophe',
  description:
    'Flags possessive pronouns like "your\'s" when they are incorrectly written with an apostrophe.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [{ text: 'The final choice is yours.' }],
    bad: [{ text: "The final choice is your's." }],
  },
  check({ text, tokens }) {
    return tokens.flatMap((token) => {
      const replacement =
        possessivePronounCorrections[
          token.normalized as keyof typeof possessivePronounCorrections
        ]

      if (!replacement || !hasSupportedWordCasing(token.value)) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use "${replacement}" without an apostrophe.`,
          replacements: [preserveCase(token.value, replacement)],
          rule: possessivePronounApostropheRule,
        }),
      ]
    })
  },
}

export const whosePossessiveRule: GrammerRule = {
  id: 'WHOSE_POSSESSIVE',
  name: 'Whose Possessive',
  description:
    'Flags "who\'s" when the possessive form "whose" is more likely before a nearby noun.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [{ text: 'Whose idea was this?' }],
    bad: [{ text: "Who's idea was this?" }],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = tokens[index + 1]

      if (
        current.normalized !== "who's" ||
        !/^\s+$/u.test(
          text.slice(current.offset + current.length, next.offset),
        ) ||
        !LIKELY_POSSESSED_NOUNS.has(next.normalized) ||
        /^[A-Z0-9_-]+$/u.test(next.value)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: current.offset,
          length: current.length,
          message: 'Use "whose" for possession.',
          replacements: [preserveCase(current.value, 'whose')],
          rule: whosePossessiveRule,
        }),
      )
    }

    return matches
  },
}

export const whosContractionRule: GrammerRule = {
  id: 'WHOS_CONTRACTION',
  name: "Who's Contraction",
  description:
    'Flags "whose" when the contraction "who\'s" is more likely before a likely predicate or complement.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [{ text: "Who's ready to ship?" }],
    bad: [{ text: 'Whose ready to ship?' }],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = tokens[index + 1]

      if (
        current.normalized !== 'whose' ||
        !/^\s+$/u.test(
          text.slice(current.offset + current.length, next.offset),
        ) ||
        !whoseContractionFollowers.includes(
          next.normalized as (typeof whoseContractionFollowers)[number],
        )
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: current.offset,
          length: current.length,
          message: 'Use "who\'s" for "who is" or "who has".',
          replacements: [preserveCase(current.value, "who's")],
          rule: whosContractionRule,
        }),
      )
    }

    return matches
  },
}

export const decadePluralRule: GrammerRule = {
  id: 'DECADE_PLURAL',
  name: 'Decade Plural',
  description:
    'Flags decade plurals like "1980\'s" when the apostrophe is not marking possession.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [{ text: 'The 1980s changed software culture.' }],
    bad: [{ text: "The 1980's changed software culture." }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex =
      /\b(?:in|during|from|throughout)\s+the\s+((?:18|19|20)\d0|[1-9]0)'s\b/giu

    for (const match of text.matchAll(regex)) {
      const decade = match[1]

      if (!decade) {
        continue
      }

      const matchText = `${decade}'s`
      const offset = (match.index ?? 0) + match[0].length - matchText.length

      matches.push(
        createMatch({
          text,
          offset,
          length: matchText.length,
          message: 'Write decade plurals without an apostrophe.',
          replacements: [`${decade}s`],
          rule: decadePluralRule,
        }),
      )
    }

    return matches
  },
}

export const namedPossessivePhraseRule: GrammerRule = {
  id: 'NAMED_POSSESSIVE_PHRASE',
  name: 'Named Possessive Phrase',
  description:
    'Flags a curated set of holiday and event names when the expected apostrophe is missing.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [{ text: "We publish early for New Year's Day." }],
    bad: [{ text: 'We publish early for New Years Day.' }],
  },
  check(context) {
    return findTokenPhraseMatches(context, namedPossessivePatterns).map(
      ({ entry, tokens }) => {
        const firstToken = tokens[0]
        const lastToken = tokens.at(-1) ?? firstToken

        return createMatch({
          text: context.text,
          offset: firstToken.offset,
          length: lastToken.offset + lastToken.length - firstToken.offset,
          message: entry.message,
          replacements: [entry.replacement],
          rule: namedPossessivePhraseRule,
        })
      },
    )
  },
}

export const mixedApostropheStyleRule: GrammerRule = {
  id: 'MIXED_APOSTROPHE_STYLE',
  name: 'Mixed Apostrophe Style',
  description:
    'Flags a minority apostrophe style when the document otherwise uses a consistent straight or curly apostrophe style in prose.',
  shortMessage: 'Punctuation',
  issueType: 'style',
  category: {
    id: 'APOSTROPHES',
    name: 'Apostrophes',
  },
  examples: {
    good: [
      {
        text: 'We’re ready because it’s stable and they’ve agreed on the house style.',
      },
    ],
    bad: [
      { text: "We’re ready because it’s stable, but we're switching style." },
    ],
  },
  check({ text, tokens }) {
    const candidates = tokens
      .filter(isApostropheStyleCandidate)
      .map((token) => ({
        token,
        style: getTokenApostropheStyle(token),
      }))
      .filter(
        (
          candidate,
        ): candidate is { token: Token; style: 'curly' | 'straight' } =>
          candidate.style !== null,
      )

    if (candidates.length < 3) {
      return []
    }

    const curlyCount = candidates.filter(
      (candidate) => candidate.style === 'curly',
    ).length
    const straightCount = candidates.length - curlyCount

    if (curlyCount === 0 || straightCount === 0) {
      return []
    }

    const preferredStyle = curlyCount > straightCount ? 'curly' : 'straight'
    const preferredCount =
      preferredStyle === 'curly' ? curlyCount : straightCount
    const minorityCount = candidates.length - preferredCount

    if (preferredCount < 3 || preferredCount < minorityCount * 2) {
      return []
    }

    const replacementCharacter = preferredStyle === 'curly' ? '’' : "'"
    const preferredLabel = preferredStyle === 'curly' ? 'curly' : 'straight'

    return candidates.flatMap(({ token, style }) => {
      if (style === preferredStyle) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use ${preferredLabel} apostrophes consistently in this document.`,
          replacements: [token.value.replace(/['’]/gu, replacementCharacter)],
          rule: mixedApostropheStyleRule,
        }),
      ]
    })
  },
}

export const apostrophesRules = [
  incorrectApostrophesRule,
  splitContractionRule,
  possessiveItsRule,
  pluralPossessiveApostropheRule,
  possessivePronounApostropheRule,
  whosePossessiveRule,
  whosContractionRule,
  decadePluralRule,
  namedPossessivePhraseRule,
  mixedApostropheStyleRule,
]
