import type { Match } from '../../../../types.js'
import {
  findPatternMatches,
  getMatchOffsets,
  literalPhraseToPattern,
} from '../../../patterns.js'
import {
  capitalizationAcronyms,
  capitalizationBrandNames,
  capitalizationProperNouns,
  capitalizationTitlePhrases,
  contextSensitiveCapitalizationTerms,
} from '../../../resources/capitalization.js'
import type { GrammerRule, TextBlockRange, Token } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const LOWERCASE_INITIAL_REGEX = /^\p{Ll}/u
const TITLE_CASE_WORD_REGEX = /^\p{Lu}\p{Ll}+$/u
const ALL_CAPS_WORD_REGEX = /^\p{Lu}{4,}$/u
const LOWERCASE_WORD_REGEX = /^\p{Ll}[\p{L}\p{M}'’-]*$/u
const MIXED_CASE_WORD_REGEX = /^(?=.*\p{Lu})(?=.*\p{Ll})[\p{L}\p{M}]{3,}$/u
const LEADING_SENTENCE_DECORATION_REGEX = /^[\s"'([{“”‘’]*$/u
const LEADING_SENTENCE_BOUNDARY_REGEX = /^[.!?]["')\]}”’]*\s+["'([{“”‘’]*$/u
const LEADING_LINE_BOUNDARY_REGEX = /^[\s"'([{“”‘’]*\n[\s"'([{“”‘’]*$/u
const LEADING_COLON_REGEX = /^:\s+["'([{“”‘’]*$/u
const DIALOGUE_TAG_BOUNDARY_REGEX = /[!?]["')\]}”’]*\s+$/u
const ABBREVIATION_TOKEN_REGEX = /^(?:\p{L}\.)+\p{L}$/u
const LINE_REGEX = /[^\n]+/g

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'via',
])

const PROPER_NOUNS: Record<string, string> = capitalizationProperNouns
const BRAND_NAMES: Record<string, string> = capitalizationBrandNames
const KNOWN_ACRONYMS = new Set(capitalizationAcronyms)
const TITLE_PHRASES: Record<string, string> = capitalizationTitlePhrases
const CONTEXT_SENSITIVE_TERMS = contextSensitiveCapitalizationTerms

const TITLE_PATTERNS = Object.entries(TITLE_PHRASES).map(
  ([phrase, replacement]) => ({
    replacement,
    pattern: literalPhraseToPattern(phrase),
  }),
)

const DIALOGUE_TAG_WORDS = new Set([
  'added',
  'admitted',
  'answered',
  'asked',
  'began',
  'called',
  'continued',
  'cried',
  'explained',
  'muttered',
  'murmured',
  'nodded',
  'noted',
  'recalled',
  'replied',
  'responded',
  'said',
  'shouted',
  'sighed',
  'smiled',
  'snapped',
  'told',
  'whispered',
  'wondered',
  'wrote',
  'yelled',
])

function capitalizeWord(word: string) {
  const [firstCharacter = '', ...rest] = [...word]
  return `${firstCharacter.toLocaleUpperCase('en')}${rest.join('')}`
}

function toTitleCase(line: string) {
  const words = line.trim().split(/\s+/u)

  return words
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('en')

      if (index > 0 && index < words.length - 1 && STOP_WORDS.has(lower)) {
        return lower
      }

      return capitalizeWord(lower)
    })
    .join(' ')
}

function getCanonicalReplacement(token: Token) {
  return BRAND_NAMES[token.normalized] ?? PROPER_NOUNS[token.normalized]
}

function isPluralizedAcronym(word: string) {
  const match = /^([\p{Lu}]{2,})(s|es)$/u.exec(word)
  return match !== null
}

function getLineRange(text: string, offset: number) {
  const start = text.lastIndexOf('\n', offset) + 1
  const end = text.indexOf('\n', offset)

  return {
    start,
    end: end >= 0 ? end : text.length,
  }
}

function getLineText(text: string, offset: number) {
  const range = getLineRange(text, offset)
  return text.slice(range.start, range.end)
}

function isHeadingStyleCandidate(line: string) {
  const words = line.split(/\s+/u)

  return !(
    line.length === 0 ||
    line.length > 60 ||
    /[.!?]$/u.test(line) ||
    words.length < 2 ||
    words.length > 6
  )
}

function getHeadingCandidateRanges(
  text: string,
  blockRanges?: TextBlockRange[],
) {
  const headingBlocks =
    blockRanges?.filter((blockRange) => blockRange.kind === 'heading') ?? []

  if ((blockRanges?.length ?? 0) > 0) {
    return headingBlocks.map((blockRange) => ({
      start: blockRange.start,
      end: blockRange.end,
      text: blockRange.text,
    }))
  }

  return [...text.matchAll(LINE_REGEX)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    text: match[0],
  }))
}

