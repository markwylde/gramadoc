import type { Match } from '../../../../types.js'
import { hasPosHint } from '../../../linguistics.js'
import {
  createPatternRule,
  literalPhraseToPattern,
  tokensToText,
} from '../../../patterns.js'
import {
  getClausePredicateTokens,
  getClauseSubjectTokens,
  getSentenceClauseTokens,
  isLikelyFiniteVerb,
  isLikelyPastParticiple,
} from '../../../rule-helpers.js'
import type { GrammerRule, RuleCheckContext, Token } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const INTRODUCTORY_PATTERNS = [
  ['however'],
  ['therefore'],
  ['meanwhile'],
  ['instead'],
  ['for', 'example'],
  ['in', 'fact'],
  ['on', 'the', 'other', 'hand'],
] as const

const COORDINATING_CONJUNCTIONS = new Set([
  'and',
  'but',
  'for',
  'nor',
  'or',
  'so',
  'yet',
])
const SUBORDINATE_CLAUSE_STARTERS = new Set([
  'after',
  'although',
  'as',
  'because',
  'before',
  'if',
  'since',
  'that',
  'though',
  'unless',
  'until',
  'when',
  'whenever',
  'where',
  'whereas',
  'wherever',
  'whether',
  'which',
  'while',
  'who',
  'whom',
  'whose',
  'why',
])
const REPORTING_VERBS = new Set([
  'add',
  'added',
  'announce',
  'announced',
  'ask',
  'asked',
  'explain',
  'explained',
  'note',
  'noted',
  'report',
  'reported',
  'say',
  'said',
  'tell',
  'told',
  'write',
  'wrote',
])

function tokensAreWhitespaceSeparated(tokens: Token[]) {
  return tokens.every(
    (token, index) =>
      index === tokens.length - 1 || /^\s+$/u.test(token.trailingText),
  )
}

function isLikelyIndependentClause(tokens: Token[]) {
  const subjectTokens = getClauseSubjectTokens(tokens)
  const predicateTokens = getClausePredicateTokens(tokens)
  const firstToken = tokens[0]
  const firstSubject = subjectTokens[0]

  if (
    !firstToken ||
    !firstSubject ||
    subjectTokens.length === 0 ||
    predicateTokens.length === 0 ||
    firstSubject.normalized === 'there' ||
    SUBORDINATE_CLAUSE_STARTERS.has(firstToken.normalized) ||
    SUBORDINATE_CLAUSE_STARTERS.has(firstSubject.normalized)
  ) {
    return false
  }

  if (
    hasPosHint(firstToken, 'preposition') &&
    predicateTokens.length > 0 &&
    predicateTokens.every(
      (token) =>
        isLikelyPastParticiple(token) ||
        (hasPosHint(token, 'adjective') && !isLikelyFiniteVerb(token)),
    )
  ) {
    return false
  }

  if (
    !hasPosHint(firstSubject, 'pronoun') &&
    !hasPosHint(firstSubject, 'noun') &&
    !hasPosHint(firstSubject, 'determiner')
  ) {
    return false
  }

  return predicateTokens.some(
    (token) => isLikelyFiniteVerb(token) || hasPosHint(token, 'modal'),
  )
}

function isLikelyReportingAttribution(tokens: Token[]) {
  const subjectTokens = getClauseSubjectTokens(tokens)
  const predicateTokens = getClausePredicateTokens(tokens)
  const firstPredicate = predicateTokens[0]

  if (
    subjectTokens.length === 0 ||
    predicateTokens.length === 0 ||
    !firstPredicate ||
    !REPORTING_VERBS.has(firstPredicate.normalized)
  ) {
    return false
  }

  if (subjectTokens.length > 3) {
    return false
  }

  return (
    hasPosHint(subjectTokens[0], 'pronoun') || hasPosHint(subjectTokens[0], 'noun')
  )
}

export const missingCommaAfterIntroductoryPhraseRule = createPatternRule({
  id: 'MISSING_COMMA_AFTER_INTRODUCTORY_PHRASE',
  name: 'Missing Comma After Introductory Phrase',
  description:
    'Flags a curated set of introductory transitions when they are not followed by a comma.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'COMMAS',
    name: 'Commas',
  },
  examples: {
    good: [
      { text: 'However, we changed course.' },
      { text: 'For example, this sentence uses the comma correctly.' },
    ],
    bad: [
      { text: 'However we changed course.' },
      { text: 'For example this sentence needs a comma.' },
    ],
  },
  pattern: INTRODUCTORY_PATTERNS.map((pattern) =>
    literalPhraseToPattern(pattern.join(' ')),
  ),
  filter: (match) => {
    const firstToken = match.tokens[0]
    const lastToken = match.tokens.at(-1)

    return (
      Boolean(firstToken?.isSentenceStart && lastToken) &&
      tokensAreWhitespaceSeparated(match.tokens) &&
      /^\s+/u.test(lastToken?.trailingText ?? '') &&
      !/^\s*,/u.test(lastToken?.trailingText ?? '')
    )
  },
  message: (match) => `Add a comma after "${tokensToText(match.tokens)}".`,
  replacements: (match) => [`${tokensToText(match.tokens)},`],
})

export const commaSpliceRule: GrammerRule = {
  id: 'COMMA_SPLICE',
  name: 'Comma Splice',
  description:
    'Flags likely cases where two independent clauses are joined with only a comma.',
  shortMessage: 'Punctuation',
  issueType: 'grammar',
  category: {
    id: 'COMMAS',
    name: 'Commas',
  },
  examples: {
    good: [
      { text: 'I went home, and I cooked dinner.' },
      { text: 'I went home. I cooked dinner.' },
    ],
    bad: [
      { text: 'I went home, I cooked dinner.' },
      { text: 'The report was late, it missed the deadline.' },
    ],
  },
  check(context: RuleCheckContext) {
    const { text, sentenceTokens } = context
    const matches: Match[] = []

    for (const tokensInSentence of sentenceTokens) {
      const sentenceIndex = tokensInSentence[0]?.sentenceIndex

      if (sentenceIndex === undefined) {
        continue
      }

      const clausesInSentence = getSentenceClauseTokens(context, sentenceIndex)

      for (let index = 0; index < clausesInSentence.length - 1; index += 1) {
        const leftClause = clausesInSentence[index]
        const rightClause = clausesInSentence[index + 1]
        const leftToken = leftClause.at(-1)
        const rightToken = rightClause[0]

        if (
          !leftToken ||
          !rightToken ||
          !/^,\s+$/u.test(
            text.slice(leftToken.offset + leftToken.length, rightToken.offset),
          ) ||
          COORDINATING_CONJUNCTIONS.has(rightToken.normalized) ||
          isLikelyReportingAttribution(rightClause) ||
          !isLikelyIndependentClause(leftClause) ||
          !isLikelyIndependentClause(rightClause)
        ) {
          continue
        }

        matches.push(
          createMatch({
            text,
            offset: leftToken.offset + leftToken.length,
            length: 1,
            message: 'This comma may be joining two complete sentences.',
            replacements: ['.'],
            rule: commaSpliceRule,
          }),
        )
      }
    }

    return matches
  },
}

export const commasRules = [
  missingCommaAfterIntroductoryPhraseRule,
  commaSpliceRule,
]
