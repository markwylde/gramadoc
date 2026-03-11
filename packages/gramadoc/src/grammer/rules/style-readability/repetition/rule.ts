import type { Match } from '../../../../types.js'
import { getStyleRepetitionPosBucket } from '../../../linguistics.js'
import { technicalAllowlist } from '../../../resources/technical-allowlist.js'
import type {
  GrammerRule,
  StyleRepetitionPosBucket,
  Token,
} from '../../../types.js'
import { createMatch } from '../../../utils.js'

const LOW_SIGNAL_VERBS = new Set([
  'be',
  'do',
  'get',
  'go',
  'have',
  'help',
  'keep',
  'make',
  'need',
  'seem',
  'take',
  'use',
])
const LOW_SIGNAL_NOUNS = new Set([
  'example',
  'guide',
  'page',
  'section',
  'step',
  'thing',
])
const LOW_SIGNAL_ADJECTIVES = new Set([
  'available',
  'clear',
  'helpful',
  'ready',
  'similar',
  'useful',
])

interface RepetitionBucketThreshold {
  minimumCount: number
  minimumRatio: number
  minimumLength: number
}

interface RepetitionBucketConfig {
  bucket: StyleRepetitionPosBucket
  thresholds: RepetitionBucketThreshold
  message: (token: Token, count: number) => string
}

const STYLE_REPETITION_THRESHOLDS: Record<
  StyleRepetitionPosBucket,
  RepetitionBucketThreshold
> = {
  adjective: {
    minimumCount: 4,
    minimumRatio: 0.055,
    minimumLength: 5,
  },
  noun: {
    minimumCount: 5,
    minimumRatio: 0.085,
    minimumLength: 4,
  },
  verb: {
    minimumCount: 4,
    minimumRatio: 0.05,
    minimumLength: 4,
  },
}

function isWhitespaceOnly(text: string, start: number, end: number) {
  return /^\s+$/.test(text.slice(start, end))
}

function createRepetitionMatch(options: {
  text: string
  offset: number
  length: number
  message: string
  rule: GrammerRule
}) {
  const { text, offset, length, message, rule } = options

  return createMatch({
    text,
    offset,
    length,
    message,
    replacements: [''],
    rule,
  })
}

function getPhraseText(tokens: Token[]) {
  return tokens.map((token) => token.value).join(' ')
}

function getOpeningKey(tokens: Token[]) {
  return tokens
    .slice(0, 2)
    .map((token) => token.normalized)
    .join(' ')
}

function isTechnicalTerm(token: Token) {
  return technicalAllowlist.includes(
    token.normalized as (typeof technicalAllowlist)[number],
  )
}

function isAllowedStyleRepetitionToken(
  token: Token,
  bucket: StyleRepetitionPosBucket,
) {
  if (
    token.isCapitalized ||
    token.lemma.length < STYLE_REPETITION_THRESHOLDS[bucket].minimumLength ||
    isTechnicalTerm(token) ||
    token.posHintConfidence === 'low' ||
    token.usedFallbackPosGuess
  ) {
    return false
  }

  if (
    bucket === 'noun' &&
    (token.isPosAmbiguous || token.posHints.some((hint) => hint !== 'noun'))
  ) {
    return false
  }

  switch (bucket) {
    case 'verb':
      if (token.isPosAmbiguous) {
        return false
      }

      return !LOW_SIGNAL_VERBS.has(token.lemma)
    case 'noun':
      return !LOW_SIGNAL_NOUNS.has(token.lemma)
    case 'adjective':
      if (token.isPosAmbiguous) {
        return false
      }

      return !LOW_SIGNAL_ADJECTIVES.has(token.lemma)
  }
}

function getStyleRepetitionMatches(options: {
  text: string
  tokens: Token[]
  wordCount: number
  bucket: StyleRepetitionPosBucket
  message: RepetitionBucketConfig['message']
  rule: GrammerRule
}) {
  const { text, tokens, wordCount, bucket, message, rule } = options
  const counts = new Map<string, { count: number; firstToken: Token }>()
  const thresholds = STYLE_REPETITION_THRESHOLDS[bucket]

  for (const token of tokens) {
    if (
      getStyleRepetitionPosBucket(token) !== bucket ||
      !isAllowedStyleRepetitionToken(token, bucket)
    ) {
      continue
    }

    const existing = counts.get(token.lemma)

    if (existing) {
      existing.count += 1
      continue
    }

    counts.set(token.lemma, {
      count: 1,
      firstToken: token,
    })
  }

  return [...counts.values()].flatMap(({ count, firstToken }) => {
    if (
      count < thresholds.minimumCount ||
      count / Math.max(wordCount, 1) < thresholds.minimumRatio
    ) {
      return []
    }

    return [
      createMatch({
        text,
        offset: firstToken.offset,
        length: firstToken.length,
        message: message(firstToken, count),
        rule,
      }),
    ]
  })
}

