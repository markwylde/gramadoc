import type { Match } from '../../../../types.js'
import { hasPosHint } from '../../../linguistics.js'
import {
  toPluralBaseVerb,
  toThirdPersonSingularVerb,
} from '../../../morphology.js'
import { analyzeQuotationMarks } from '../../../quotation.js'
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
  'at',
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
const EXISTENTIAL_THERE_SKIP_WORDS = new Set([
  'all',
  'another',
  'any',
  'enough',
  'more',
  'most',
  'no',
  'some',
  'such',
  'the',
  'these',
  'this',
  'those',
])
const AGREEMENT_CONFIDENCE_RANK = {
  low: 0,
  medium: 1,
  high: 2,
} as const

type SubjectInfo = {
  token: Token
  number: 'singular' | 'plural'
}

type SubjectCandidate = {
  info: SubjectInfo
  tokens: Token[]
}

type ResolvedSubject = {
  info: SubjectInfo
  tokens: Token[]
  source: 'clause' | 'inverted-question' | 'local' | 'sentence-fallback'
}

type SubjectResolutionOptions = {
  allowTrailingHeadFallback?: boolean
  allowVerbBackedHead?: boolean
}

function getCapitalizedNameParts(tokens: Token[]) {
  return tokens.filter(
    (token) =>
      token.isCapitalized &&
      token.normalized !== 'and' &&
      !hasPosHint(token, 'pronoun') &&
      !hasPosHint(token, 'adverb') &&
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
      (SUBJECT_SCAN_ADVERBS.has(current.normalized) ||
        hasPosHint(current, 'adverb')) &&
      next &&
      (hasPosHint(next, 'determiner') || isNominalSubjectToken(next))
    ) {
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

function isLikelyStandaloneSingularProperName(token?: Token) {
  return (
    !!token &&
    token.isCapitalized &&
    !token.isSentenceStart &&
    !hasPosHint(token, 'determiner') &&
    !hasPosHint(token, 'preposition') &&
    !hasPosHint(token, 'pronoun')
  )
}

function isLikelySingularProperName(tokens: Token[]) {
  const nameParts = getCapitalizedNameParts(tokens)

  if (nameParts.length < 2) {
    return false
  }

  if (tokens.some((token) => hasPosHint(token, 'pronoun'))) {
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
  const nonOfPreposition = tokens.find(
    (token) =>
      hasPosHint(token, 'preposition') && token.normalized !== 'of',
  )

  if (
    nameParts.length < 2 ||
    !tokens.some((token) => token.normalized === 'of') ||
    nonOfPreposition
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

function findSubjectHead(
  headSlice: Token[],
  options: SubjectResolutionOptions = {},
) {
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
        (options.allowVerbBackedHead &&
          actualIndex === headSlice.length - 1 &&
          previous &&
          hasPosHint(previous, 'determiner') &&
          hasPosHint(token, 'verb'))
      )
    })
  const nounLikeToken = [...headSlice].reverse().find((token, reverseIndex) => {
    const actualIndex = headSlice.length - 1 - reverseIndex

    return (
      isNominalSubjectToken(token) ||
      isDeterminerAnchoredNominal(token, headSlice[actualIndex - 1])
    )
  })
  const head =
    explicitSubject ??
    nounLikeToken ??
    (options.allowTrailingHeadFallback ? headSlice.at(-1) : undefined)

  return { explicitSubject, nounLikeToken, head }
}

function resolveSubjectFromTokens(
  subjectTokens: Token[],
  options: SubjectResolutionOptions = {},
): SubjectInfo | null {
  if (subjectTokens.length === 0) {
    return null
  }

  const first = subjectTokens[0]

  const quantifiedOfSubject = getQuantifiedOfSubjectInfo(subjectTokens)

  if (quantifiedOfSubject) {
    return quantifiedOfSubject
  }

  if (isLikelySingularTitledWork(subjectTokens)) {
    const nominalToken = subjectTokens.find(isNominalSubjectToken)

    return {
      token: nominalToken ?? first,
      number: 'singular' as const,
    }
  }

  const subjectSlice = getSubjectHeadSlice(subjectTokens)
  const { explicitSubject, nounLikeToken, head } = findSubjectHead(
    subjectSlice,
    options,
  )
  const standaloneProperName = [...subjectSlice]
    .reverse()
    .find((token) => isLikelyStandaloneSingularProperName(token))
  const headIndex = head
    ? subjectSlice.findIndex((token) => token.index === head.index)
    : -1
  const previousHead = headIndex > 0 ? subjectSlice[headIndex - 1] : undefined
  const precedingPluralCue = subjectSlice
    .slice(0, Math.max(headIndex, 0))
    .find((token) => PLURAL_CUES.has(token.normalized))

  if (standaloneProperName && !nounLikeToken) {
    return {
      token: standaloneProperName,
      number: 'singular' as const,
    }
  }

  if (!head) {
    return null
  }

  if (
    !explicitSubject &&
    !nounLikeToken &&
    (!options.allowTrailingHeadFallback ||
      (!SINGULAR_SUBJECTS.has(head.normalized) &&
        !PLURAL_SUBJECTS.has(head.normalized) &&
        !isDeterminerAnchoredNominal(head, previousHead) &&
        !isLikelySingularProperName(subjectSlice) &&
        !isLikelySingularTitledWork(subjectSlice)))
  ) {
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
      token: coordinatedHead ?? head,
      number: 'plural' as const,
    }
  }

  if (isLikelySingularProperName(subjectSlice)) {
    return {
      token: head,
      number: 'singular' as const,
    }
  }

  if (isLikelySingularTitledWork(subjectSlice)) {
    return {
      token: head,
      number: 'singular' as const,
    }
  }

  const determiner = subjectSlice.find((token) =>
    hasPosHint(token, 'determiner'),
  )

  if (
    head.normalized === 'one' ||
    determiner?.normalized === 'each' ||
    determiner?.normalized === 'every'
  ) {
    return { token: head, number: 'singular' as const }
  }

  if (
    hasPosHint(head, 'adjective') &&
    !hasPosHint(head, 'noun') &&
    (precedingPluralCue ||
      (determiner && PLURAL_CUES.has(determiner.normalized)))
  ) {
    return { token: head, number: 'plural' as const }
  }

  return {
    token: head,
    number: getResolvedSubjectNumber(head),
  }
}

function getSubjectInfo(tokensInClause: Token[]) {
  return resolveSubjectFromTokens(
    trimLeadingNonSubjectTokens(getClauseSubjectTokens(tokensInClause)),
  )
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
  return resolveSubjectFromTokens(
    trimLeadingNonSubjectTokens(getLocalSubjectTokens(tokensInClause, verb)),
    {
      allowTrailingHeadFallback: true,
      allowVerbBackedHead: true,
    },
  )
}

function getExistentialThereHead(
  tokens: Token[],
  verbIndex: number,
): SubjectInfo | null {
  const thereToken = tokens[verbIndex - 1]
  const verbToken = tokens[verbIndex]

  if (
    !thereToken ||
    !verbToken ||
    thereToken.normalized !== 'there' ||
    !['is', 'are'].includes(verbToken.normalized) ||
    thereToken.sentenceIndex !== verbToken.sentenceIndex ||
    !/^\s+$/u.test(thereToken.trailingText) ||
    !/^\s+$/u.test(verbToken.trailingText)
  ) {
    return null
  }

  let cueNumber: SubjectInfo['number'] | null = null

  for (let index = verbIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index]
    const previous = tokens[index - 1]

    if (
      token.sentenceIndex !== verbToken.sentenceIndex ||
      token.clauseIndex !== verbToken.clauseIndex
    ) {
      break
    }

    if (!previous || !/^\s+$/u.test(previous.trailingText)) {
      break
    }

    if (token.leadingText && /[,:;()[\]{}]/u.test(token.leadingText)) {
      break
    }

    if (
      RELATIVE_CLAUSE_BREAKS.has(token.normalized) ||
      hasPosHint(token, 'preposition') ||
      hasPosHint(token, 'verb') ||
      hasPosHint(token, 'auxiliary') ||
      hasPosHint(token, 'modal')
    ) {
      break
    }

    if (
      token.isNumberLike &&
      token.normalized !== 'one' &&
      token.normalized !== '1'
    ) {
      cueNumber = 'plural'
      continue
    }

    if (PLURAL_CUES.has(token.normalized)) {
      cueNumber = 'plural'
      continue
    }

    if (SINGULAR_DETERMINERS.has(token.normalized)) {
      cueNumber = 'singular'
      continue
    }

    if (
      EXISTENTIAL_THERE_SKIP_WORDS.has(token.normalized) ||
      hasPosHint(token, 'determiner') ||
      hasPosHint(token, 'adjective') ||
      hasPosHint(token, 'adverb')
    ) {
      continue
    }

    if (isNominalSubjectToken(token) || hasPosHint(token, 'noun')) {
      return {
        token,
        number: cueNumber ?? getResolvedSubjectNumber(token),
      }
    }

    break
  }

  return null
}

