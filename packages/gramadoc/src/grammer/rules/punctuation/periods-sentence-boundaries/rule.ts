import type { Match } from '../../../../types.js'
import { analyzeQuotationMarks } from '../../../quotation.js'
import { getTokensInRange } from '../../../rule-helpers.js'
import type { GrammerRule, RuleCheckContext, Token } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const VALID_SENTENCE_END_REGEX = /(?:\.\.\.|[.!?:])(?:["')\]}"”’]+)?$/u
const TERMINAL_PUNCTUATION_REGEX = /([!?])\1+(?=(?:["')\]}"”’]+)?(?:\s|$))/g
const TRAILING_CLOSERS_REGEX = /["')\]}"”’]+$/u
const CLOSING_PUNCTUATION_CHARACTERS = `"'”’)]}`
const AUXILIARY_QUESTION_WORDS = new Set([
  'am',
  'are',
  'can',
  'could',
  'did',
  'do',
  'does',
  'had',
  'has',
  'have',
  'is',
  'may',
  'might',
  'must',
  'should',
  'was',
  'were',
  'will',
  'would',
])
const WH_QUESTION_WORDS = new Set([
  'how',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'why',
])
const NON_ELLIPTICAL_QUESTION_SECOND_WORDS = new Set([
  'a',
  'an',
  'he',
  'her',
  'his',
  'i',
  'it',
  'my',
  'our',
  'she',
  'that',
  'the',
  'their',
  'these',
  'they',
  'this',
  'those',
  'we',
  'you',
  'your',
])
const VERB_PHRASE_FOLLOWERS = new Set([
  'a',
  'an',
  'away',
  'back',
  'down',
  'her',
  'him',
  'home',
  'in',
  'into',
  'it',
  'me',
  'our',
  'out',
  'over',
  'the',
  'their',
  'them',
  'these',
  'this',
  'those',
  'through',
  'to',
  'up',
  'us',
  'you',
  'your',
])
const IMPERATIVE_DO_SECOND_WORDS = new Set([
  'a',
  'an',
  'more',
  'not',
  'some',
  'something',
  'the',
  'this',
  'that',
  'these',
  'those',
  'your',
  'our',
  'their',
  'my',
  'his',
  'her',
  'its',
])
const COMMON_ABBREVIATIONS = new Set([
  'dr',
  'e.g',
  'etc',
  'i.e',
  'jr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'sr',
  'vs',
])
const WORD_CHARACTER_REGEX = /[\p{L}\p{M}'’-]/u

interface TextRange {
  start: number
  end: number
  text: string
}

function getLineRanges(text: string): TextRange[] {
  const ranges: TextRange[] = []
  let lineStart = 0

  for (let index = 0; index <= text.length; index += 1) {
    if (index < text.length && text[index] !== '\n') {
      continue
    }

    ranges.push({
      start: lineStart,
      end: index,
      text: text.slice(lineStart, index),
    })
    lineStart = index + 1
  }

  return ranges
}

function trimTrailingWhitespace(range: TextRange) {
  let end = range.end

  while (
    end > range.start &&
    /\s/u.test(range.text[end - range.start - 1] ?? '')
  ) {
    end -= 1
  }

  return {
    ...range,
    end,
    text: range.text.slice(0, end - range.start),
  }
}

function trimRange(text: string, start: number, end: number) {
  let nextStart = start
  let nextEnd = end

  while (nextStart < nextEnd && /\s/u.test(text[nextStart] ?? '')) {
    nextStart += 1
  }

  while (nextEnd > nextStart && /\s/u.test(text[nextEnd - 1] ?? '')) {
    nextEnd -= 1
  }

  return {
    start: nextStart,
    end: nextEnd,
    text: text.slice(nextStart, nextEnd),
  }
}

function getRangeTokens(context: RuleCheckContext, range: TextRange) {
  return getTokensInRange(context.tokens, range.start, range.end)
}

function getLastToken(tokens: Token[]) {
  return tokens.at(-1) ?? null
}

function getQuestionWords(tokens: Token[]) {
  return tokens.map((token) => token.normalized)
}

function shouldUseQuestionMark(tokens: Token[], trimmedLine: string) {
  const trailingClosers = trimmedLine.match(TRAILING_CLOSERS_REGEX)?.[0] ?? ''
  const coreLine = trailingClosers
    ? trimmedLine.slice(0, -trailingClosers.length)
    : trimmedLine

  if (!coreLine.endsWith('.')) {
    return false
  }

  const [firstWord, secondWord, thirdWord] = getQuestionWords(tokens)

  if (!firstWord || !secondWord) {
    return false
  }

  if (firstWord === 'do' && IMPERATIVE_DO_SECOND_WORDS.has(secondWord)) {
    return false
  }

  if (AUXILIARY_QUESTION_WORDS.has(firstWord)) {
    return true
  }

  if (!WH_QUESTION_WORDS.has(firstWord)) {
    return false
  }

  if (firstWord === 'why' && secondWord === 'not') {
    return true
  }

  if (AUXILIARY_QUESTION_WORDS.has(secondWord)) {
    return true
  }

  if (
    NON_ELLIPTICAL_QUESTION_SECOND_WORDS.has(secondWord) ||
    !thirdWord ||
    !VERB_PHRASE_FOLLOWERS.has(thirdWord)
  ) {
    return false
  }

  return true
}

function getWordBeforeOffset(text: string, offset: number) {
  let end = offset

  while (
    end > 0 &&
    CLOSING_PUNCTUATION_CHARACTERS.includes(text[end - 1] ?? '')
  ) {
    end -= 1
  }

  let start = end

  while (start > 0 && WORD_CHARACTER_REGEX.test(text[start - 1] ?? '')) {
    start -= 1
  }

  return text.slice(start, end)
}

function isLikelyDecimalPoint(text: string, offset: number) {
  return (
    /\d/u.test(text[offset - 1] ?? '') && /\d/u.test(text[offset + 1] ?? '')
  )
}

function shouldFlagMissingSpace(text: string, offset: number) {
  if (isLikelyDecimalPoint(text, offset)) {
    return false
  }

  const previousWord = getWordBeforeOffset(text, offset)

  if (!previousWord) {
    return false
  }

  const normalizedPreviousWord = previousWord.toLowerCase()

  if (
    previousWord.length === 1 ||
    COMMON_ABBREVIATIONS.has(normalizedPreviousWord) ||
    previousWord === previousWord.toUpperCase()
  ) {
    return false
  }

  return true
}

function getEmbeddedQuotedQuestionMatches(
  context: RuleCheckContext,
  lineRange: TextRange,
) {
  const matches: Match[] = []
  const { pairs } = analyzeQuotationMarks(lineRange.text)

  for (const pair of pairs) {
    if (
      !lineRange.text.slice(0, pair.open).trim() &&
      !lineRange.text.slice(pair.close + 1).trim()
    ) {
      continue
    }

    const innerRange = trimRange(
      context.text,
      lineRange.start + pair.open + 1,
      lineRange.start + pair.close,
    )
    const tokens = getTokensInRange(
      context.tokens,
      innerRange.start,
      innerRange.end,
    )

    if (!innerRange.text || !shouldUseQuestionMark(tokens, innerRange.text)) {
      continue
    }

    const lastToken = getLastToken(tokens)

    if (!lastToken) {
      continue
    }

    const trailingClosers =
      innerRange.text.match(TRAILING_CLOSERS_REGEX)?.[0] ?? ''
    const quoteCharacter = context.text[lineRange.start + pair.close] ?? '"'

    matches.push(
      createMatch({
        text: context.text,
        offset: lastToken.offset,
        length: lineRange.start + pair.close + 1 - lastToken.offset,
        message: 'Questions should end with a question mark.',
        replacements: [
          `${lastToken.value}?${trailingClosers}${quoteCharacter}`,
        ],
        rule: questionMarkSentenceEndingRule,
      }),
    )
  }

  return matches
}

export const sentenceEndingPunctuationRule: GrammerRule = {
  id: 'SENTENCE_ENDING_PUNCTUATION',
  name: 'Sentence Ending Punctuation',
  description:
    'Requires each sentence-like line to end with terminal punctuation.',
  shortMessage: 'Punctuation',
  issueType: 'grammar',
  scope: {
    blockKinds: ['paragraph', 'blockquote', 'list-item'],
  },
  category: {
    id: 'PERIODS_SENTENCE_BOUNDARIES',
    name: 'Periods & Sentence Boundaries',
  },
  examples: {
    good: [
      { text: 'This sentence ends with a period.' },
      { text: 'Does this question end correctly?' },
    ],
    bad: [
      { text: 'This sentence is missing ending punctuation' },
      { text: 'Another line without a final mark' },
    ],
  },
  check(context) {
    const matches: Match[] = []

    for (const rawRange of getLineRanges(context.text)) {
      const range = trimTrailingWhitespace(rawRange)

      if (!range.text || VALID_SENTENCE_END_REGEX.test(range.text)) {
        continue
      }

      const lineTokens = getRangeTokens(context, range)
      const lastToken = getLastToken(lineTokens)

      if (!lastToken) {
        continue
      }

      matches.push(
        createMatch({
          text: context.text,
          offset: lastToken.offset,
          length: lastToken.length,
          message: 'Sentence should end with punctuation.',
          replacements: [`${lastToken.value}.`],
          rule: sentenceEndingPunctuationRule,
        }),
      )
    }

    return matches
  },
}

export const missingSpaceAfterSentenceBoundaryRule: GrammerRule = {
  id: 'MISSING_SPACE_AFTER_SENTENCE_BOUNDARY',
  name: 'Missing Space After Sentence Boundary',
  description:
    'Flags sentence-ending punctuation that is immediately followed by the next sentence without a space.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'PERIODS_SENTENCE_BOUNDARIES',
    name: 'Periods & Sentence Boundaries',
  },
  examples: {
    good: [
      { text: 'We finished. Then we left.' },
      { text: 'He asked, "Ready?" She nodded.' },
    ],
    bad: [
      { text: 'We finished.Then we left.' },
      { text: 'He asked, "Ready?"She nodded.' },
    ],
  },
  check({ text }) {
    const matches: Match[] = []

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index]

      if (!'.!?'.includes(character) || !shouldFlagMissingSpace(text, index)) {
        continue
      }

      let boundaryEnd = index + 1

      while (
        boundaryEnd < text.length &&
        CLOSING_PUNCTUATION_CHARACTERS.includes(text[boundaryEnd] ?? '')
      ) {
        boundaryEnd += 1
      }

      const nextCharacter = text[boundaryEnd]

      if (
        !nextCharacter ||
        /\s/u.test(nextCharacter) ||
        !/[\p{Lu}]/u.test(nextCharacter)
      ) {
        continue
      }

      const boundaryText = text.slice(index, boundaryEnd)

      matches.push(
        createMatch({
          text,
          offset: index,
          length: boundaryText.length,
          message: 'Add a space after sentence-ending punctuation.',
          replacements: [`${boundaryText} `],
          rule: missingSpaceAfterSentenceBoundaryRule,
        }),
      )
    }

    return matches
  },
}