export const repeatedWordRule: GrammerRule = {
  id: 'REPEATED_WORD',
  name: 'Repeated Word',
  description: 'Flags the same word when it appears twice in a row.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'REPETITION',
    name: 'Repetition',
  },
  examples: {
    good: [
      { text: 'This sentence uses each word once.' },
      { text: 'The quick brown fox jumps over the lazy dog.' },
    ],
    bad: [
      { text: 'This is the the repeated word example.' },
      { text: 'We went went home early.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 1; index < tokens.length; index += 1) {
      const previous = tokens[index - 1]
      const current = tokens[index]

      if (
        previous.normalized === current.normalized &&
        isWhitespaceOnly(
          text,
          previous.offset + previous.length,
          current.offset,
        )
      ) {
        const whitespaceStart = previous.offset + previous.length
        matches.push(
          createRepetitionMatch({
            text,
            offset: whitespaceStart,
            length: current.offset + current.length - whitespaceStart,
            message: `Repeated word: "${current.value}".`,
            rule: repeatedWordRule,
          }),
        )
      }
    }

    return matches
  },
}

export const repeatedPhraseRule: GrammerRule = {
  id: 'REPEATED_PHRASE',
  name: 'Repeated Phrase',
  description:
    'Flags adjacent repeated two-word or three-word phrases when they are duplicated verbatim.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'REPETITION',
    name: 'Repetition',
  },
  examples: {
    good: [
      { text: 'The plan moved from draft to delivery.' },
      { text: 'We met in the office and in the cafe.' },
    ],
    bad: [
      { text: 'This is a very good a very good example.' },
      { text: 'We met at the end of the day at the end of the day.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []
    let index = 0

    while (index < tokens.length) {
      let matchedPhrase = false

      for (let phraseLength = 3; phraseLength >= 2; phraseLength -= 1) {
        const firstPhrase = tokens.slice(index, index + phraseLength)
        const secondPhrase = tokens.slice(
          index + phraseLength,
          index + phraseLength * 2,
        )

        if (
          firstPhrase.length !== phraseLength ||
          secondPhrase.length !== phraseLength
        ) {
          continue
        }

        const firstBoundaryEnd =
          (firstPhrase.at(-1)?.offset ?? firstPhrase[0].offset) +
          (firstPhrase.at(-1)?.length ?? 0)
        const secondStart = secondPhrase[0].offset
        const secondBoundaryEnd =
          (secondPhrase.at(-1)?.offset ?? secondStart) +
          (secondPhrase.at(-1)?.length ?? 0)

        const sameTokens = firstPhrase.every(
          (token, phraseIndex) =>
            token.normalized === secondPhrase[phraseIndex]?.normalized,
        )

        const firstPhraseWhitespaceOnly = firstPhrase
          .slice(0, -1)
          .every((token, phraseIndex) =>
            isWhitespaceOnly(
              text,
              token.offset + token.length,
              firstPhrase[phraseIndex + 1].offset,
            ),
          )

        const secondPhraseWhitespaceOnly = secondPhrase
          .slice(0, -1)
          .every((token, phraseIndex) =>
            isWhitespaceOnly(
              text,
              token.offset + token.length,
              secondPhrase[phraseIndex + 1].offset,
            ),
          )

        if (
          !sameTokens ||
          !firstPhraseWhitespaceOnly ||
          !secondPhraseWhitespaceOnly ||
          !isWhitespaceOnly(text, firstBoundaryEnd, secondStart)
        ) {
          continue
        }

        const phraseText = getPhraseText(firstPhrase)

        matches.push(
          createRepetitionMatch({
            text,
            offset: firstBoundaryEnd,
            length: secondBoundaryEnd - firstBoundaryEnd,
            message: `Repeated phrase: "${phraseText}".`,
            rule: repeatedPhraseRule,
          }),
        )

        index += phraseLength * 2
        matchedPhrase = true
        break
      }

      if (!matchedPhrase) {
        index += 1
      }
    }

    return matches
  },
}

export const repeatedSentenceOpeningRule: GrammerRule = {
  id: 'REPEATED_SENTENCE_OPENING',
  name: 'Repeated Sentence Opening',
  description:
    'Flags adjacent sentences that repeat the same opening words, which can make technical prose feel monotonous.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'REPETITION',
    name: 'Repetition',
  },
  examples: {
    good: [
      {
        text: 'This guide explains the setup. The next section shows the API.',
      },
    ],
    bad: [
      { text: 'This guide explains the setup. This guide covers the API.' },
    ],
  },
  check({ text, sentenceTokens }) {
    const matches: Match[] = []

    for (let index = 1; index < sentenceTokens.length; index += 1) {
      const previousTokens = sentenceTokens[index - 1] ?? []
      const currentTokens = sentenceTokens[index] ?? []
      const openingKey = getOpeningKey(currentTokens)

      if (
        currentTokens.length < 2 ||
        previousTokens.length < 2 ||
        openingKey.length === 0 ||
        openingKey !== getOpeningKey(previousTokens)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: currentTokens[0].offset,
          length:
            currentTokens[1].offset +
            currentTokens[1].length -
            currentTokens[0].offset,
          message:
            'These adjacent sentences start the same way. Vary the opening for better flow.',
          replacements: [],
          rule: repeatedSentenceOpeningRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedParagraphOpeningRule: GrammerRule = {
  id: 'REPEATED_PARAGRAPH_OPENING',
  name: 'Repeated Paragraph Opening',
  description:
    'Flags adjacent paragraphs that open with the same words, which can flatten document rhythm.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'REPETITION',
    name: 'Repetition',
  },
  examples: {
    good: [
      {
        text: 'This guide explains setup.\n\nThe next section shows deployment.',
      },
    ],
    bad: [
      { text: 'This guide explains setup.\n\nThis guide shows deployment.' },
    ],
  },
  check({ text, paragraphTokens }) {
    const matches: Match[] = []

    for (let index = 1; index < paragraphTokens.length; index += 1) {
      const previousTokens = paragraphTokens[index - 1] ?? []
      const currentTokens = paragraphTokens[index] ?? []
      const openingKey = getOpeningKey(currentTokens)

      if (
        currentTokens.length < 2 ||
        previousTokens.length < 2 ||
        openingKey.length === 0 ||
        openingKey !== getOpeningKey(previousTokens)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: currentTokens[0].offset,
          length:
            currentTokens[1].offset +
            currentTokens[1].length -
            currentTokens[0].offset,
          message:
            'These adjacent paragraphs start the same way. Consider varying the opening.',
          replacements: [],
          rule: repeatedParagraphOpeningRule,
        }),
      )
    }

    return matches
  },
}

function createStyleRepetitionRule(config: {
  id: string
  name: string
  description: string
  examples: GrammerRule['examples']
  bucket: StyleRepetitionPosBucket
  message: RepetitionBucketConfig['message']
}) {
  const rule: GrammerRule = {
    id: config.id,
    name: config.name,
    description: config.description,
    shortMessage: 'Style',
    issueType: 'style',
    category: {
      id: 'REPETITION',
      name: 'Repetition',
    },
    examples: config.examples,
    check({ text, tokens, documentStats }) {
      return getStyleRepetitionMatches({
        text,
        tokens,
        wordCount: documentStats.wordCount,
        bucket: config.bucket,
        message: config.message,
        rule,
      })
    },
  }

  return rule
}

export const overusedVerbRule = createStyleRepetitionRule({
  id: 'OVERUSED_VERB',
  name: 'Overused Verb',
  description:
    'Flags repeated lexical verbs that dominate a document and make the prose feel mechanically repetitive.',
  examples: {
    good: [
      {
        text: 'We plan the rollout, review the checklist, and ship the change.',
      },
    ],
    bad: [
      {
        text: 'We improve the copy, improve the layout, improve the onboarding, and improve the docs.',
      },
    ],
  },
  bucket: 'verb',
  message: (token, count) =>
    `The verb "${token.value}" appears ${count} times. Consider varying the action or trimming repetition.`,
})

export const overusedNounRule = createStyleRepetitionRule({
  id: 'OVERUSED_NOUN',
  name: 'Overused Noun',
  description:
    'Flags repeated general nouns that can make a document feel circular when the same term keeps carrying the sentence.',
  examples: {
    good: [
      {
        text: 'The proposal outlines the rollout, timeline, and responsibilities.',
      },
    ],
    bad: [
      {
        text: 'The process blocks the process because the process wraps another process in the same process.',
      },
    ],
  },
  bucket: 'noun',
  message: (token, count) =>
    `The noun "${token.value}" appears ${count} times. Consider repeating it less or replacing some instances with a clearer alternative.`,
})

export const overusedAdjectiveRule = createStyleRepetitionRule({
  id: 'OVERUSED_ADJECTIVE',
  name: 'Overused Adjective',
  description:
    'Flags repeated descriptive adjectives when a document leans on the same modifier too heavily.',
  examples: {
    good: [{ text: 'The release is stable, fast, and easier to support.' }],
    bad: [
      {
        text: 'It is flexible software with flexible defaults, flexible workflows, and flexible review steps.',
      },
    ],
  },
  bucket: 'adjective',
  message: (token, count) =>
    `The adjective "${token.value}" appears ${count} times. Consider varying the description so the prose stays sharper.`,
})

export const repetitionRules = [
  repeatedWordRule,
  repeatedPhraseRule,
  repeatedSentenceOpeningRule,
  repeatedParagraphOpeningRule,
  overusedVerbRule,
  overusedNounRule,
  overusedAdjectiveRule,
]