function getExistentialThereHeadForVerb(tokensInClause: Token[], verb: Token) {
  const verbIndex = tokensInClause.findIndex(
    (candidate) => candidate.index === verb.index,
  )

  if (verbIndex < 1) {
    return null
  }

  return getExistentialThereHead(tokensInClause, verbIndex)
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
  const strongSubjectEvidence = hasStrongSubjectEvidence(subject, subjectTokens)

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
    !strongSubjectEvidence &&
    (subject.token.usedFallbackPosGuess ||
      subject.token.posHintConfidence === 'low')
  ) {
    return 'low'
  }

  if (
    subjectTokens.some((token) => hasPosHint(token, 'determiner')) &&
    (hasPosHint(subject.token, 'noun') || hasPosHint(subject.token, 'pronoun'))
  ) {
    return 'medium'
  }

  if (strongSubjectEvidence && subject.token.posHintConfidence === 'low') {
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

  if (
    localSubjectTokens.length === 1 &&
    hasPosHint(subject, 'noun') &&
    subject.posHintConfidence !== 'low'
  ) {
    return true
  }

  return (
    localSubjectTokens.length > 1 &&
    (hasPosHint(subject, 'noun') || hasPosHint(subject, 'pronoun'))
  )
}

function hasStrongSubjectEvidence(
  subject: SubjectInfo,
  subjectTokens: Token[],
) {
  if (
    hasPosHint(subject.token, 'pronoun') ||
    SINGULAR_SUBJECTS.has(subject.token.normalized) ||
    PLURAL_SUBJECTS.has(subject.token.normalized)
  ) {
    return true
  }

  if (
    getQuantifiedOfSubjectInfo(subjectTokens) ||
    hasCoordinatedLocalSubject(subjectTokens) ||
    isLikelySingularProperName(subjectTokens) ||
    isLikelySingularTitledWork(subjectTokens)
  ) {
    return true
  }

  if (
    subjectTokens.some((token, index) =>
      isDeterminerAnchoredNominal(token, subjectTokens[index - 1]),
    )
  ) {
    return true
  }

  if (
    subjectTokens.some(
      (token, index) =>
        index > 0 &&
        hasPosHint(subjectTokens[index - 1], 'determiner') &&
        hasPosHint(token, 'verb'),
    )
  ) {
    return true
  }

  return (
    isNominalSubjectToken(subject.token) && !subject.token.usedFallbackPosGuess
  )
}

