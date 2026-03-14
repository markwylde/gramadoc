import type { Match } from '../../../../types.js'
import { hasPosHint } from '../../../linguistics.js'
import {
  toPluralBaseVerb,
  toThirdPersonSingularVerb,
} from '../../../morphology.js'
import {
  getClauseSubjectTokens,
  getSentenceTokens,
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
  'across',
  'after',
  'about',
  'around',
  'before',
  'beneath',
  'between',
  'by',
  'during',
  'for',
  'from',
  'in',
  'into',
  'like',
  'near',
  'of',
  'on',
  'over',
  'through',
  'to',
  'under',
  'with',
  'within',
  'without',
])
const SUBJECT_HEAD_PREPOSITIONS = new Set([
  'about',
  'across',
  'around',
  'between',
  'by',
  'for',
  'from',
  'in',
  'like',
  'near',
  'of',
  'on',
  'over',
  'under',
  'with',
  'within',
  'without',
])
const RELATIVE_CLAUSE_BREAKS = new Set(['that', 'which', 'who'])
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
  'more',
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
const CARDINAL_FOLLOWERS = new Set([
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
])
const CLAUSAL_FOLLOWERS = new Set([
  'as',
  'how',
  'that',
  'when',
  'where',
  'whether',
  'why',
])
const COMPLEMENT_OR_PHRASE_FOLLOWER_HINTS = new Set([
  'adjective',
  'noun',
  'preposition',
  'pronoun',
])
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
const SINGULAR_INVARIANT_NOUNS = new Set(['news', 'series', 'species'])
const SUBJECT_SCAN_ADVERBS = new Set(['often'])
const AGREEMENT_CONFIDENCE_RANK = {
  low: 0,
  medium: 1,
  high: 2,
} as const

type SubjectInfo = {
  token: Token
  number: 'singular' | 'plural'
}

type ResolvedSubject = {
  info: SubjectInfo
  tokens: Token[]
  source: 'clause' | 'inverted-question' | 'local' | 'sentence-fallback'
}

function getCapitalizedNameParts(tokens: Token[]) {
  return tokens.filter(
    (token) =>
      token.isCapitalized &&
      token.normalized !== 'and' &&
      !hasPosHint(token, 'determiner') &&
      !hasPosHint(token, 'preposition'),
  )
}

function isSubjectBoundaryPreposition(token: Token) {
  return (
    PREPOSITION_BREAKS.has(token.normalized) ||
    RELATIVE_CLAUSE_BREAKS.has(token.normalized) ||
    hasPosHint(token, 'preposition')
  )
}

function trimLeadingNonSubjectTokens(tokens: Token[]) {
  let startIndex = 0

  while (startIndex < tokens.length) {
    const current = tokens[startIndex]
    const next = tokens[startIndex + 1]

    if (NON_SUBJECT_LEADS.has(current.normalized)) {
      startIndex += 1
      continue
    }

    if (
      RELATIVE_CLAUSE_BREAKS.has(current.normalized) &&
      (next === undefined ||
        hasPosHint(next, 'determiner') ||
        isNominalSubjectToken(next))
    ) {
      startIndex += 1
      continue
    }

    break
  }

  return tokens.slice(startIndex)
}

function isLikelyThirdPersonSingularVerb(token: Token, following?: Token) {
  if (
    !token.morphology.verb.canBeThirdPersonSingular ||
    !/^[a-z]+$/u.test(token.normalized)
  ) {
    return false
  }

  if (!following) {
    return token.isSentenceEnd && hasPosHint(token, 'verb')
  }

  return (
    CLAUSAL_FOLLOWERS.has(following.normalized) ||
    OBJECT_OR_ADVERB_FOLLOWERS.has(following.normalized) ||
    hasPosHint(following, 'adverb') ||
    /ly$/u.test(following.normalized) ||
    hasPosHint(following, 'verb') ||
    (hasPosHint(token, 'verb') &&
      following.posHints.some((hint) =>
        COMPLEMENT_OR_PHRASE_FOLLOWER_HINTS.has(hint),
      ))
  )
}

function isLikelyBareLexicalVerb(token: Token) {
  return (
    /^[a-z]+$/u.test(token.normalized) &&
    token.morphology.verb.canBeBase &&
    !token.morphology.verb.canBeThirdPersonSingular &&
    !token.morphology.verb.canBePast &&
    !token.morphology.verb.canBePastParticiple &&
    !token.morphology.verb.canBePresentParticiple
  )
}

