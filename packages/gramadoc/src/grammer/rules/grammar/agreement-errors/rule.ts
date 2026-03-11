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
  'one',
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
  'then',
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
    "don't": { singular: "doesn't", plural: "don't" },
    does: { singular: 'does', plural: 'do' },
    "doesn't": { singular: "doesn't", plural: "don't" },
    has: { singular: 'has', plural: 'have' },
    have: { singular: 'has', plural: 'have' },
    is: { singular: 'is', plural: 'are' },
    were: { singular: 'was', plural: 'were' },
    was: { singular: 'was', plural: 'were' },
  }
const OBJECT_OR_ADVERB_FOLLOWERS = new Set([
  'a',
  'an',
  'any',
  'each',
  'every',
  'her',
  'him',
  'it',
  'me',
  'my',
  'no',
  'one',
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
const COMPLEMENT_OR_PHRASE_FOLLOWER_HINTS = new Set([
  'adjective',
  'noun',
  'preposition',
  'pronoun',
])
const SINGULAR_IRREGULAR_NOUNS = new Set(['news', 'series', 'species'])
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

function isLikelyThirdPersonSingularVerb(token: Token, following?: Token) {
  if (
    !/^[a-z]+$/u.test(token.normalized) ||
    !token.normalized.endsWith('s') ||
    /ss$/u.test(token.normalized)
  ) {
    return false
  }

  if (!following) {
    return token.isSentenceEnd && hasPosHint(token, 'verb')
  }

  return (
    OBJECT_OR_ADVERB_FOLLOWERS.has(following.normalized) ||
    /ly$/u.test(following.normalized) ||
    (hasPosHint(token, 'verb') &&
      following.posHints.some((hint) =>
        COMPLEMENT_OR_PHRASE_FOLLOWER_HINTS.has(hint),
      ))
  )
}

function isLikelyBareLexicalVerb(token: Token) {
  return (
    /^[a-z]+$/u.test(token.normalized) &&
    !token.normalized.endsWith('s') &&
    !/(?:ed|ing)$/u.test(token.normalized) &&
    token.lemma === token.normalized
  )
}

function hasBareVerbFollowerSignal(following?: Token) {
  if (!following) {
    return false
  }

  return (
    OBJECT_OR_ADVERB_FOLLOWERS.has(following.normalized) ||
    /ly$/u.test(following.normalized) ||
    following.posHints.some((hint) =>
      COMPLEMENT_OR_PHRASE_FOLLOWER_HINTS.has(hint),
    )
  )
}

function hasCrediblePredicateSignal(token: Token) {
  return (
    token.clausePart === 'predicate' &&
    (hasPosHint(token, 'verb') ||
      hasPosHint(token, 'auxiliary') ||
      hasPosHint(token, 'modal'))
  )
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

function toThirdPersonSingularVerb(value: string) {
  if (value.endsWith('y') && value.length > 1 && !/[aeiou]y$/u.test(value)) {
    return `${value.slice(0, -1)}ies`
  }

  if (/(?:ch|sh|s|x|z|o)$/u.test(value)) {
    return `${value}es`
  }

  return `${value}s`
}

function getResolvedSubjectNumber(token: Token) {
  return token.isPluralLike && !SINGULAR_IRREGULAR_NOUNS.has(token.normalized)
    ? ('plural' as const)
    : isPluralNoun(token.normalized)
      ? ('plural' as const)
      : ('singular' as const)
}

function isNominalSubjectToken(token: Token) {
  return hasPosHint(token, 'pronoun') || hasPosHint(token, 'noun')
}

function isLikelySingularProperName(tokens: Token[]) {
  const nominalTokens = tokens.filter(isNominalSubjectToken)

  if (nominalTokens.length < 2) {
    return false
  }

  return (
    nominalTokens.every((token) => token.isCapitalized) &&
    !tokens.some(
      (token) =>
        hasPosHint(token, 'determiner') ||
        token.normalized === 'and' ||
        hasPosHint(token, 'preposition'),
    )
  )
}

function isLikelySingularTitledWork(tokens: Token[]) {
  const nominalTokens = tokens.filter(isNominalSubjectToken)

  if (
    nominalTokens.length < 2 ||
    !tokens.some((token) => token.normalized === 'of')
  ) {
    return false
  }

  return (
    !tokens.some((token) => token.normalized === 'and') &&
    nominalTokens.every((token) => token.isCapitalized) &&
    tokens.every(
      (token) =>
        token.isCapitalized ||
        hasPosHint(token, 'determiner') ||
        hasPosHint(token, 'preposition'),
    )
  )
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

  if (isLikelySingularTitledWork(clauseSubjectTokens)) {
    const nominalToken = clauseSubjectTokens.find(isNominalSubjectToken)

    return {
      token: nominalToken ?? first,
      number: 'singular' as const,
    }
  }

  const prepositionIndex = clauseSubjectTokens.findIndex((token) =>
    PREPOSITION_BREAKS.has(token.normalized),
  )
  const subjectSlice =
    prepositionIndex >= 0
      ? clauseSubjectTokens.slice(0, prepositionIndex)
      : clauseSubjectTokens
  const nominalTokens = subjectSlice.filter(isNominalSubjectToken)
  const nounLikeToken = [...subjectSlice]
    .reverse()
    .find(isNominalSubjectToken)

  if (!nounLikeToken) {
    return null
  }

  const hasCoordinator = hasCoordinatedLocalSubject(subjectSlice)

  if (hasCoordinator) {
    return { token: nounLikeToken, number: 'plural' as const }
  }

  if (isLikelySingularProperName(subjectSlice)) {
    return { token: nominalTokens[0] ?? nounLikeToken, number: 'singular' as const }
  }

  if (isLikelySingularTitledWork(subjectSlice)) {
    return { token: nominalTokens[0] ?? nounLikeToken, number: 'singular' as const }
  }

  return {
    token: nounLikeToken,
    number: getResolvedSubjectNumber(nounLikeToken),
  }
}

function getLocalSubjectTokens(tokensInClause: Token[], verb: Token) {
  const verbIndex = tokensInClause.findIndex((token) => token.index === verb.index)

  if (verbIndex <= 0) {
    return []
  }

  const precedingTokens = tokensInClause.slice(0, verbIndex)
  let subjectStartIndex = precedingTokens.length - 1

  while (subjectStartIndex >= 0) {
    const token = precedingTokens[subjectStartIndex]
    const previous = precedingTokens[subjectStartIndex - 1]

    if (PREPOSITION_BREAKS.has(token.normalized)) {
      if (token.normalized === 'of') {
        const headCandidate = precedingTokens[subjectStartIndex - 1]

        if (
          headCandidate &&
          (hasPosHint(headCandidate, 'noun') ||
            hasPosHint(headCandidate, 'pronoun') ||
            SINGULAR_SUBJECTS.has(headCandidate.normalized) ||
            PLURAL_SUBJECTS.has(headCandidate.normalized))
        ) {
          subjectStartIndex -= 1
          continue
        }
      }

      break
    }

    if (token.normalized === 'and') {
      const previous = precedingTokens[subjectStartIndex - 1]

      if (
        previous &&
        (hasPosHint(previous, 'noun') ||
          hasPosHint(previous, 'determiner'))
      ) {
        subjectStartIndex -= 1
        continue
      }

      break
    }

    if (
      hasPosHint(token, 'noun') ||
      hasPosHint(token, 'pronoun') ||
      hasPosHint(token, 'determiner') ||
      (subjectStartIndex === precedingTokens.length - 1 &&
        previous &&
        hasPosHint(previous, 'determiner') &&
        hasPosHint(token, 'verb')) ||
      SINGULAR_SUBJECTS.has(token.normalized) ||
      PLURAL_SUBJECTS.has(token.normalized)
    ) {
      subjectStartIndex -= 1
      continue
    }

    break
  }

  return precedingTokens.slice(subjectStartIndex + 1)
}

function hasCoordinatedLocalSubject(tokens: Token[]) {
  const coordinatorIndex = tokens.findIndex((token) => token.normalized === 'and')

  if (coordinatorIndex <= 0 || coordinatorIndex >= tokens.length - 1) {
    return false
  }

  const left = tokens
    .slice(0, coordinatorIndex)
    .some(
      (token) =>
        hasPosHint(token, 'noun') ||
        hasPosHint(token, 'pronoun') ||
        PLURAL_SUBJECTS.has(token.normalized) ||
        SINGULAR_SUBJECTS.has(token.normalized),
    )
  const right = tokens
    .slice(coordinatorIndex + 1)
    .some(
      (token) =>
        hasPosHint(token, 'noun') ||
        hasPosHint(token, 'pronoun') ||
        PLURAL_SUBJECTS.has(token.normalized) ||
        SINGULAR_SUBJECTS.has(token.normalized),
    )

  return left && right
}

function getLocalSubjectInfo(tokensInClause: Token[], verb: Token) {
  const localSubjectTokens = getLocalSubjectTokens(tokensInClause, verb)

  if (localSubjectTokens.length === 0) {
    return null
  }

  const first = localSubjectTokens[0]

  if (NON_SUBJECT_LEADS.has(first.normalized)) {
    return null
  }

  const prepositionIndex = localSubjectTokens.findIndex((token) =>
    PREPOSITION_BREAKS.has(token.normalized),
  )
  const headSlice =
    prepositionIndex >= 0
      ? localSubjectTokens.slice(0, prepositionIndex)
      : localSubjectTokens
  const explicitSubject = [...headSlice].reverse().find(
    (token, reverseIndex) => {
      const actualIndex = headSlice.length - 1 - reverseIndex
      const previous = headSlice[actualIndex - 1]

      return (
        (
      SINGULAR_SUBJECTS.has(token.normalized) ||
      PLURAL_SUBJECTS.has(token.normalized) ||
      hasPosHint(token, 'pronoun') ||
          hasPosHint(token, 'noun')
        ) ||
        (actualIndex === headSlice.length - 1 &&
          previous &&
          hasPosHint(previous, 'determiner') &&
          hasPosHint(token, 'verb'))
      )
    },
  )

  const head = explicitSubject ?? headSlice.at(-1)

  if (!head || (!explicitSubject && !SINGULAR_SUBJECTS.has(head.normalized))) {
    return null
  }

  const determiner = headSlice.find((token) =>
    hasPosHint(token, 'determiner'),
  )
  const hasCoordinator = hasCoordinatedLocalSubject(headSlice)

  if (hasCoordinator) {
    return { token: head, number: 'plural' as const }
  }

  if (
    head.normalized === 'one' ||
    determiner?.normalized === 'each' ||
    determiner?.normalized === 'every'
  ) {
    return { token: head, number: 'singular' as const }
  }

  if (SINGULAR_SUBJECTS.has(head.normalized)) {
    return { token: head, number: 'singular' as const }
  }

  if (PLURAL_SUBJECTS.has(head.normalized)) {
    return { token: head, number: 'plural' as const }
  }

  return {
    token: head,
    number: getResolvedSubjectNumber(head),
  }
}

function hasStrongSingularLocalSubject(localSubjectTokens: Token[], subject: Token) {
  if (SINGULAR_SUBJECTS.has(subject.normalized)) {
    return true
  }

  const determiner = localSubjectTokens.find((token) =>
    hasPosHint(token, 'determiner'),
  )

  if (
    determiner?.normalized === 'a' ||
    determiner?.normalized === 'an' ||
    determiner?.normalized === 'each' ||
    determiner?.normalized === 'every' ||
    determiner?.normalized === 'one' ||
    determiner?.normalized === 'that' ||
    determiner?.normalized === 'this'
  ) {
    return true
  }

  return (
    localSubjectTokens.length > 1 &&
    (hasPosHint(subject, 'noun') || hasPosHint(subject, 'pronoun'))
  )
}

function isLikelySubjectHeadBeforeFiniteVerb(tokensInClause: Token[], token: Token) {
  const index = tokensInClause.findIndex(
    (candidate) => candidate.index === token.index,
  )

  if (index < 0) {
    return false
  }

  const next = tokensInClause[index + 1]
  const hasNearbyDeterminer = tokensInClause
    .slice(Math.max(0, index - 2), index)
    .some((candidate) => hasPosHint(candidate, 'determiner'))

  if (!next || !hasNearbyDeterminer) {
    return false
  }

  return (
    !!VERB_REPLACEMENTS[next.normalized] || hasCrediblePredicateSignal(next)
  )
}

function hasLeadingAuxiliaryOrModal(tokensInClause: Token[], verb: Token) {
  const verbIndex = tokensInClause.findIndex((token) => token.index === verb.index)

  if (verbIndex <= 0) {
    return false
  }

  return tokensInClause
    .slice(0, verbIndex)
    .some(
      (token) =>
        hasPosHint(token, 'auxiliary') || hasPosHint(token, 'modal'),
    )
}

function hasEarlierAuxiliaryOrModal(tokensInClause: Token[], verb: Token) {
  return tokensInClause.some(
    (token) =>
      token.offset < verb.offset &&
      (hasPosHint(token, 'auxiliary') || hasPosHint(token, 'modal')),
  )
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

      if (!forms && !following && !hasPosHint(verb, 'verb')) {
        continue
      }

      const clauseTokens = getTokenClauseTokens(context, verb)

      if (!forms && !hasCrediblePredicateSignal(verb)) {
        continue
      }

      if (forms && verb.clausePart !== 'predicate') {
        continue
      }

      if (shouldSkipExplicitSubject(verb, clauseTokens)) {
        continue
      }

      const subject = forms
        ? getSubjectInfo(clauseTokens) ??
          getInvertedQuestionSubjectInfo(clauseTokens, verb)
        : getLocalSubjectInfo(clauseTokens, verb) ??
          getSubjectInfo(clauseTokens) ??
          getInvertedQuestionSubjectInfo(clauseTokens, verb)

      if (!subject) {
        continue
      }

      if (forms) {
        if (
          (subject.token.normalized === 'i' &&
            ['am', 'do', "don't", 'have'].includes(verb.normalized)) ||
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
        (!following || /^\s+$/u.test(verb.trailingText) || verb.isSentenceEnd) &&
        isLikelyThirdPersonSingularVerb(verb, following)
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

      const localSubject = getLocalSubjectInfo(clauseTokens, verb)
      const localSubjectTokens = getLocalSubjectTokens(clauseTokens, verb)

      if (
        localSubject &&
        localSubject.number === 'singular' &&
        hasStrongSingularLocalSubject(localSubjectTokens, localSubject.token) &&
        following &&
        /^\s+$/u.test(verb.trailingText) &&
        !hasLeadingAuxiliaryOrModal(clauseTokens, verb) &&
        !hasEarlierAuxiliaryOrModal(clauseTokens, verb) &&
        !isLikelySubjectHeadBeforeFiniteVerb(clauseTokens, verb) &&
        hasCrediblePredicateSignal(verb) &&
        hasPosHint(verb, 'verb') &&
        !hasPosHint(verb, 'auxiliary') &&
        !hasPosHint(verb, 'modal') &&
        isLikelyBareLexicalVerb(verb) &&
        hasBareVerbFollowerSignal(following)
      ) {
        const expectedVerb = toThirdPersonSingularVerb(verb.normalized)

        if (expectedVerb !== verb.normalized) {
          matches.push(
            createMatch({
              text,
              offset: verb.offset,
              length: verb.length,
              message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${localSubject.token.value}".`,
              replacements: [preserveCase(verb.value, expectedVerb)],
              rule: subjectVerbAgreementRule,
            }),
          )
        }
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
