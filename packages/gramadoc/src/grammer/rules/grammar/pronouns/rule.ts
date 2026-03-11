import type { Match } from '../../../../types.js'
import { hasPosHint } from '../../../linguistics.js'
import { analyzeQuotationMarks } from '../../../quotation.js'
import type { GrammerRule, Token } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const PREPOSITIONS = new Set([
  'about',
  'against',
  'between',
  'for',
  'from',
  'like',
  'near',
  'to',
  'with',
  'without',
])
const SUBJECT_TO_OBJECT: Record<string, string> = {
  he: 'him',
  i: 'me',
  she: 'her',
  they: 'them',
  we: 'us',
}
const OBJECT_TO_SUBJECT: Record<string, string> = {
  her: 'she',
  him: 'he',
  me: 'I',
  them: 'they',
  us: 'we',
}
const REFLEXIVE_TO_SUBJECT: Record<string, string> = {
  herself: 'she',
  himself: 'he',
  myself: 'I',
  ourselves: 'we',
  themselves: 'they',
  yourself: 'you',
}
const NONSTANDARD_REFLEXIVE_REPLACEMENTS: Record<string, string> = {
  ourself: 'ourselves',
  themself: 'themselves',
}
const SINGULAR_THEY_ANTECEDENT_WORDS = new Set([
  'anybody',
  'anyone',
  'everybody',
  'everyone',
  'nobody',
  'one',
  'somebody',
  'someone',
])
const SUBJECT_FOLLOWING_VERBS = new Set([
  'am',
  'are',
  'came',
  'did',
  'do',
  'does',
  'go',
  'goes',
  'have',
  'has',
  'need',
  'needs',
  'ran',
  'run',
  'runs',
  'spoke',
  'talked',
  'want',
  'wants',
  'was',
  'went',
  'were',
  'wrote',
])

function isWhitespaceBridge(left: Token, right: Token) {
  return /^\s+$/u.test(left.trailingText) && /^\s*$/u.test(right.leadingText)
}

function isLikelyClauseVerb(token: Token | undefined) {
  if (!token) {
    return false
  }

  return (
    SUBJECT_FOLLOWING_VERBS.has(token.normalized) || hasPosHint(token, 'verb')
  )
}

function createPronounMatch(options: {
  text: string
  token: Token
  replacement: string
  message: string
  rule: GrammerRule
}) {
  const { text, token, replacement, message, rule } = options

  return createMatch({
    text,
    offset: token.offset,
    length: token.length,
    message,
    replacements: [replacement],
    rule,
  })
}

function isOffsetInsideQuotedText(text: string, offset: number) {
  const { pairs } = analyzeQuotationMarks(text)

  return pairs.some((pair) => offset > pair.open && offset < pair.close)
}

function isTokenInsideBlockquote(
  token: Token,
  blockRanges?: Parameters<GrammerRule['check']>[0]['blockRanges'],
) {
  if (token.blockIndex == null || !blockRanges) {
    return false
  }

  return blockRanges[token.blockIndex]?.kind === 'blockquote'
}

function hasSingularTheyAntecedent(
  tokens: Token[],
  index: number,
  sentenceIndex: number,
) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor]

    if (!token || token.sentenceIndex !== sentenceIndex) {
      break
    }

    if (SINGULAR_THEY_ANTECEDENT_WORDS.has(token.normalized)) {
      return true
    }
  }

  return false
}

export const objectPronounAfterPrepositionRule: GrammerRule = {
  id: 'OBJECT_PRONOUN_AFTER_PREPOSITION',
  name: 'Object Pronoun After Preposition',
  description:
    'Flags subject pronouns used after a preposition, including coordinated objects such as "between you and I".',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'PRONOUNS',
    name: 'Pronouns',
  },
  examples: {
    good: [
      { text: 'The notes are for her.' },
      { text: 'The decision is between you and me.' },
    ],
    bad: [
      { text: 'The notes are for she.' },
      { text: 'The decision is between you and I.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length; index += 1) {
      const preposition = tokens[index]

      if (!PREPOSITIONS.has(preposition.normalized)) {
        continue
      }

      const firstObject = tokens[index + 1]

      if (
        firstObject &&
        SUBJECT_TO_OBJECT[firstObject.normalized] &&
        isWhitespaceBridge(preposition, firstObject)
      ) {
        const replacement = preserveCase(
          firstObject.value === 'I' ? 'i' : firstObject.value,
          SUBJECT_TO_OBJECT[firstObject.normalized],
        )
        matches.push(
          createPronounMatch({
            text,
            token: firstObject,
            replacement,
            message: `Use "${replacement}" after the preposition "${preposition.value}".`,
            rule: objectPronounAfterPrepositionRule,
          }),
        )
      }

      const coordinator = tokens[index + 2]
      const trailingPronoun = tokens[index + 3]

      if (
        firstObject &&
        coordinator?.normalized === 'and' &&
        trailingPronoun &&
        SUBJECT_TO_OBJECT[trailingPronoun.normalized] &&
        isWhitespaceBridge(preposition, firstObject) &&
        isWhitespaceBridge(firstObject, coordinator) &&
        isWhitespaceBridge(coordinator, trailingPronoun)
      ) {
        const replacement = preserveCase(
          trailingPronoun.value === 'I' ? 'i' : trailingPronoun.value,
          SUBJECT_TO_OBJECT[trailingPronoun.normalized],
        )
        matches.push(
          createPronounMatch({
            text,
            token: trailingPronoun,
            replacement,
            message: `Use "${replacement}" after the preposition "${preposition.value}".`,
            rule: objectPronounAfterPrepositionRule,
          }),
        )
      }
    }

    return matches
  },
}

