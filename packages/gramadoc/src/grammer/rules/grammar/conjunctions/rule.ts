import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const REDUNDANT_CONJUNCTION_PATTERNS = [
  {
    first: 'although',
    second: 'but',
    message: 'Avoid using both "although" and "but" in the same clause.',
    replacement: '',
  },
  {
    first: 'because',
    second: 'so',
    message: 'Avoid using both "because" and "so" in the same clause.',
    replacement: '',
  },
]

export const redundantConjunctionPairRule: GrammerRule = {
  id: 'REDUNDANT_CONJUNCTION_PAIR',
  name: 'Redundant Conjunction Pair',
  description:
    'Flags a small set of conjunction pairings that usually should not appear together in the same clause.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'CONJUNCTIONS',
    name: 'Conjunctions',
  },
  examples: {
    good: [
      { text: 'Although it was late, we continued.' },
      { text: 'Because it was late, we stayed home.' },
    ],
    bad: [
      { text: 'Although it was late, but we continued.' },
      { text: 'Because it was late, so we stayed home.' },
    ],
  },
  check({ text, tokens }) {
    const matches = []

    for (let index = 0; index < tokens.length; index += 1) {
      const current = tokens[index]
      const pattern = REDUNDANT_CONJUNCTION_PATTERNS.find(
        (candidate) => candidate.first === current.normalized,
      )

      if (!pattern) {
        continue
      }

      const nextBoundaryIndex = tokens.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > index &&
          /[.!?]/.test(
            text.slice(
              tokens[candidateIndex - 1].offset +
                tokens[candidateIndex - 1].length,
              candidate.offset,
            ),
          ),
      )

      const searchEnd =
        nextBoundaryIndex >= 0 ? nextBoundaryIndex : tokens.length
      const redundantToken = tokens
        .slice(index + 1, searchEnd)
        .find((candidate) => candidate.normalized === pattern.second)

      if (!redundantToken) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: redundantToken.offset,
          length: redundantToken.length,
          message: pattern.message,
          replacements: [pattern.replacement],
          rule: redundantConjunctionPairRule,
        }),
      )
    }

    return matches
  },
}

export const correlativeConjunctionRule: GrammerRule = {
  id: 'CORRELATIVE_CONJUNCTION',
  name: 'Correlative Conjunction',
  description: 'Flags a small set of mismatched correlative conjunction pairs.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'CONJUNCTIONS',
    name: 'Conjunctions',
  },
  examples: {
    good: [
      { text: 'Either we leave now or we stay here.' },
      { text: 'Neither the notes nor the summary helped.' },
    ],
    bad: [
      { text: 'Either we leave now and we stay here.' },
      { text: 'Neither the notes or the summary helped.' },
    ],
  },
  check({ text, tokens }) {
    const matches = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]

      if (current.normalized === 'either') {
        const mismatch = tokens
          .slice(index + 1, Math.min(tokens.length, index + 8))
          .find((candidate) => candidate.normalized === 'and')

        if (mismatch) {
          matches.push(
            createMatch({
              text,
              offset: mismatch.offset,
              length: mismatch.length,
              message: 'Use "or" with "either".',
              replacements: ['or'],
              rule: correlativeConjunctionRule,
            }),
          )
        }
      }

      if (current.normalized === 'neither') {
        const mismatch = tokens
          .slice(index + 1, Math.min(tokens.length, index + 8))
          .find((candidate) => candidate.normalized === 'or')

        if (mismatch) {
          matches.push(
            createMatch({
              text,
              offset: mismatch.offset,
              length: mismatch.length,
              message: 'Use "nor" with "neither".',
              replacements: ['nor'],
              rule: correlativeConjunctionRule,
            }),
          )
        }
      }
    }

    return matches
  },
}

const SENTENCE_START_CONJUNCTIONS = new Set(['and', 'but'])
const MIN_SENTENCE_START_CONJUNCTION_TOKENS = 6

function isLikelySentenceFragment(
  sentenceTokens: Parameters<GrammerRule['check']>[0]['tokens'],
) {
  return sentenceTokens.length < MIN_SENTENCE_START_CONJUNCTION_TOKENS
}

export const sentenceStartConjunctionRule: GrammerRule = {
  id: 'SENTENCE_START_CONJUNCTION',
  name: 'Sentence-Start Conjunction',
  description:
    'Advises on sentence-start "and" or "but" in formal prose when the sentence is long enough that a direct rewrite is usually cleaner.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'CONJUNCTIONS',
    name: 'Conjunctions',
  },
  scope: {
    blockKinds: ['paragraph', 'blockquote'],
  },
  examples: {
    good: [
      {
        text: 'The release shipped after review. The follow-up note shipped later.',
      },
      { text: 'And then we left.' },
    ],
    bad: [
      {
        text: 'The release shipped after review. But the follow-up note still needed edits.',
      },
    ],
  },
  check({ text, sentenceTokens, tokens }) {
    const matches = []

    for (const token of tokens) {
      if (
        !token.isSentenceStart ||
        !SENTENCE_START_CONJUNCTIONS.has(token.normalized)
      ) {
        continue
      }

      const sentence = sentenceTokens[token.sentenceIndex] ?? []

      if (sentence.length === 0 || isLikelySentenceFragment(sentence)) {
        continue
      }

      if (token.sentenceIndex === 0) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message:
            'Consider removing this sentence-start conjunction for a more direct sentence in formal prose.',
          replacements: [''],
          rule: sentenceStartConjunctionRule,
        }),
      )
    }

    return matches
  },
}

export const conjunctionsRules = [
  redundantConjunctionPairRule,
  correlativeConjunctionRule,
  sentenceStartConjunctionRule,
]