function isSentenceStartCandidate(
  token: Token,
  previousToken: Token | undefined,
  text: string,
) {
  if (!LOWERCASE_INITIAL_REGEX.test(token.value)) {
    return false
  }

  if (!previousToken) {
    return LEADING_SENTENCE_DECORATION_REGEX.test(text.slice(0, token.offset))
  }

  return (
    LEADING_SENTENCE_BOUNDARY_REGEX.test(token.leadingText) ||
    LEADING_LINE_BOUNDARY_REGEX.test(token.leadingText)
  )
}

function isDialogueTagContinuation(
  token: Token,
  previousToken: Token | undefined,
) {
  return Boolean(
    previousToken &&
      DIALOGUE_TAG_WORDS.has(token.normalized) &&
      DIALOGUE_TAG_BOUNDARY_REGEX.test(previousToken.trailingText),
  )
}

function isLowercaseAfterAbbreviation(
  token: Token,
  previousToken: Token | undefined,
) {
  return Boolean(
    previousToken &&
      LOWERCASE_INITIAL_REGEX.test(token.value) &&
      token.leadingText === '. ' &&
      ABBREVIATION_TOKEN_REGEX.test(previousToken.value),
  )
}

function shouldAllowLowercaseSentenceStart(token: Token) {
  const replacement = BRAND_NAMES[token.normalized]
  return replacement !== undefined && token.value === replacement
}

function getTokenBlockRange(token: Token, blockRanges?: TextBlockRange[]) {
  return blockRanges?.find(
    (blockRange) => blockRange.index === token.blockIndex,
  )
}

function isHeadingToken(token: Token, blockRanges?: TextBlockRange[]) {
  return getTokenBlockRange(token, blockRanges)?.kind === 'heading'
}

function isCodeAdjacentToken(token: Token) {
  return /`$|`/u.test(token.leadingText) || /^`|`/u.test(token.trailingText)
}

function isStructuredTextToken(
  token: Token,
  structuredTextSpans: Parameters<
    GrammerRule['check']
  >[0]['structuredTextSpans'],
) {
  return structuredTextSpans.some(
    (span) => token.offset >= span.start && token.offset < span.end,
  )
}

function shouldCapitalizeContextSensitiveTerm(
  previousToken: Token | undefined,
  nextToken: Token | undefined,
) {
  if (!previousToken && !nextToken) {
    return false
  }

  const previousNormalized = previousToken?.normalized

  return (
    previousNormalized === 'in' ||
    previousNormalized === 'during' ||
    previousNormalized === 'throughout' ||
    nextToken?.isNumberLike === true
  )
}

export const sentenceCapitalizationRule: GrammerRule = {
  id: 'SENTENCE_CAPITALIZATION',
  name: 'Sentence Capitalization',
  description: 'Requires each sentence to start with an uppercase letter.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [
      { text: 'This sentence starts correctly.' },
      { text: '"Quoted" sentences can still begin with a capital.' },
    ],
    bad: [
      { text: 'this sentence starts with a lowercase letter.' },
      { text: '"quoted" text should still begin with a capital.' },
    ],
  },
  check({ text, tokens, blockRanges }) {
    return tokens.flatMap((token, index) => {
      const previousToken = tokens[index - 1]

      if (
        !isSentenceStartCandidate(token, previousToken, text) ||
        isHeadingToken(token, blockRanges) ||
        isDialogueTagContinuation(token, previousToken) ||
        isLowercaseAfterAbbreviation(token, previousToken) ||
        shouldAllowLowercaseSentenceStart(token)
      ) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: 'Sentence should start with a capital letter.',
          replacements: [
            getCanonicalReplacement(token) ?? capitalizeWord(token.value),
          ],
          rule: sentenceCapitalizationRule,
        }),
      ]
    })
  },
}

