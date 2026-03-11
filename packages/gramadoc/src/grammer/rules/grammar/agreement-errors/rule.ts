import type { Match } from '../../../../types.js'
import { hasPosHint } from '../../../linguistics.js'
import {
  getClauseSubjectTokens,
  getTokenClauseTokens,
} from '../../../rule-helpers.js'
import type { GrammerRule, RuleCheckContext, Token } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const SINGULAR_SUBJECTS = new Set([
  'each',
  'everybody',
  'everyone',
  'he',
  'it',
  'she',
  'that',
  'this',
])
const PLURAL_SUBJECTS = new Set(['these', 'they', 'those', 'we', 'you'])
const NON_SUBJECT_LEADS = new Set([
  'and',
  'how',
  'please',
  'there',
  'to',
  'what',
  'when',
  'where',
  'who',
  'why',
])
const QUESTION_LEADS = new Set(['how', 'what', 'when', 'where', 'who', 'why'])
const INVERTED_AUXILIARIES = new Set([
  'are',
  'did',
  'do',
  'does',
  'has',
  'have',
  'is',
  'was',
  'were',
])
const PREPOSITION_BREAKS = new Set([
  'about',
  'for',
  'from',
  'in',
  'of',
  'on',
  'to',
  'with',
])
const VERB_REPLACEMENTS: Record<string, { singular: string; plural: string }> =
  {
    are: { singular: 'is', plural: 'are' },
    do: { singular: 'does', plural: 'do' },
    does: { singular: 'does', plural: 'do' },
    has: { singular: 'has', plural: 'have' },
    have: { singular: 'has', plural: 'have' },
    is: { singular: 'is', plural: 'are' },
    were: { singular: 'was', plural: 'were' },
    was: { singular: 'was', plural: 'were' },
  }
const OBJECT_OR_ADVERB_FOLLOWERS = new Set([
  'a',
  'an',
  'her',
  'him',
  'it',
  'me',
  'my',
  'our',
  'some',
  'that',
  'the',
  'them',
  'these',
  'this',
  'those',
  'us',
  'you',
  'your',
])
const SINGULAR_IRREGULAR_NOUNS = new Set(['news'])
const SINGULAR_INDEFINITE_SUBJECTS = new Set([
  'anybody',
  'anyone',
  'everybody',
  'everyone',
  'nobody',
  'noone',
  'somebody',
  'someone',
])
const PLURAL_CUES = new Set(['few', 'many', 'multiple', 'several', 'two'])
const SINGULAR_DETERMINERS = new Set(['a', 'an', 'one', 'this', 'that'])

function isPluralNoun(value: string) {
  return (
    value.endsWith('s') &&
    !/(ss|us|is)$/u.test(value) &&
    !SINGULAR_IRREGULAR_NOUNS.has(value)
  )
}

function isLikelyThirdPersonSingularVerb(value: string, following?: string) {
  if (!/^[a-z]+$/u.test(value) || !value.endsWith('s') || /ss$/u.test(value)) {
    return false
  }

  if (!following) {
    return false
  }

  return OBJECT_OR_ADVERB_FOLLOWERS.has(following) || /ly$/u.test(following)
}

function toPluralBaseVerb(value: string) {
  if (value.endsWith('ies') && value.length > 3) {
    return `${value.slice(0, -3)}y`
  }

  if (/(ches|shes|sses|xes|zes|oes)$/u.test(value)) {
    return value.slice(0, -2)
  }

  if (value.endsWith('s') && value.length > 1) {
    return value.slice(0, -1)
  }

  return value
}

function getSubjectInfo(tokensInClause: Token[]) {
  const clauseSubjectTokens = getClauseSubjectTokens(tokensInClause)

  if (clauseSubjectTokens.length === 0) {
    return null
  }

  const first = clauseSubjectTokens[0]

  if (NON_SUBJECT_LEADS.has(first.normalized)) {
    return null
  }

  if (SINGULAR_SUBJECTS.has(first.normalized)) {
    return { token: first, number: 'singular' as const }
  }

  if (PLURAL_SUBJECTS.has(first.normalized)) {
    return { token: first, number: 'plural' as const }
  }

  const hasCoordinator = clauseSubjectTokens.some(
    (token) => token.normalized === 'and',
  )
  const prepositionIndex = clauseSubjectTokens.findIndex((token) =>
    PREPOSITION_BREAKS.has(token.normalized),
  )
  const subjectSlice =
    prepositionIndex >= 0
      ? clauseSubjectTokens.slice(0, prepositionIndex)
      : clauseSubjectTokens
  const nounLikeToken = subjectSlice.find(
    (token) => hasPosHint(token, 'pronoun') || hasPosHint(token, 'noun'),
  )

  if (!nounLikeToken) {
    return null
  }

  if (hasCoordinator) {
    return { token: nounLikeToken, number: 'plural' as const }
  }

  return {
    token: nounLikeToken,
    number:
      nounLikeToken.isPluralLike || isPluralNoun(nounLikeToken.normalized)
        ? ('plural' as const)
        : ('singular' as const),
  }
}