function hasBareVerbFollowerSignal(following?: Token) {
  if (!following) {
    return false
  }

  return (
    CLAUSAL_FOLLOWERS.has(following.normalized) ||
    OBJECT_OR_ADVERB_FOLLOWERS.has(following.normalized) ||
    CARDINAL_FOLLOWERS.has(following.normalized) ||
    hasPosHint(following, 'adverb') ||
    /ly$/u.test(following.normalized) ||
    hasPosHint(following, 'verb') ||
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

function hasFinitePastFollowerSignal(following?: Token) {
  if (!following) {
    return true
  }

  return (
    CLAUSAL_FOLLOWERS.has(following.normalized) ||
    OBJECT_OR_ADVERB_FOLLOWERS.has(following.normalized) ||
    hasPosHint(following, 'adverb') ||
    hasPosHint(following, 'determiner') ||
    hasPosHint(following, 'pronoun')
  )
}

function isLikelyFinitePastVerb(token: Token, following?: Token) {
  return (
    /^[a-z]+$/u.test(token.normalized) &&
    token.morphology.verb.canBePast &&
    !token.morphology.verb.canBeThirdPersonSingular &&
    !token.morphology.verb.canBePresentParticiple &&
    hasFinitePastFollowerSignal(following)
  )
}

function hasRecoverablePredicateSignal(
  token: Token,
  following?: Token,
  previous?: Token,
) {
  if (
    hasPosHint(token, 'noun') &&
    following &&
    (hasPosHint(following, 'auxiliary') || hasPosHint(following, 'verb')) &&
    (token.isSentenceStart ||
      (previous &&
        (hasPosHint(previous, 'determiner') ||
          hasPosHint(previous, 'adjective'))))
  ) {
    return false
  }

  if (
    hasPosHint(token, 'noun') &&
    previous &&
    (hasPosHint(previous, 'determiner') || hasPosHint(previous, 'adjective')) &&
    token.isSentenceEnd
  ) {
    return false
  }

  return (
    hasCrediblePredicateSignal(token) ||
    isLikelyThirdPersonSingularVerb(token, following) ||
    (isLikelyBareLexicalVerb(token) && hasBareVerbFollowerSignal(following)) ||
    isLikelyFinitePastVerb(token, following)
  )
}

function getResolvedSubjectNumber(token: Token) {
  if (SINGULAR_INVARIANT_NOUNS.has(token.normalized)) {
    return 'singular' as const
  }

  return token.isPluralLike ? ('plural' as const) : ('singular' as const)
}

function getSubjectHeadSlice(tokens: Token[]) {
  const breakIndex = tokens.findIndex(isSubjectBoundaryPreposition)

  return breakIndex >= 0 ? tokens.slice(0, breakIndex) : tokens
}

function getQuantifiedOfSubjectInfo(tokens: Token[]) {
  const lead = tokens[0]
  const ofIndex = tokens.findIndex((token) => token.normalized === 'of')

  if (!lead || ofIndex <= 0 || ofIndex >= tokens.length - 1) {
    return null
  }

  if (lead.normalized === 'one') {
    return { token: lead, number: 'singular' as const }
  }

  if (!PLURAL_CUES.has(lead.normalized)) {
    return null
  }

  const quantifiedHead = tokens.slice(ofIndex + 1).find(isNominalSubjectToken)

  return {
    token: quantifiedHead ?? lead,
    number: 'plural' as const,
  }
}

function isNominalSubjectToken(token: Token) {
  return (
    hasPosHint(token, 'pronoun') ||
    SINGULAR_INVARIANT_NOUNS.has(token.normalized) ||
    (hasPosHint(token, 'noun') &&
      (!token.usedFallbackPosGuess || token.posHintConfidence !== 'low'))
  )
}

function isDeterminerAnchoredNominal(token?: Token, previous?: Token) {
  return (
    !!token &&
    !!previous &&
    hasPosHint(previous, 'determiner') &&
    hasPosHint(token, 'noun')
  )
}

function isLikelySingularProperName(tokens: Token[]) {
  const nameParts = getCapitalizedNameParts(tokens)

  if (nameParts.length < 2) {
    return false
  }

  return !tokens.some(
    (token) =>
      hasPosHint(token, 'determiner') ||
      token.normalized === 'and' ||
      hasPosHint(token, 'preposition'),
  )
}

function isLikelySingularTitledWork(tokens: Token[]) {
  const nameParts = getCapitalizedNameParts(tokens)

  if (
    nameParts.length < 2 ||
    !tokens.some((token) => token.normalized === 'of')
  ) {
    return false
  }

  return (
    !tokens.some((token) => token.normalized === 'and') &&
    tokens.every(
      (token) =>
        token.isCapitalized ||
        hasPosHint(token, 'determiner') ||
        hasPosHint(token, 'preposition'),
    )
  )
}

function hasClausalSubjectBeforeVerb(tokensInClause: Token[], verb: Token) {
  const clauseStart = tokensInClause[0]

  if (
    !clauseStart ||
    (!QUESTION_LEADS.has(clauseStart.normalized) &&
      clauseStart.normalized !== 'to')
  ) {
    return false
  }

  return tokensInClause.some(
    (token) =>
      token.offset < verb.offset &&
      token.index !== verb.index &&
      (hasPosHint(token, 'verb') || hasPosHint(token, 'auxiliary')),
  )
}

function getSubjectInfo(tokensInClause: Token[]) {
  const clauseSubjectTokens = trimLeadingNonSubjectTokens(
    getClauseSubjectTokens(tokensInClause),
  )

  if (clauseSubjectTokens.length === 0) {
    return null
  }

  const first = clauseSubjectTokens[0]

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

  const quantifiedOfSubject = getQuantifiedOfSubjectInfo(clauseSubjectTokens)

  if (quantifiedOfSubject) {
    return quantifiedOfSubject
  }

  const subjectSlice = getSubjectHeadSlice(clauseSubjectTokens)
  const nominalTokens = subjectSlice.filter(
    (token, index) =>
      isNominalSubjectToken(token) ||
      isDeterminerAnchoredNominal(token, subjectSlice[index - 1]),
  )
  const nounLikeToken = [...subjectSlice]
    .reverse()
    .find((token, reverseIndex) => {
      const actualIndex = subjectSlice.length - 1 - reverseIndex
      return (
        isNominalSubjectToken(token) ||
        isDeterminerAnchoredNominal(token, subjectSlice[actualIndex - 1])
      )
    })

  if (!nounLikeToken) {
    return null
  }

  const hasCoordinator = hasCoordinatedLocalSubject(subjectSlice)
  const coordinatedHead = [...subjectSlice]
    .reverse()
    .find((token, reverseIndex) => {
      const actualIndex = subjectSlice.length - 1 - reverseIndex

      return (
        token.normalized !== 'and' &&
        (isNominalSubjectToken(token) ||
          isDeterminerAnchoredNominal(token, subjectSlice[actualIndex - 1]) ||
          hasPosHint(token, 'noun') ||
          SINGULAR_SUBJECTS.has(token.normalized) ||
          PLURAL_SUBJECTS.has(token.normalized))
      )
    })

  if (hasCoordinator) {
    return {
      token: coordinatedHead ?? nounLikeToken,
      number: 'plural' as const,
    }
  }

  if (isLikelySingularProperName(subjectSlice)) {
    return {
      token: nominalTokens[0] ?? nounLikeToken,
      number: 'singular' as const,
    }
  }

  if (isLikelySingularTitledWork(subjectSlice)) {
    return {
      token: nominalTokens[0] ?? nounLikeToken,
      number: 'singular' as const,
    }
  }

  return {
    token: nounLikeToken,
    number: getResolvedSubjectNumber(nounLikeToken),
  }
}

function getLocalSubjectTokens(tokensInClause: Token[], verb: Token) {
  const verbIndex = tokensInClause.findIndex(
    (token) => token.index === verb.index,
  )

  if (verbIndex <= 0) {
    return []
  }

  const precedingTokens = tokensInClause.slice(0, verbIndex)
  let subjectStartIndex = precedingTokens.length - 1

  while (subjectStartIndex >= 0) {
    const token = precedingTokens[subjectStartIndex]
    const previous = precedingTokens[subjectStartIndex - 1]

    if (isSubjectBoundaryPreposition(token)) {
      if (SUBJECT_HEAD_PREPOSITIONS.has(token.normalized)) {
        const headCandidate = precedingTokens[subjectStartIndex - 1]

        if (
          headCandidate &&
          (isNominalSubjectToken(headCandidate) ||
            isDeterminerAnchoredNominal(
              headCandidate,
              precedingTokens[subjectStartIndex - 2],
            ) ||
            SINGULAR_SUBJECTS.has(headCandidate.normalized) ||
            PLURAL_SUBJECTS.has(headCandidate.normalized))
        ) {
          subjectStartIndex -= 1
          continue
        }
      }

      if (RELATIVE_CLAUSE_BREAKS.has(token.normalized)) {
        const antecedentCandidate = precedingTokens[subjectStartIndex - 1]

        if (
          antecedentCandidate &&
          ((!hasPosHint(antecedentCandidate, 'verb') &&
            (isNominalSubjectToken(antecedentCandidate) ||
              isDeterminerAnchoredNominal(
                antecedentCandidate,
                precedingTokens[subjectStartIndex - 2],
              ))) ||
            hasPosHint(antecedentCandidate, 'determiner'))
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
        (hasPosHint(previous, 'noun') || hasPosHint(previous, 'determiner'))
      ) {
        subjectStartIndex -= 1
        continue
      }

      break
    }

    if (
      isNominalSubjectToken(token) ||
      isDeterminerAnchoredNominal(token, previous) ||
      (token.isCapitalized &&
        (previous?.isCapitalized ||
          precedingTokens[subjectStartIndex + 1]?.isCapitalized) &&
        !hasPosHint(token, 'preposition')) ||
      (hasPosHint(token, 'noun') &&
        hasPosHint(previous ?? token, 'preposition')) ||
      hasPosHint(token, 'determiner') ||
      hasPosHint(token, 'adjective') ||
      hasPosHint(token, 'adverb') ||
      SUBJECT_SCAN_ADVERBS.has(token.normalized) ||
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
  const coordinatorIndex = tokens.findIndex(
    (token) => token.normalized === 'and',
  )

  if (coordinatorIndex <= 0 || coordinatorIndex >= tokens.length - 1) {
    return false
  }

  const left = tokens
    .slice(0, coordinatorIndex)
    .some(
      (token, index, slice) =>
        isNominalSubjectToken(token) ||
        isDeterminerAnchoredNominal(token, slice[index - 1]) ||
        hasPosHint(token, 'noun') ||
        PLURAL_SUBJECTS.has(token.normalized) ||
        SINGULAR_SUBJECTS.has(token.normalized),
    )
  const right = tokens
    .slice(coordinatorIndex + 1)
    .some(
      (token, index, slice) =>
        isNominalSubjectToken(token) ||
        isDeterminerAnchoredNominal(token, slice[index - 1]) ||
        hasPosHint(token, 'noun') ||
        PLURAL_SUBJECTS.has(token.normalized) ||
        SINGULAR_SUBJECTS.has(token.normalized),
    )

  return left && right
}

function getLocalSubjectInfo(tokensInClause: Token[], verb: Token) {
  const localSubjectTokens = trimLeadingNonSubjectTokens(
    getLocalSubjectTokens(tokensInClause, verb),
  )

  if (localSubjectTokens.length === 0) {
    return null
  }

  const quantifiedOfSubject = getQuantifiedOfSubjectInfo(localSubjectTokens)

  if (quantifiedOfSubject) {
    return quantifiedOfSubject
  }

  if (isLikelySingularProperName(localSubjectTokens)) {
    const nominalToken =
      localSubjectTokens.find(isNominalSubjectToken) ??
      localSubjectTokens.at(-1)

    if (nominalToken) {
      return { token: nominalToken, number: 'singular' as const }
    }
  }

  if (isLikelySingularTitledWork(localSubjectTokens)) {
    const nominalToken =
      localSubjectTokens.find(isNominalSubjectToken) ??
      localSubjectTokens.at(-1)

    if (nominalToken) {
      return { token: nominalToken, number: 'singular' as const }
    }
  }

  const headSlice = getSubjectHeadSlice(localSubjectTokens)
  const explicitSubject = [...headSlice]
    .reverse()
    .find((token, reverseIndex) => {
      const actualIndex = headSlice.length - 1 - reverseIndex
      const previous = headSlice[actualIndex - 1]

      return (
        SINGULAR_SUBJECTS.has(token.normalized) ||
        PLURAL_SUBJECTS.has(token.normalized) ||
        isNominalSubjectToken(token) ||
        isDeterminerAnchoredNominal(token, previous) ||
        (actualIndex === headSlice.length - 1 &&
          previous &&
          hasPosHint(previous, 'determiner') &&
          hasPosHint(token, 'verb'))
      )
    })

  const head = explicitSubject ?? headSlice.at(-1)
  const previousHead = headSlice.at(-2)

  if (
    !head ||
    (!explicitSubject &&
      !SINGULAR_SUBJECTS.has(head.normalized) &&
      !isDeterminerAnchoredNominal(head, previousHead) &&
      !isLikelySingularProperName(headSlice) &&
      !isLikelySingularTitledWork(headSlice))
  ) {
    return null
  }

  const determiner = headSlice.find((token) => hasPosHint(token, 'determiner'))
  const hasCoordinator = hasCoordinatedLocalSubject(headSlice)
  const coordinatedHead = [...headSlice]
    .reverse()
    .find((token, reverseIndex) => {
      const actualIndex = headSlice.length - 1 - reverseIndex

      return (
        token.normalized !== 'and' &&
        (isNominalSubjectToken(token) ||
          isDeterminerAnchoredNominal(token, headSlice[actualIndex - 1]) ||
          hasPosHint(token, 'noun') ||
          SINGULAR_SUBJECTS.has(token.normalized) ||
          PLURAL_SUBJECTS.has(token.normalized))
      )
    })

  if (hasCoordinator) {
    return { token: coordinatedHead ?? head, number: 'plural' as const }
  }

  if (isLikelySingularProperName(headSlice)) {
    return { token: head, number: 'singular' as const }
  }

  if (isLikelySingularTitledWork(headSlice)) {
    return { token: head, number: 'singular' as const }
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

function getSentenceFallbackSubjectTokens(
  context: RuleCheckContext,
  verb: Token,
) {
  const sentenceTokens = getSentenceTokens(context, verb.sentenceIndex)
  const verbIndex = sentenceTokens.findIndex(
    (token) => token.index === verb.index,
  )

  if (verbIndex <= 0) {
    return []
  }

  const precedingTokens = sentenceTokens.slice(0, verbIndex)
  let subjectStartIndex = precedingTokens.length - 1

  while (subjectStartIndex >= 0) {
    const token = precedingTokens[subjectStartIndex]
    const previous = precedingTokens[subjectStartIndex - 1]
    const next = precedingTokens[subjectStartIndex + 1]

    if (token.leadingText && /[,:;()[\]{}]/u.test(token.leadingText)) {
      break
    }

    if (hasPosHint(token, 'auxiliary') || hasPosHint(token, 'modal')) {
      subjectStartIndex -= 1
      continue
    }

    if (RELATIVE_CLAUSE_BREAKS.has(token.normalized)) {
      const antecedentCandidate = precedingTokens[subjectStartIndex - 1]

      if (
        antecedentCandidate &&
        ((!hasPosHint(antecedentCandidate, 'verb') &&
          (isNominalSubjectToken(antecedentCandidate) ||
            isDeterminerAnchoredNominal(
              antecedentCandidate,
              precedingTokens[subjectStartIndex - 2],
            ))) ||
          SINGULAR_SUBJECTS.has(antecedentCandidate.normalized) ||
          PLURAL_SUBJECTS.has(antecedentCandidate.normalized))
      ) {
        subjectStartIndex -= 1
        continue
      }

      break
    }

    if (hasRecoverablePredicateSignal(token, next, previous)) {
      break
    }

    if (isSubjectBoundaryPreposition(token)) {
      if (SUBJECT_HEAD_PREPOSITIONS.has(token.normalized)) {
        const headCandidate = precedingTokens[subjectStartIndex - 1]

        if (
          headCandidate &&
          (isNominalSubjectToken(headCandidate) ||
            isDeterminerAnchoredNominal(
              headCandidate,
              precedingTokens[subjectStartIndex - 2],
            ) ||
            hasPosHint(headCandidate, 'adjective') ||
            hasPosHint(headCandidate, 'determiner') ||
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
      if (
        previous &&
        (isNominalSubjectToken(previous) || hasPosHint(previous, 'adjective'))
      ) {
        subjectStartIndex -= 1
        continue
      }

      break
    }

    if (
      isNominalSubjectToken(token) ||
      isDeterminerAnchoredNominal(token, previous) ||
      (token.isCapitalized &&
        (previous?.isCapitalized || next?.isCapitalized) &&
        !hasPosHint(token, 'preposition')) ||
      (hasPosHint(token, 'noun') &&
        hasPosHint(previous ?? token, 'preposition')) ||
      hasPosHint(token, 'determiner') ||
      hasPosHint(token, 'adjective') ||
      hasPosHint(token, 'adverb') ||
      SUBJECT_SCAN_ADVERBS.has(token.normalized) ||
      SINGULAR_SUBJECTS.has(token.normalized) ||
      PLURAL_SUBJECTS.has(token.normalized)
    ) {
      subjectStartIndex -= 1
      continue
    }

    break
  }

  return trimLeadingNonSubjectTokens(
    precedingTokens.slice(subjectStartIndex + 1),
  )
}

function getSentenceFallbackSubjectInfo(
  context: RuleCheckContext,
  verb: Token,
) {
  const subjectTokens = getSentenceFallbackSubjectTokens(context, verb)

  if (subjectTokens.length === 0) {
    return null
  }

  const windowTokens = [...subjectTokens, verb]
  const info = getLocalSubjectInfo(windowTokens, verb)

  return info ? { info, tokens: subjectTokens } : null
}

function getLowerConfidence(
  left: Token['posHintConfidence'],
  right: Token['posHintConfidence'],
) {
  return AGREEMENT_CONFIDENCE_RANK[left] <= AGREEMENT_CONFIDENCE_RANK[right]
    ? left
    : right
}

function getSubjectConfidence(
  subject: SubjectInfo,
  subjectTokens: Token[],
): Token['posHintConfidence'] {
  if (subject.token.value.includes(' ')) {
    return 'medium'
  }

  if (
    SINGULAR_INDEFINITE_SUBJECTS.has(subject.token.normalized) ||
    subject.token.normalized === 'one'
  ) {
    return 'medium'
  }

  if (hasPosHint(subject.token, 'pronoun')) {
    return 'high'
  }

  if (
    subjectTokens.some((token) => hasPosHint(token, 'determiner')) &&
    (hasPosHint(subject.token, 'noun') || hasPosHint(subject.token, 'pronoun'))
  ) {
    return 'medium'
  }

  return subject.token.posHintConfidence
}

function getVerbAgreementConfidence(verb: Token) {
  if (hasPosHint(verb, 'auxiliary') || hasPosHint(verb, 'modal')) {
    return 'high' as const
  }

  return verb.morphology.verb.confidence === 'low'
    ? verb.posHintConfidence
    : verb.morphology.verb.confidence
}

function getAgreementConfidence(
  subject: SubjectInfo,
  subjectTokens: Token[],
  verb: Token,
) {
  return getLowerConfidence(
    getSubjectConfidence(subject, subjectTokens),
    getVerbAgreementConfidence(verb),
  )
}

function hasInterveningPredicateTokens(
  tokensInClause: Token[],
  earlierSubject: Token,
  laterSubject: Token,
) {
  return tokensInClause.some(
    (token) =>
      token.offset > earlierSubject.offset &&
      token.offset < laterSubject.offset &&
      (token.clausePart === 'predicate' ||
        hasPosHint(token, 'verb') ||
        hasPosHint(token, 'auxiliary') ||
        hasPosHint(token, 'modal') ||
        hasPosHint(token, 'adverb') ||
        [
          'and',
          'as',
          'because',
          'but',
          'if',
          'that',
          'when',
          'while',
          'which',
          'who',
        ].includes(token.normalized)),
  )
}

function hasStrongSingularLocalSubject(
  localSubjectTokens: Token[],
  subject: Token,
) {
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

function isLikelySubjectHeadBeforeFiniteVerb(
  tokensInClause: Token[],
  token: Token,
) {
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

function hasLeadingAuxiliaryOrModal(
  tokensInClause: Token[],
  localSubjectTokens: Token[],
  verb: Token,
) {
  const verbIndex = tokensInClause.findIndex(
    (token) => token.index === verb.index,
  )
  const localSubjectStartIndex =
    localSubjectTokens.length > 0
      ? tokensInClause.findIndex(
          (token) => token.index === localSubjectTokens[0].index,
        )
      : 0

  if (
    verbIndex <= 0 ||
    localSubjectStartIndex < 0 ||
    localSubjectStartIndex >= verbIndex
  ) {
    return false
  }

  return tokensInClause
    .slice(localSubjectStartIndex, verbIndex)
    .some(
      (token) => hasPosHint(token, 'auxiliary') || hasPosHint(token, 'modal'),
    )
}

function hasEarlierAuxiliaryOrModal(
  tokensInClause: Token[],
  localSubjectTokens: Token[],
  verb: Token,
) {
  return hasLeadingAuxiliaryOrModal(tokensInClause, localSubjectTokens, verb)
}

function hasEarlierPredicateBeforeVerb(tokensInClause: Token[], verb: Token) {
  return tokensInClause.some(
    (token, index) =>
      token.offset < verb.offset &&
      hasRecoverablePredicateSignal(
        token,
        tokensInClause[index + 1],
        tokensInClause[index - 1],
      ),
  )
}

function hasEmbeddedClauseMarkerBeforeVerb(
  tokensInClause: Token[],
  verb: Token,
) {
  const clauseStart = tokensInClause[0]

  return tokensInClause.some(
    (token) =>
      token.offset < verb.offset &&
      token.index !== clauseStart?.index &&
      ['that', 'when', 'which', 'who', 'why'].includes(token.normalized),
  )
}

function hasEarlierModal(
  tokensInClause: Token[],
  _localSubjectTokens: Token[],
  verb: Token,
) {
  return tokensInClause.some(
    (token) => token.offset < verb.offset && hasPosHint(token, 'modal'),
  )
}

function hasQuestionLeadBeforeVerb(tokensInClause: Token[], verb: Token) {
  return tokensInClause.some(
    (token) =>
      token.offset < verb.offset && QUESTION_LEADS.has(token.normalized),
  )
}

function hasTitleLikeOfPhraseBeforeVerb(tokensInClause: Token[], verb: Token) {
  const tokensBeforeVerb = tokensInClause.filter(
    (token) => token.offset < verb.offset,
  )
  const capitalizedNominals = tokensBeforeVerb.filter(
    (token) =>
      token.isCapitalized &&
      !hasPosHint(token, 'determiner') &&
      !hasPosHint(token, 'preposition'),
  )

  return (
    tokensBeforeVerb.some((token) => token.normalized === 'of') &&
    capitalizedNominals.length >= 2
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

function shouldSkipExplicitSubject(
  verb: Token,
  clauseTokens: Token[],
  localSubjectTokens: Token[],
) {
  const localSubjectStart =
    localSubjectTokens[0]?.offset ?? Number.POSITIVE_INFINITY

  return clauseTokens.some(
    (token) =>
      token.offset < verb.offset &&
      token.clausePart === 'predicate' &&
      /[,:;]\s*$/u.test(token.leadingText) &&
      (localSubjectStart === Number.POSITIVE_INFINITY ||
        token.offset > localSubjectStart),
  )
}

function shouldSkipLexicalAgreementInInvertedQuestion(
  clauseTokens: Token[],
  verb: Token,
) {
  const clauseStart = clauseTokens[0]

  if (!clauseStart || !QUESTION_LEADS.has(clauseStart.normalized)) {
    return false
  }

  return clauseTokens.some(
    (token) =>
      token.offset < verb.offset &&
      INVERTED_AUXILIARIES.has(token.normalized) &&
      (hasPosHint(token, 'auxiliary') || hasPosHint(token, 'verb')),
  )
}

function createAgreementDiagnostics(
  verb: Token,
  subject: ResolvedSubject,
  expectedVerb: string,
  confidenceLabel: Token['posHintConfidence'],
  reason: string,
) {
  return {
    evidence: [
      `subject:${subject.source}:${subject.info.token.normalized}:${subject.info.number}`,
      `verb:${verb.normalized}->${expectedVerb}`,
      `reason:${reason}`,
    ],
    triggerTokens: [subject.info.token.normalized, verb.normalized],
    annotationConfidence: confidenceLabel,
  }
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

      if (
        !forms &&
        hasPosHint(verb, 'noun') &&
        tokens[index - 1] &&
        (hasPosHint(tokens[index - 1], 'determiner') ||
          hasPosHint(tokens[index - 1], 'adjective')) &&
        verb.clausePart !== 'predicate'
      ) {
        continue
      }

      const clauseTokens = getTokenClauseTokens(context, verb)
      const localSubjectTokens = getLocalSubjectTokens(clauseTokens, verb)

      if (
        !forms &&
        !hasRecoverablePredicateSignal(verb, following, tokens[index - 1])
      ) {
        continue
      }

      if (forms && hasClausalSubjectBeforeVerb(clauseTokens, verb)) {
        continue
      }

      if (
        forms &&
        hasQuestionLeadBeforeVerb(clauseTokens, verb) &&
        hasEarlierPredicateBeforeVerb(clauseTokens, verb)
      ) {
        continue
      }

      if (
        forms &&
        hasQuestionLeadBeforeVerb(clauseTokens, verb) &&
        hasEmbeddedClauseMarkerBeforeVerb(clauseTokens, verb)
      ) {
        continue
      }

      if (forms && hasTitleLikeOfPhraseBeforeVerb(clauseTokens, verb)) {
        continue
      }

      if (shouldSkipExplicitSubject(verb, clauseTokens, localSubjectTokens)) {
        continue
      }

      const invertedQuestionSubject = getInvertedQuestionSubjectInfo(
        clauseTokens,
        verb,
      )
      const clauseSubjectTokens = trimLeadingNonSubjectTokens(
        getClauseSubjectTokens(clauseTokens),
      )
      const clauseSubject = getSubjectInfo(clauseTokens)
      const localSubject = getLocalSubjectInfo(clauseTokens, verb)
      const sentenceFallbackSubject =
        clauseTokens[0]?.normalized === 'and' || !localSubject
          ? getSentenceFallbackSubjectInfo(context, verb)
          : null

      let resolvedSubject: ResolvedSubject | null = null

      if (invertedQuestionSubject) {
        resolvedSubject = {
          info: invertedQuestionSubject,
          tokens: [invertedQuestionSubject.token],
          source: 'inverted-question',
        }
      } else if (
        localSubject &&
        clauseSubject &&
        localSubject.token.offset > clauseSubject.token.offset &&
        hasInterveningPredicateTokens(
          clauseTokens,
          clauseSubject.token,
          localSubject.token,
        )
      ) {
        resolvedSubject = {
          info: localSubject,
          tokens: localSubjectTokens,
          source: 'local',
        }
      } else if (
        forms &&
        localSubject &&
        clauseSubject &&
        localSubject.token.offset > clauseSubject.token.offset &&
        !hasInterveningPredicateTokens(
          clauseTokens,
          clauseSubject.token,
          localSubject.token,
        )
      ) {
        resolvedSubject = {
          info: clauseSubject,
          tokens: clauseSubjectTokens,
          source: 'clause',
        }
      } else if (localSubject) {
        resolvedSubject = {
          info: localSubject,
          tokens: localSubjectTokens,
          source: 'local',
        }
      } else if (clauseSubject) {
        resolvedSubject = {
          info: clauseSubject,
          tokens: clauseSubjectTokens,
          source: 'clause',
        }
      }

      if (sentenceFallbackSubject && clauseTokens[0]?.normalized === 'and') {
        resolvedSubject = {
          info: sentenceFallbackSubject.info,
          tokens: sentenceFallbackSubject.tokens,
          source: 'sentence-fallback',
        }
      } else if (!resolvedSubject && sentenceFallbackSubject) {
        resolvedSubject = {
          info: sentenceFallbackSubject.info,
          tokens: sentenceFallbackSubject.tokens,
          source: 'sentence-fallback',
        }
      }

      if (forms) {
        if (!resolvedSubject) {
          continue
        }

        if (
          (resolvedSubject.info.token.normalized === 'i' &&
            ['am', 'do', "don't", 'have'].includes(verb.normalized)) ||
          (resolvedSubject.info.token.normalized === 'you' &&
            ['are', 'do', 'have'].includes(verb.normalized))
        ) {
          continue
        }

        const expectedVerb = forms[resolvedSubject.info.number]

        if (verb.normalized === expectedVerb) {
          continue
        }

        const confidenceLabel = getAgreementConfidence(
          resolvedSubject.info,
          resolvedSubject.tokens,
          verb,
        )

        if (confidenceLabel === 'low') {
          continue
        }

        matches.push(
          createMatch({
            text,
            offset: verb.offset,
            length: verb.length,
            message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${resolvedSubject.info.token.value}".`,
            replacements: [preserveCase(verb.value, expectedVerb)],
            confidenceLabel,
            diagnostics: createAgreementDiagnostics(
              verb,
              resolvedSubject,
              expectedVerb,
              confidenceLabel,
              'finite-form-agreement',
            ),
            rule: subjectVerbAgreementRule,
          }),
        )

        continue
      }

      if (!hasRecoverablePredicateSignal(verb, following, tokens[index - 1])) {
        continue
      }

      if (shouldSkipLexicalAgreementInInvertedQuestion(clauseTokens, verb)) {
        continue
      }

      if (
        hasEarlierModal(clauseTokens, localSubjectTokens, verb) &&
        hasRecoverablePredicateSignal(verb, following, tokens[index - 1]) &&
        isLikelyThirdPersonSingularVerb(verb, following)
      ) {
        const expectedVerb = toPluralBaseVerb(verb.normalized)

        if (expectedVerb !== verb.normalized) {
          const confidenceLabel = resolvedSubject
            ? getAgreementConfidence(
                resolvedSubject.info,
                resolvedSubject.tokens,
                verb,
              )
            : getVerbAgreementConfidence(verb)

          if (confidenceLabel === 'low') {
            continue
          }

          matches.push(
            createMatch({
              text,
              offset: verb.offset,
              length: verb.length,
              message: `Use the base verb "${preserveCase(verb.value, expectedVerb)}" after the modal here.`,
              replacements: [preserveCase(verb.value, expectedVerb)],
              confidenceLabel,
              diagnostics: resolvedSubject
                ? createAgreementDiagnostics(
                    verb,
                    resolvedSubject,
                    expectedVerb,
                    confidenceLabel,
                    'modal-base-form',
                  )
                : {
                    evidence: [
                      `verb:${verb.normalized}->${expectedVerb}`,
                      'reason:modal-base-form',
                    ],
                    triggerTokens: [verb.normalized],
                    annotationConfidence: confidenceLabel,
                  },
              rule: subjectVerbAgreementRule,
            }),
          )
        }

        continue
      }

      if (!resolvedSubject) {
        continue
      }

      if (
        resolvedSubject.info.number === 'plural' &&
        hasRecoverablePredicateSignal(verb, following, tokens[index - 1]) &&
        (!following ||
          /^\s+$/u.test(verb.trailingText) ||
          verb.isSentenceEnd) &&
        isLikelyThirdPersonSingularVerb(verb, following)
      ) {
        const expectedVerb = toPluralBaseVerb(verb.normalized)

        if (expectedVerb === verb.normalized) {
          continue
        }

        const confidenceLabel = getAgreementConfidence(
          resolvedSubject.info,
          resolvedSubject.tokens,
          verb,
        )

        if (confidenceLabel === 'low') {
          continue
        }

        matches.push(
          createMatch({
            text,
            offset: verb.offset,
            length: verb.length,
            message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${resolvedSubject.info.token.value}".`,
            replacements: [preserveCase(verb.value, expectedVerb)],
            confidenceLabel,
            diagnostics: createAgreementDiagnostics(
              verb,
              resolvedSubject,
              expectedVerb,
              confidenceLabel,
              'plural-subject-finite-verb',
            ),
            rule: subjectVerbAgreementRule,
          }),
        )
      }

      if (
        resolvedSubject.info.number === 'singular' &&
        hasStrongSingularLocalSubject(
          resolvedSubject.tokens,
          resolvedSubject.info.token,
        ) &&
        following &&
        /^\s+$/u.test(verb.trailingText) &&
        !/[;:]\s*$/u.test(verb.leadingText) &&
        !(
          QUESTION_LEADS.has(clauseTokens[0]?.normalized ?? '') &&
          hasEarlierModal(clauseTokens, resolvedSubject.tokens, verb)
        ) &&
        !hasLeadingAuxiliaryOrModal(
          clauseTokens,
          resolvedSubject.tokens,
          verb,
        ) &&
        !hasEarlierAuxiliaryOrModal(
          clauseTokens,
          resolvedSubject.tokens,
          verb,
        ) &&
        !isLikelySubjectHeadBeforeFiniteVerb(clauseTokens, verb) &&
        hasRecoverablePredicateSignal(verb, following, tokens[index - 1]) &&
        hasPosHint(verb, 'verb') &&
        !hasPosHint(verb, 'auxiliary') &&
        !hasPosHint(verb, 'modal') &&
        isLikelyBareLexicalVerb(verb) &&
        hasBareVerbFollowerSignal(following)
      ) {
        const expectedVerb = toThirdPersonSingularVerb(verb.normalized)

        if (expectedVerb !== verb.normalized) {
          const confidenceLabel = getAgreementConfidence(
            resolvedSubject.info,
            resolvedSubject.tokens,
            verb,
          )

          if (confidenceLabel === 'low') {
            continue
          }

          matches.push(
            createMatch({
              text,
              offset: verb.offset,
              length: verb.length,
              message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${resolvedSubject.info.token.value}".`,
              replacements: [preserveCase(verb.value, expectedVerb)],
              confidenceLabel,
              diagnostics: createAgreementDiagnostics(
                verb,
                resolvedSubject,
                expectedVerb,
                confidenceLabel,
                'singular-subject-bare-verb',
              ),
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

      if (PLURAL_CUES.has(nounToken.normalized) || nounToken.isPluralLike) {
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