export const properNounCapitalizationRule: GrammerRule = {
  id: 'PROPER_NOUN_CAPITALIZATION',
  name: 'Proper Noun Capitalization',
  description:
    'Flags a small set of common proper nouns when they are written in lowercase.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [{ text: 'We met in London on Monday.' }],
    bad: [{ text: 'We met in london on monday.' }],
  },
  check({ text, tokens, structuredTextSpans }) {
    return tokens.flatMap((token, index) => {
      const directReplacement = PROPER_NOUNS[token.normalized]
      const contextReplacement = CONTEXT_SENSITIVE_TERMS.find(
        (entry) => entry.word === token.normalized,
      )?.replacement
      const replacement =
        directReplacement ??
        (shouldCapitalizeContextSensitiveTerm(
          tokens[index - 1],
          tokens[index + 1],
        )
          ? contextReplacement
          : undefined)

      if (
        !replacement ||
        token.value !== token.normalized ||
        token.isSentenceStart ||
        isCodeAdjacentToken(token) ||
        isStructuredTextToken(token, structuredTextSpans)
      ) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Capitalize the proper noun "${replacement}".`,
          replacements: [replacement],
          rule: properNounCapitalizationRule,
        }),
      ]
    })
  },
}

export const titleCapitalizationRule: GrammerRule = {
  id: 'TITLE_CAPITALIZATION',
  name: 'Title Capitalization',
  description:
    'Flags a small set of known titles when they are written in lowercase.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [{ text: 'We studied The Great Gatsby in class.' }],
    bad: [{ text: 'We studied the great gatsby in class.' }],
  },
  check(context) {
    return TITLE_PATTERNS.flatMap(({ pattern, replacement }) =>
      findPatternMatches(context, pattern).flatMap((match) => {
        const { offset, length } = getMatchOffsets(match)
        const original = context.text.slice(offset, offset + length)

        if (original === replacement) {
          return []
        }

        return [
          createMatch({
            text: context.text,
            offset,
            length,
            message: `Capitalize the title as "${replacement}".`,
            replacements: [replacement],
            rule: titleCapitalizationRule,
          }),
        ]
      }),
    )
  },
}

export const capitalizationAfterPunctuationRule: GrammerRule = {
  id: 'CAPITALIZATION_AFTER_PUNCTUATION',
  name: 'Capitalization After Punctuation',
  description:
    'Flags lowercase words that begin a clause immediately after a colon.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [{ text: 'Remember this: Start with a capital.' }],
    bad: [{ text: 'Remember this: start with a capital.' }],
  },
  check({ text, tokens }) {
    return tokens.flatMap((token) => {
      if (
        !LOWERCASE_WORD_REGEX.test(token.value) ||
        !LEADING_COLON_REGEX.test(token.leadingText)
      ) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: 'Capitalize the first word after this punctuation mark.',
          replacements: [capitalizeWord(token.value)],
          rule: capitalizationAfterPunctuationRule,
        }),
      ]
    })
  },
}

export const incorrectAllCapsUsageRule: GrammerRule = {
  id: 'INCORRECT_ALL_CAPS_USAGE',
  name: 'Incorrect All-Caps Usage',
  description:
    'Flags all-caps words in running text when they do not appear to be acronyms.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [{ text: 'The API returned quickly.' }],
    bad: [{ text: 'This sentence is VERY loud.' }],
  },
  check({ text, tokens, blockRanges }) {
    return tokens.flatMap((token, index) => {
      const line = getLineText(text, token.offset)
      const previousToken = tokens[index - 1]

      if (
        !ALL_CAPS_WORD_REGEX.test(token.value) ||
        isHeadingToken(token, blockRanges) ||
        KNOWN_ACRONYMS.has(
          token.value as (typeof capitalizationAcronyms)[number],
        ) ||
        line.trim() === token.value ||
        isHeadingStyleCandidate(line.trim())
      ) {
        return []
      }

      const replacement = isSentenceStartCandidate(token, previousToken, text)
        ? toTitleCase(token.value)
        : token.value.toLocaleLowerCase('en')

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Avoid all-caps styling for "${token.value}" in running text.`,
          replacements: [replacement],
          rule: incorrectAllCapsUsageRule,
        }),
      ]
    })
  },
}

