import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

function getOrdinalSuffix(value: number) {
  const lastTwoDigits = value % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th'
  }

  switch (value % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

const SMALL_NUMBER_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
}

const NUMBER_STYLE_CONTEXT_SKIP = new Set([
  'am',
  'api',
  'chapter',
  'day',
  'days',
  'gb',
  'hour',
  'hours',
  'id',
  'kb',
  'km',
  'line',
  'lines',
  'mb',
  'mi',
  'min',
  'mins',
  'minute',
  'minutes',
  'ms',
  'page',
  'pages',
  'percent',
  'pm',
  'px',
  'rem',
  'retry',
  'retries',
  's',
  'sdk',
  'sec',
  'secs',
  'section',
  'sections',
  'step',
  'steps',
  'tb',
  'ui',
  'v',
  'version',
  'versions',
])

const NUMBER_STYLE_PREVIOUS_WORD_SKIP = new Set([
  'chapter',
  'example',
  'examples',
  'line',
  'lines',
  'page',
  'pages',
  'retry',
  'retries',
  'section',
  'sections',
  'step',
  'steps',
  'v',
  'version',
  'versions',
])

function shouldSkipSmallNumberStyle(
  text: string,
  offset: number,
  length: number,
  previousWord: string | undefined,
  nextWord?: string,
) {
  const previousCharacter = text[offset - 1] ?? ''
  const nextCharacter = text[offset + length] ?? ''

  return (
    /[$£€#/@]/u.test(previousCharacter) ||
    /[%/:.=+-]/u.test(nextCharacter) ||
    nextWord === undefined ||
    NUMBER_STYLE_CONTEXT_SKIP.has(nextWord) ||
    (previousWord !== undefined &&
      NUMBER_STYLE_PREVIOUS_WORD_SKIP.has(previousWord))
  )
}

export const ordinalSuffixRule: GrammerRule = {
  id: 'ORDINAL_SUFFIX',
  name: 'Ordinal Suffix',
  description: 'Flags numeric ordinals that use the wrong English suffix.',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'NUMBERS',
    name: 'Numbers',
  },
  examples: {
    good: [
      { text: 'This is the 21st draft.' },
      { text: 'She finished in 12th place.' },
    ],
    bad: [
      { text: 'This is the 21th draft.' },
      { text: 'She finished in 2th place.' },
    ],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/\b(\d+)(st|nd|rd|th)\b/gi)) {
      const digits = Number(match[1])
      const suffix = match[2].toLowerCase()
      const expectedSuffix = getOrdinalSuffix(digits)

      if (suffix === expectedSuffix || match.index === undefined) {
        continue
      }

      const suffixOffset = match.index + String(match[1]).length

      matches.push(
        createMatch({
          text,
          offset: suffixOffset,
          length: suffix.length,
          message: `Use "${expectedSuffix}" as the ordinal suffix for ${digits}.`,
          replacements: [expectedSuffix],
          rule: ordinalSuffixRule,
        }),
      )
    }

    return matches
  },
}

export const duplicateCurrencySymbolRule: GrammerRule = {
  id: 'DUPLICATE_CURRENCY_SYMBOL',
  name: 'Duplicate Currency Symbol',
  description:
    'Flags repeated currency symbols like "$$20" where only one symbol should appear.',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'NUMBERS',
    name: 'Numbers',
  },
  examples: {
    good: [{ text: 'The refund was $20.' }, { text: 'The fee was EUR 20.' }],
    bad: [{ text: 'The refund was $$20.' }, { text: 'The fee was ££30.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/([$£€])\1+(?=\d)/g)) {
      if (match.index === undefined) {
        continue
      }

      const symbol = match[1]

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Use a single currency symbol here.',
          replacements: [symbol],
          rule: duplicateCurrencySymbolRule,
        }),
      )
    }

    return matches
  },
}

export const duplicatePercentSignRule: GrammerRule = {
  id: 'DUPLICATE_PERCENT_SIGN',
  name: 'Duplicate Percent Sign',
  description: 'Flags repeated percent signs like "50%%".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'NUMBERS',
    name: 'Numbers',
  },
  examples: {
    good: [{ text: 'The discount was 50% today.' }],
    bad: [{ text: 'The discount was 50%% today.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/\b\d+(?:\.\d+)?(%%+)/g)) {
      if (match.index === undefined) {
        continue
      }

      const percentOffset = match.index + match[0].length - match[1].length

      matches.push(
        createMatch({
          text,
          offset: percentOffset,
          length: match[1].length,
          message: 'Use a single percent sign here.',
          replacements: ['%'],
          rule: duplicatePercentSignRule,
        }),
      )
    }

    return matches
  },
}

export const smallNumberStyleRule: GrammerRule = {
  id: 'SMALL_NUMBER_STYLE',
  name: 'Small Number Style',
  description:
    'Suggests spelling out isolated single-digit numbers in running prose when no technical format is implied.',
  shortMessage: 'Formatting',
  issueType: 'style',
  category: {
    id: 'NUMBERS',
    name: 'Numbers',
  },
  scope: {
    blockKinds: ['paragraph', 'blockquote'],
  },
  examples: {
    good: [{ text: 'We found three issues in the draft.' }],
    bad: [{ text: 'We found 3 issues in the draft.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/\b([0-9])\b/gu)) {
      if (match.index === undefined) {
        continue
      }

      const previousWord = text
        .slice(0, match.index)
        .match(/([\p{L}][\p{L}'-]*)\s*$/u)?.[1]
        ?.toLowerCase()
      const nextWord = text
        .slice(match.index + match[0].length)
        .match(/^\s+([\p{L}][\p{L}'-]*)/u)?.[1]
        ?.toLowerCase()

      if (
        shouldSkipSmallNumberStyle(
          text,
          match.index,
          match[0].length,
          previousWord,
          nextWord,
        )
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Spell out small numbers in running prose when possible.',
          replacements: [SMALL_NUMBER_WORDS[match[1]] ?? match[1]],
          rule: smallNumberStyleRule,
        }),
      )
    }

    return matches
  },
}

export const numbersRules = [
  ordinalSuffixRule,
  duplicateCurrencySymbolRule,
  duplicatePercentSignRule,
  smallNumberStyleRule,
]