export const questionMarkSentenceEndingRule: GrammerRule = {
  id: 'QUESTION_MARK_SENTENCE_ENDING',
  name: 'Question Mark Sentence Ending',
  description:
    'Flags likely direct questions that end with a period instead of a question mark.',
  shortMessage: 'Punctuation',
  issueType: 'grammar',
  category: {
    id: 'PERIODS_SENTENCE_BOUNDARIES',
    name: 'Periods & Sentence Boundaries',
  },
  examples: {
    good: [
      { text: 'Why walk down the street, when you can run?' },
      { text: 'Why go home so early?' },
    ],
    bad: [
      { text: 'Why walk down the street, when you can run.' },
      { text: 'Why go home so early.' },
    ],
  },
  check(context) {
    const matches: Match[] = []

    for (const rawRange of getLineRanges(context.text)) {
      const range = trimTrailingWhitespace(rawRange)
      const lineTokens = getRangeTokens(context, range)

      matches.push(...getEmbeddedQuotedQuestionMatches(context, range))

      if (!shouldUseQuestionMark(lineTokens, range.text)) {
        continue
      }

      const lastToken = getLastToken(lineTokens)

      if (!lastToken) {
        continue
      }

      const trailingClosers =
        range.text.match(TRAILING_CLOSERS_REGEX)?.[0] ?? ''
      const matchLength = range.end - lastToken.offset
      const replacement = `${lastToken.value}?${trailingClosers}`

      matches.push(
        createMatch({
          text: context.text,
          offset: lastToken.offset,
          length: matchLength,
          message: 'Questions should end with a question mark.',
          replacements: [replacement],
          rule: questionMarkSentenceEndingRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedTerminalPunctuationRule: GrammerRule = {
  id: 'REPEATED_TERMINAL_PUNCTUATION',
  name: 'Repeated Terminal Punctuation',
  description:
    'Flags repeated exclamation points or question marks at the end of a sentence.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'PERIODS_SENTENCE_BOUNDARIES',
    name: 'Periods & Sentence Boundaries',
  },
  examples: {
    good: [{ text: 'This is exciting!' }, { text: 'Wait...' }],
    bad: [{ text: 'This is exciting!!' }, { text: 'Are you sure??' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(TERMINAL_PUNCTUATION_REGEX)) {
      const offset = match.index ?? 0
      const punctuation = match[1]
      const repeatedSequence = match[0]

      matches.push(
        createMatch({
          text,
          offset,
          length: repeatedSequence.length,
          message: 'Use a single terminal punctuation mark here.',
          replacements: [punctuation],
          rule: repeatedTerminalPunctuationRule,
        }),
      )
    }

    return matches
  },
}

export const paragraphEndingPunctuationRule: GrammerRule = {
  id: 'PARAGRAPH_ENDING_PUNCTUATION',
  name: 'Paragraph Ending Punctuation',
  description:
    'Flags paragraph-like blocks that end without terminal punctuation after a sentence-length span of prose.',
  shortMessage: 'Punctuation',
  issueType: 'grammar',
  scope: {
    blockKinds: ['paragraph', 'blockquote', 'list-item'],
  },
  category: {
    id: 'PERIODS_SENTENCE_BOUNDARIES',
    name: 'Periods & Sentence Boundaries',
  },
  examples: {
    good: [{ text: 'This paragraph ends cleanly.' }],
    bad: [{ text: 'This paragraph ends without a final mark' }],
  },
  check(context) {
    const matches: Match[] = []

    for (const paragraphRange of context.paragraphRanges) {
      const trimmedText = paragraphRange.text.trimEnd()

      if (
        !trimmedText ||
        trimmedText.split(/\s+/u).length < 5 ||
        VALID_SENTENCE_END_REGEX.test(trimmedText)
      ) {
        continue
      }

      const paragraphTokens =
        context.paragraphTokens[paragraphRange.index] ??
        getTokensInRange(
          context.tokens,
          paragraphRange.start,
          paragraphRange.end,
        )
      const lastToken = getLastToken(paragraphTokens)

      if (!lastToken) {
        continue
      }

      matches.push(
        createMatch({
          text: context.text,
          offset: lastToken.offset,
          length: lastToken.length,
          message: 'Paragraphs should end with terminal punctuation.',
          replacements: [`${lastToken.value}.`],
          rule: paragraphEndingPunctuationRule,
        }),
      )
    }

    return matches
  },
}

export const periodsSentenceBoundariesRules = [
  paragraphEndingPunctuationRule,
  sentenceEndingPunctuationRule,
  missingSpaceAfterSentenceBoundaryRule,
  questionMarkSentenceEndingRule,
  repeatedTerminalPunctuationRule,
]