export const subjectPronounAtSentenceStartRule: GrammerRule = {
  id: 'SUBJECT_PRONOUN_AT_SENTENCE_START',
  name: 'Subject Pronoun At Sentence Start',
  description:
    'Flags object pronouns used as the subject at the start of a sentence or compound subject.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'PRONOUNS',
    name: 'Pronouns',
  },
  examples: {
    good: [
      { text: 'I went home early.' },
      { text: 'Sarah and I went home early.' },
    ],
    bad: [
      { text: 'Me went home early.' },
      { text: 'Sarah and me went home early.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]
      const replacement = OBJECT_TO_SUBJECT[token.normalized]

      if (!replacement) {
        continue
      }

      const next = tokens[index + 1]

      if (
        token.isSentenceStart &&
        isLikelyClauseVerb(next) &&
        isWhitespaceBridge(token, next)
      ) {
        matches.push(
          createPronounMatch({
            text,
            token,
            replacement,
            message: `Use "${replacement}" as the subject here.`,
            rule: subjectPronounAtSentenceStartRule,
          }),
        )
      }

      const andToken = tokens[index - 1]
      const verb = tokens[index + 1]

      if (
        andToken?.normalized === 'and' &&
        verb &&
        isLikelyClauseVerb(verb) &&
        isWhitespaceBridge(andToken, token) &&
        isWhitespaceBridge(token, verb)
      ) {
        matches.push(
          createPronounMatch({
            text,
            token,
            replacement,
            message: `Use "${replacement}" in this compound subject.`,
            rule: subjectPronounAtSentenceStartRule,
          }),
        )
      }
    }

    return matches
  },
}

export const reflexivePronounAsSubjectRule: GrammerRule = {
  id: 'REFLEXIVE_PRONOUN_AS_SUBJECT',
  name: 'Reflexive Pronoun As Subject',
  description:
    'Flags reflexive pronouns used as sentence subjects or as part of a compound subject.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'PRONOUNS',
    name: 'Pronouns',
  },
  examples: {
    good: [
      { text: 'I went home early.' },
      { text: 'Sarah and I went home early.' },
    ],
    bad: [
      { text: 'Myself went home early.' },
      { text: 'Sarah and myself went home early.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]
      const replacement = REFLEXIVE_TO_SUBJECT[token.normalized]

      if (!replacement) {
        continue
      }

      const next = tokens[index + 1]

      if (
        token.isSentenceStart &&
        isLikelyClauseVerb(next) &&
        isWhitespaceBridge(token, next)
      ) {
        matches.push(
          createPronounMatch({
            text,
            token,
            replacement,
            message: `Use "${replacement}" instead of "${token.value}" as the subject here.`,
            rule: reflexivePronounAsSubjectRule,
          }),
        )
      }

      const andToken = tokens[index - 1]
      const verb = tokens[index + 1]

      if (
        andToken?.normalized === 'and' &&
        verb &&
        isLikelyClauseVerb(verb) &&
        isWhitespaceBridge(andToken, token) &&
        isWhitespaceBridge(token, verb)
      ) {
        matches.push(
          createPronounMatch({
            text,
            token,
            replacement,
            message: `Use "${replacement}" instead of "${token.value}" in this compound subject.`,
            rule: reflexivePronounAsSubjectRule,
          }),
        )
      }
    }

    return matches
  },
}

export const nonstandardReflexivePronounRule: GrammerRule = {
  id: 'NONSTANDARD_REFLEXIVE_PRONOUN',
  name: 'Nonstandard Reflexive Pronoun',
  description:
    'Flags a small set of nonstandard reflexive pronouns such as "themself" and "ourself" in ordinary prose.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'PRONOUNS',
    name: 'Pronouns',
  },
  examples: {
    good: [
      { text: 'Someone may describe themself that way.' },
      { text: 'We should keep ourselves aligned.' },
    ],
    bad: [
      { text: 'They wrote the update themself.' },
      { text: 'We should keep ourself aligned.' },
    ],
  },
  check({ text, tokens, blockRanges }) {
    return tokens.flatMap((token) => {
      const replacement = NONSTANDARD_REFLEXIVE_REPLACEMENTS[token.normalized]

      if (
        !replacement ||
        isOffsetInsideQuotedText(text, token.offset) ||
        isTokenInsideBlockquote(token, blockRanges) ||
        (token.normalized === 'themself' &&
          hasSingularTheyAntecedent(tokens, token.index, token.sentenceIndex))
      ) {
        return []
      }

      return [
        createPronounMatch({
          text,
          token,
          replacement: preserveCase(token.value, replacement),
          message: `Use "${preserveCase(token.value, replacement)}" in standard written English here.`,
          rule: nonstandardReflexivePronounRule,
        }),
      ]
    })
  },
}

export const pronounsRules = [
  objectPronounAfterPrepositionRule,
  subjectPronounAtSentenceStartRule,
  reflexivePronounAsSubjectRule,
  nonstandardReflexivePronounRule,
]