function getInvertedQuestionSubjectInfo(tokensInClause: Token[], verb: Token) {
  const clauseStart = tokensInClause[0]

  if (
    !clauseStart ||
    !QUESTION_LEADS.has(clauseStart.normalized) ||
    !INVERTED_AUXILIARIES.has(verb.normalized)
  ) {
    return null
  }

  const verbIndex = tokensInClause.findIndex(
    (token) => token.index === verb.index,
  )

  if (verbIndex < 0) {
    return null
  }

  const subjectHead = tokensInClause[verbIndex + 1]
  const subjectTail = tokensInClause[verbIndex + 2]

  if (!subjectHead) {
    return null
  }

  if (
    subjectHead.normalized === 'no' &&
    subjectTail &&
    (subjectTail.normalized === 'one' || subjectTail.normalized === 'body')
  ) {
    return {
      token: {
        ...subjectTail,
        value:
          `${subjectHead.value}${subjectHead.trailingText}${subjectTail.value}`.trim(),
      },
      number: 'singular' as const,
    }
  }

  if (SINGULAR_INDEFINITE_SUBJECTS.has(subjectHead.normalized)) {
    return { token: subjectHead, number: 'singular' as const }
  }

  return null
}

function shouldSkipExplicitSubject(verb: Token, clauseTokens: Token[]) {
  return clauseTokens.some(
    (token) =>
      token.offset < verb.offset &&
      token.clausePart === 'predicate' &&
      /[,:;]\s*$/u.test(token.leadingText),
  )
}

export const subjectVerbAgreementRule: GrammerRule = {
  id: 'SUBJECT_VERB_AGREEMENT',
  name: 'Subject-Verb Agreement',
  description:
    'Flags agreement mismatches using the likely subject head from the local clause instead of only adjacent tokens.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'AGREEMENT_ERRORS',
    name: 'Agreement Errors',
  },
  examples: {
    good: [
      { text: 'The list of items is ready.' },
      { text: 'The results from the test are ready.' },
    ],
    bad: [
      { text: 'The list of items are ready.' },
      { text: 'The results from the test is ready.' },
    ],
  },
  check(context: RuleCheckContext) {
    const { text, tokens } = context
    const matches: Match[] = []

    for (let index = 0; index < tokens.length; index += 1) {
      const verb = tokens[index]
      const forms = VERB_REPLACEMENTS[verb.normalized]
      const following = tokens[index + 1]

      if (!forms && !following) {
        continue
      }

      const clauseTokens = getTokenClauseTokens(context, verb)

      if (shouldSkipExplicitSubject(verb, clauseTokens)) {
        continue
      }

      const subject =
        getSubjectInfo(clauseTokens) ??
        getInvertedQuestionSubjectInfo(clauseTokens, verb)

      if (!subject) {
        continue
      }

      if (forms) {
        if (
          (subject.token.normalized === 'i' &&
            ['am', 'do', 'have'].includes(verb.normalized)) ||
          (subject.token.normalized === 'you' &&
            ['are', 'do', 'have'].includes(verb.normalized))
        ) {
          continue
        }

        const expectedVerb = forms[subject.number]

        if (verb.normalized === expectedVerb) {
          continue
        }

        matches.push(
          createMatch({
            text,
            offset: verb.offset,
            length: verb.length,
            message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${subject.token.value}".`,
            replacements: [preserveCase(verb.value, expectedVerb)],
            rule: subjectVerbAgreementRule,
          }),
        )

        continue
      }

      if (
        subject.number === 'plural' &&
        following &&
        /^\s+$/u.test(verb.trailingText) &&
        isLikelyThirdPersonSingularVerb(verb.normalized, following.normalized)
      ) {
        const expectedVerb = toPluralBaseVerb(verb.normalized)

        if (expectedVerb === verb.normalized) {
          continue
        }

        matches.push(
          createMatch({
            text,
            offset: verb.offset,
            length: verb.length,
            message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${subject.token.value}".`,
            replacements: [preserveCase(verb.value, expectedVerb)],
            rule: subjectVerbAgreementRule,
          }),
        )
      }
    }

    return matches
  },
}

export const thereIsAreAgreementRule: GrammerRule = {
  id: 'THERE_IS_ARE_AGREEMENT',
  name: 'There Is/Are Agreement',
  description:
    'Flags there-is/there-are agreement mistakes based on the following noun phrase.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'AGREEMENT_ERRORS',
    name: 'Agreement Errors',
  },
  examples: {
    good: [
      { text: 'There are many reasons to wait.' },
      { text: 'There is a problem in the report.' },
    ],
    bad: [
      { text: 'There is many reasons to wait.' },
      { text: 'There are a problem in the report.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 2; index += 1) {
      const thereToken = tokens[index]
      const verbToken = tokens[index + 1]
      const nounToken = tokens[index + 2]

      if (
        thereToken.normalized !== 'there' ||
        !['is', 'are'].includes(verbToken.normalized) ||
        !/^\s+$/u.test(thereToken.trailingText) ||
        !/^\s+$/u.test(verbToken.trailingText)
      ) {
        continue
      }

      let expectedVerb = 'is'

      if (
        PLURAL_CUES.has(nounToken.normalized) ||
        nounToken.isPluralLike ||
        isPluralNoun(nounToken.normalized)
      ) {
        expectedVerb = 'are'
      }

      if (
        SINGULAR_DETERMINERS.has(nounToken.normalized) &&
        tokens[index + 3] &&
        /^\s+$/u.test(nounToken.trailingText)
      ) {
        expectedVerb = 'is'
      }

      if (verbToken.normalized === expectedVerb) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: verbToken.offset,
          length: verbToken.length,
          message: `Use "${expectedVerb}" in this "there ${verbToken.normalized}" construction.`,
          replacements: [expectedVerb],
          rule: thereIsAreAgreementRule,
        }),
      )
    }

    return matches
  },
}

export const agreementErrorsRules = [
  subjectVerbAgreementRule,
  thereIsAreAgreementRule,
]