export const mixedCasingErrorsRule: GrammerRule = {
  id: 'MIXED_CASING_ERRORS',
  name: 'Mixed Casing Errors',
  description:
    'Flags words with inconsistent casing unless they match a known brand or acronym.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [{ text: 'OpenAI shared a clear update.' }],
    bad: [{ text: 'The eXaMpLe looked strange.' }],
  },
  check({ text, tokens, structuredTextSpans }) {
    return tokens.flatMap((token, index) => {
      if (
        !MIXED_CASE_WORD_REGEX.test(token.value) ||
        BRAND_NAMES[token.normalized] === token.value ||
        KNOWN_ACRONYMS.has(
          token.value.toUpperCase() as (typeof capitalizationAcronyms)[number],
        ) ||
        isPluralizedAcronym(token.value) ||
        TITLE_CASE_WORD_REGEX.test(token.value) ||
        isCodeAdjacentToken(token) ||
        isStructuredTextToken(token, structuredTextSpans)
      ) {
        return []
      }

      const previousToken = tokens[index - 1]
      const replacement = isSentenceStartCandidate(token, previousToken, text)
        ? capitalizeWord(token.value.toLocaleLowerCase('en'))
        : token.value.toLocaleLowerCase('en')

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use consistent capitalization for "${token.value}".`,
          replacements: [replacement],
          rule: mixedCasingErrorsRule,
        }),
      ]
    })
  },
}

export const brandCapitalizationRule: GrammerRule = {
  id: 'BRAND_CAPITALIZATION',
  name: 'Brand Capitalization',
  description:
    'Flags a small set of brands and products when their official capitalization is not used.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [{ text: 'We watched YouTube on an iPhone.' }],
    bad: [{ text: 'We watched youtube on an iphone.' }],
  },
  check({ text, tokens, structuredTextSpans }) {
    return tokens.flatMap((token) => {
      const replacement = BRAND_NAMES[token.normalized]

      if (
        !replacement ||
        token.value === replacement ||
        token.isSentenceStart ||
        isCodeAdjacentToken(token) ||
        isStructuredTextToken(token, structuredTextSpans)
      ) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use the official capitalization "${replacement}".`,
          replacements: [replacement],
          rule: brandCapitalizationRule,
        }),
      ]
    })
  },
}

export const capitalizationInHeadingsRule: GrammerRule = {
  id: 'CAPITALIZATION_IN_HEADINGS',
  name: 'Capitalization In Headings',
  description:
    'Flags short heading-like lines when they use all lowercase or all uppercase casing.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'CAPITALIZATION',
    name: 'Capitalization',
  },
  examples: {
    good: [{ text: 'Meeting Notes\nProject Update' }],
    bad: [{ text: 'meeting notes\nPROJECT UPDATE' }],
  },
  check({ text, blockRanges }) {
    const matches: Match[] = []

    for (const range of getHeadingCandidateRanges(text, blockRanges)) {
      const line = range.text.trim()

      if (!isHeadingStyleCandidate(line)) {
        continue
      }

      const isAllLower = line === line.toLocaleLowerCase('en')
      const isAllUpper =
        line === line.toLocaleUpperCase('en') && /\p{Lu}/u.test(line)

      if (!isAllLower && !isAllUpper) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: range.start,
          length: range.end - range.start,
          message: 'Use consistent heading capitalization.',
          replacements: [toTitleCase(line)],
          rule: capitalizationInHeadingsRule,
        }),
      )
    }

    return matches
  },
}

export const capitalizationRules = [
  sentenceCapitalizationRule,
  properNounCapitalizationRule,
  titleCapitalizationRule,
  capitalizationAfterPunctuationRule,
  incorrectAllCapsUsageRule,
  mixedCasingErrorsRule,
  brandCapitalizationRule,
  capitalizationInHeadingsRule,
]