function hasNominalSubjectAnchor(subject: SubjectCandidate) {
  if (
    getQuantifiedOfSubjectInfo(subject.tokens) ||
    hasCoordinatedLocalSubject(subject.tokens) ||
    isLikelySingularProperName(subject.tokens) ||
    isLikelySingularTitledWork(subject.tokens)
  ) {
    return true
  }

  return subject.tokens.some(
    (token, index) =>
      hasPosHint(token, 'noun') ||
      isDeterminerAnchoredNominal(token, subject.tokens[index - 1]),
  )
}

function isAdjectivalSubjectHead(subject: SubjectCandidate) {
  return (
    hasPosHint(subject.info.token, 'adjective') &&
    !hasPosHint(subject.info.token, 'noun') &&
    !hasPosHint(subject.info.token, 'pronoun')
  )
}

function isExpandedNominalLocalSubject(
  clauseSubject: SubjectCandidate,
  localSubject: SubjectCandidate,
  verb: Token,
) {
  if (
    localSubject.info.token.offset >= verb.offset ||
    !hasPosHint(localSubject.info.token, 'noun') ||
    localSubject.info.token.usedFallbackPosGuess
  ) {
    return false
  }

  const clauseTokensBeforeVerb = clauseSubject.tokens.filter(
    (token) => token.offset < verb.offset,
  )
  const localTokensBeforeVerb = localSubject.tokens.filter(
    (token) => token.offset < verb.offset,
  )

  if (
    clauseTokensBeforeVerb.length === 0 ||
    clauseTokensBeforeVerb.length >= localTokensBeforeVerb.length
  ) {
    return false
  }

  return clauseTokensBeforeVerb.every(
    (token, index) => token.index === localTokensBeforeVerb[index]?.index,
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
  text: string,
  tokensInClause: Token[],
  _localSubjectTokens: Token[],
  verb: Token,
) {
  const { pairs } = analyzeQuotationMarks(text)
  const verbInsideQuotedText = pairs.some(
    (pair) => verb.offset > pair.open && verb.offset < pair.close,
  )

  return tokensInClause.some(
    (token) =>
      token.offset < verb.offset &&
      hasPosHint(token, 'modal') &&
      pairs.some(
        (pair) => token.offset > pair.open && token.offset < pair.close,
      ) === verbInsideQuotedText,
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

function hasPluralCueBeforeAdjectivalSubject(
  clauseTokens: Token[],
  subject: ResolvedSubject,
  verb: Token,
) {
  if (
    hasPosHint(subject.info.token, 'pronoun') ||
    hasPosHint(subject.info.token, 'determiner') ||
    SINGULAR_SUBJECTS.has(subject.info.token.normalized) ||
    PLURAL_SUBJECTS.has(subject.info.token.normalized)
  ) {
    return false
  }

  const hasPluralCue = clauseTokens.some(
    (token) =>
      token.offset < subject.info.token.offset &&
      PLURAL_CUES.has(token.normalized),
  )

  if (!hasPluralCue) {
    return false
  }

  return !clauseTokens.some(
    (token) =>
      token.offset > subject.info.token.offset &&
      token.offset < verb.offset &&
      token.normalized === 'of',
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

function getClauseSubjectCandidate(tokensInClause: Token[]) {
  const tokens = trimLeadingNonSubjectTokens(
    getClauseSubjectTokens(tokensInClause),
  )
  const info = getSubjectInfo(tokensInClause)

  return info ? ({ info, tokens } satisfies SubjectCandidate) : null
}

function getLocalSubjectCandidate(tokensInClause: Token[], verb: Token) {
  const tokens = trimLeadingNonSubjectTokens(
    getLocalSubjectTokens(tokensInClause, verb),
  )
  const info = getLocalSubjectInfo(tokensInClause, verb)

  return info ? ({ info, tokens } satisfies SubjectCandidate) : null
}

function getSentenceFallbackSubjectCandidate(
  context: RuleCheckContext,
  verb: Token,
) {
  const tokens = getSentenceFallbackSubjectTokens(context, verb)
  const info = getSentenceFallbackSubjectInfo(context, verb)?.info

  return info ? ({ info, tokens } satisfies SubjectCandidate) : null
}

function getRelativeClauseSubjectCandidate(
  tokensInClause: Token[],
  verb: Token,
) {
  const verbIndex = tokensInClause.findIndex(
    (token) => token.index === verb.index,
  )

  if (verbIndex <= 0) {
    return null
  }

  for (let index = verbIndex - 1; index > 0; index -= 1) {
    const marker = tokensInClause[index]

    if (!RELATIVE_CLAUSE_BREAKS.has(marker.normalized)) {
      continue
    }

    const antecedent = tokensInClause[index - 1]
    const previous = tokensInClause[index - 2]
    const hasSupportedAntecedent =
      (hasPosHint(antecedent, 'noun') &&
        !antecedent.usedFallbackPosGuess &&
        antecedent.posHintConfidence !== 'low') ||
      isDeterminerAnchoredNominal(antecedent, previous) ||
      hasPosHint(previous ?? antecedent, 'adjective')

    if (
      !antecedent ||
      !hasSupportedAntecedent ||
      !(
        isNominalSubjectToken(antecedent) ||
        isDeterminerAnchoredNominal(antecedent, previous) ||
        hasPosHint(antecedent, 'noun')
      )
    ) {
      continue
    }

    return {
      info: {
        token: {
          ...antecedent,
          posHintConfidence:
            antecedent.posHintConfidence === 'low'
              ? 'medium'
              : antecedent.posHintConfidence,
          usedFallbackPosGuess: false,
        },
        number:
          SINGULAR_SUBJECTS.has(antecedent.normalized) ||
          PLURAL_SUBJECTS.has(antecedent.normalized)
            ? SINGULAR_SUBJECTS.has(antecedent.normalized)
              ? 'singular'
              : 'plural'
            : getResolvedSubjectNumber(antecedent),
      },
      tokens: [antecedent],
    } satisfies SubjectCandidate
  }

  return null
}

function shouldPreferLocalSubject(
  tokensInClause: Token[],
  clauseSubject: SubjectCandidate,
  localSubject: SubjectCandidate,
  verb: Token,
) {
  if (
    localSubject.info.token.offset <= clauseSubject.info.token.offset ||
    !hasStrongSubjectEvidence(localSubject.info, localSubject.tokens)
  ) {
    return false
  }

  if (
    isAdjectivalSubjectHead(clauseSubject) &&
    hasNominalSubjectAnchor(localSubject)
  ) {
    return true
  }

  if (
    hasInterveningPredicateTokens(
      tokensInClause,
      clauseSubject.info.token,
      localSubject.info.token,
    )
  ) {
    return true
  }

  if (isExpandedNominalLocalSubject(clauseSubject, localSubject, verb)) {
    return true
  }

  return !hasNominalSubjectAnchor(clauseSubject)
}

function resolveFiniteAgreementSubject(
  context: RuleCheckContext,
  tokensInClause: Token[],
  verb: Token,
  localSubjectTokens: Token[],
) {
  const invertedQuestionSubject = getInvertedQuestionSubjectInfo(
    tokensInClause,
    verb,
  )
  const relativeClauseSubject = getRelativeClauseSubjectCandidate(
    tokensInClause,
    verb,
  )

  if (invertedQuestionSubject) {
    return {
      info: invertedQuestionSubject,
      tokens: [invertedQuestionSubject.token],
      source: 'inverted-question' as const,
    }
  }

  if (relativeClauseSubject) {
    return {
      info: relativeClauseSubject.info,
      tokens: relativeClauseSubject.tokens,
      source: 'local' as const,
    }
  }

  const clauseSubject = getClauseSubjectCandidate(tokensInClause)
  const localSubject =
    localSubjectTokens.length > 0
      ? getLocalSubjectCandidate(tokensInClause, verb)
      : null
  const clauseSubjectBeforeVerb = clauseSubject?.info.token.offset
  const usableClauseSubject =
    clauseSubjectBeforeVerb !== undefined &&
    clauseSubjectBeforeVerb < verb.offset
      ? clauseSubject
      : null
  const sentenceFallbackSubject =
    tokensInClause[0]?.normalized === 'and' || !localSubject
      ? getSentenceFallbackSubjectCandidate(context, verb)
      : null

  if (sentenceFallbackSubject && tokensInClause[0]?.normalized === 'and') {
    return {
      info: sentenceFallbackSubject.info,
      tokens: sentenceFallbackSubject.tokens,
      source: 'sentence-fallback' as const,
    }
  }

  if (usableClauseSubject && localSubject) {
    if (
      shouldPreferLocalSubject(
        tokensInClause,
        usableClauseSubject,
        localSubject,
        verb,
      )
    ) {
      return {
        info: localSubject.info,
        tokens: localSubject.tokens,
        source: 'local' as const,
      }
    }

    return {
      info: usableClauseSubject.info,
      tokens: usableClauseSubject.tokens,
      source: 'clause' as const,
    }
  }

  if (usableClauseSubject) {
    return {
      info: usableClauseSubject.info,
      tokens: usableClauseSubject.tokens,
      source: 'clause' as const,
    }
  }

  if (localSubject) {
    return {
      info: localSubject.info,
      tokens: localSubject.tokens,
      source: 'local' as const,
    }
  }

  if (sentenceFallbackSubject) {
    return {
      info: sentenceFallbackSubject.info,
      tokens: sentenceFallbackSubject.tokens,
      source: 'sentence-fallback' as const,
    }
  }

  return null
}

function resolveBareVerbSubject(
  context: RuleCheckContext,
  tokensInClause: Token[],
  verb: Token,
  localSubjectTokens: Token[],
) {
  const relativeClauseSubject = getRelativeClauseSubjectCandidate(
    tokensInClause,
    verb,
  )
  const localSubject =
    localSubjectTokens.length > 0
      ? getLocalSubjectCandidate(tokensInClause, verb)
      : null
  const clauseSubject = getClauseSubjectCandidate(tokensInClause)
  const sentenceFallbackSubject =
    tokensInClause[0]?.normalized === 'and' || !localSubject
      ? getSentenceFallbackSubjectCandidate(context, verb)
      : null

  if (relativeClauseSubject) {
    return {
      info: relativeClauseSubject.info,
      tokens: relativeClauseSubject.tokens,
      source: 'local' as const,
    }
  }

  if (sentenceFallbackSubject && tokensInClause[0]?.normalized === 'and') {
    return {
      info: sentenceFallbackSubject.info,
      tokens: sentenceFallbackSubject.tokens,
      source: 'sentence-fallback' as const,
    }
  }

  if (clauseSubject && localSubject) {
    if (
      shouldPreferLocalSubject(tokensInClause, clauseSubject, localSubject, verb)
    ) {
      return {
        info: localSubject.info,
        tokens: localSubject.tokens,
        source: 'local' as const,
      }
    }

    return {
      info: clauseSubject.info,
      tokens: clauseSubject.tokens,
      source: 'clause' as const,
    }
  }

  if (
    localSubject &&
    hasStrongSubjectEvidence(localSubject.info, localSubject.tokens)
  ) {
    return {
      info: localSubject.info,
      tokens: localSubject.tokens,
      source: 'local' as const,
    }
  }

  if (clauseSubject) {
    return {
      info: clauseSubject.info,
      tokens: clauseSubject.tokens,
      source: 'clause' as const,
    }
  }

  if (localSubject) {
    return {
      info: localSubject.info,
      tokens: localSubject.tokens,
      source: 'local' as const,
    }
  }

  if (sentenceFallbackSubject) {
    return {
      info: sentenceFallbackSubject.info,
      tokens: sentenceFallbackSubject.tokens,
      source: 'sentence-fallback' as const,
    }
  }

  return null
}

export const subjectVerbAgreementRule: GrammerRule = {
  id: 'SUBJECT_VERB_AGREEMENT',
  name: 'Subject-Verb Agreement',
  description:
    'Flags agreement mismatches using shared clause subjects first, with bounded local recovery when the shared structure is incomplete.',
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

      if (!forms && isLikelySubjectHeadBeforeFiniteVerb(clauseTokens, verb)) {
        continue
      }

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

      if (forms && getExistentialThereHeadForVerb(clauseTokens, verb)) {
        continue
      }

      if (shouldSkipExplicitSubject(verb, clauseTokens, localSubjectTokens)) {
        continue
      }

      const finiteResolvedSubject =
        forms || isLikelyThirdPersonSingularVerb(verb, following)
          ? resolveFiniteAgreementSubject(
              context,
              clauseTokens,
              verb,
              localSubjectTokens,
            )
          : null
      const bareVerbResolvedSubject =
        !forms && isLikelyBareLexicalVerb(verb)
          ? resolveBareVerbSubject(
              context,
              clauseTokens,
              verb,
              localSubjectTokens,
            )
          : null

      if (forms) {
        const resolvedSubject = finiteResolvedSubject

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
        hasEarlierModal(text, clauseTokens, localSubjectTokens, verb) &&
        hasRecoverablePredicateSignal(verb, following, tokens[index - 1]) &&
        isLikelyThirdPersonSingularVerb(verb, following)
      ) {
        const expectedVerb = toPluralBaseVerb(verb.normalized)

        if (expectedVerb !== verb.normalized) {
          const confidenceLabel = getVerbAgreementConfidence(verb)

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
              diagnostics: finiteResolvedSubject
                ? createAgreementDiagnostics(
                    verb,
                    finiteResolvedSubject,
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

      if (!finiteResolvedSubject && !bareVerbResolvedSubject) {
        continue
      }

      if (
        finiteResolvedSubject?.info.number === 'plural' &&
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
          finiteResolvedSubject.info,
          finiteResolvedSubject.tokens,
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
            message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${finiteResolvedSubject.info.token.value}".`,
            replacements: [preserveCase(verb.value, expectedVerb)],
            confidenceLabel,
            diagnostics: createAgreementDiagnostics(
              verb,
              finiteResolvedSubject,
              expectedVerb,
              confidenceLabel,
              'plural-subject-finite-verb',
            ),
            rule: subjectVerbAgreementRule,
          }),
        )
      }

      if (
        bareVerbResolvedSubject?.info.number === 'singular' &&
        !['i', 'you'].includes(bareVerbResolvedSubject.info.token.normalized) &&
        hasStrongSingularLocalSubject(
          bareVerbResolvedSubject.tokens,
          bareVerbResolvedSubject.info.token,
        ) &&
        !hasPluralCueBeforeAdjectivalSubject(
          clauseTokens,
          bareVerbResolvedSubject,
          verb,
        ) &&
        following &&
        /^\s+$/u.test(verb.trailingText) &&
        !/[;:]\s*$/u.test(verb.leadingText) &&
        !(
          QUESTION_LEADS.has(clauseTokens[0]?.normalized ?? '') &&
          hasEarlierModal(
            text,
            clauseTokens,
            bareVerbResolvedSubject.tokens,
            verb,
          )
        ) &&
        !hasLeadingAuxiliaryOrModal(
          clauseTokens,
          bareVerbResolvedSubject.tokens,
          verb,
        ) &&
        !hasEarlierAuxiliaryOrModal(
          clauseTokens,
          bareVerbResolvedSubject.tokens,
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
            bareVerbResolvedSubject.info,
            bareVerbResolvedSubject.tokens,
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
              message: `Use "${preserveCase(verb.value, expectedVerb)}" with "${bareVerbResolvedSubject.info.token.value}".`,
              replacements: [preserveCase(verb.value, expectedVerb)],
              confidenceLabel,
              diagnostics: createAgreementDiagnostics(
                verb,
                bareVerbResolvedSubject,
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
      const existentialHead = getExistentialThereHead(tokens, index + 1)

      if (
        thereToken.normalized !== 'there' ||
        !['is', 'are'].includes(verbToken.normalized) ||
        !existentialHead
      ) {
        continue
      }

      const expectedVerb = existentialHead.number === 'plural' ? 'are' : 'is'

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
