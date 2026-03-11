import { hasPosHint } from './linguistics.js'
import type { ClausePart, ClauseRange, SentenceRange, Token } from './types.js'

const FINITE_AUXILIARY_WORDS = new Set([
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
const OBJECT_OR_COMPLEMENT_HINTS = new Set([
  'adverb',
  'determiner',
  'noun',
  'pronoun',
])
const CLAUSE_COORDINATORS = new Set(['and', 'but', 'or'])

const STRONG_CLAUSE_BOUNDARY_REGEX = /(?:--|—|[;:()[\]{}])/u
const COMMA_BOUNDARY_REGEX = /,\s*$/u
const PARTICIPLE_ENDING_REGEX = /(ed|en)$/u

function isFiniteVerbCandidate(token: Token) {
  return (
    FINITE_AUXILIARY_WORDS.has(token.normalized) ||
    hasPosHint(token, 'modal') ||
    (hasPosHint(token, 'verb') && !hasPosHint(token, 'preposition'))
  )
}

function isLikelyFiniteSFormVerb(
  token: Token | undefined,
  previous: Token | undefined,
  next: Token | undefined,
) {
  if (
    !token ||
    !/^[a-z]+$/u.test(token.normalized) ||
    !token.normalized.endsWith('s') ||
    /ss$/u.test(token.normalized) ||
    hasPosHint(token, 'preposition') ||
    !previous ||
    !next
  ) {
    return false
  }

  if (
    !isSubjectStarter(previous) ||
    !next.posHints.some((hint) => OBJECT_OR_COMPLEMENT_HINTS.has(hint)) ||
    previous.normalized === 'and'
  ) {
    return false
  }

  return token.posHintConfidence !== 'low' || hasPosHint(token, 'verb')
}

function isSubjectStarter(token: Token) {
  if (CLAUSE_COORDINATORS.has(token.normalized)) {
    return false
  }

  return (
    hasPosHint(token, 'determiner') ||
    hasPosHint(token, 'noun') ||
    hasPosHint(token, 'pronoun')
  )
}

function isVerbLikeToken(token: Token) {
  return (
    FINITE_AUXILIARY_WORDS.has(token.normalized) ||
    hasPosHint(token, 'modal') ||
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'verb')
  )
}

function isAuxiliaryLeadingIntoMainVerb(tokens: Token[], index: number) {
  const token = tokens[index]
  const next = tokens[index + 1]

  if (
    !token ||
    !next ||
    !/^\s+$/u.test(token.trailingText) ||
    !(hasPosHint(token, 'modal') || hasPosHint(token, 'auxiliary'))
  ) {
    return false
  }

  return hasPosHint(next, 'verb') && !hasPosHint(next, 'preposition')
}

function isLikelyPostNominalModifier(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = tokens[index - 1]
  const next = tokens[index + 1]

  if (
    !token ||
    !previous ||
    !PARTICIPLE_ENDING_REGEX.test(token.normalized) ||
    !hasPosHint(previous, 'noun') ||
    !hasPosHint(token, 'verb')
  ) {
    return false
  }

  return (
    next !== undefined &&
    (hasPosHint(next, 'preposition') || hasPosHint(next, 'adverb'))
  )
}

function getPredicateCandidateScore(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = tokens[index - 1]
  const next = tokens[index + 1]

  if (
    !token ||
    (!isVerbLikeToken(token) &&
      !isLikelyFiniteSFormVerb(token, previous, next)) ||
    hasPosHint(token, 'preposition')
  ) {
    return Number.NEGATIVE_INFINITY
  }

  let score = 0

  if (
    FINITE_AUXILIARY_WORDS.has(token.normalized) ||
    hasPosHint(token, 'modal') ||
    hasPosHint(token, 'auxiliary')
  ) {
    score += 5
  }

  if (hasPosHint(token, 'verb')) {
    score += 3
  }

  if (isLikelyFiniteSFormVerb(token, previous, next)) {
    score += 3
  }

  if (token.posHintConfidence === 'high') {
    score += 2
  } else if (token.posHintConfidence === 'medium') {
    score += 1
  }

  if (previous && isSubjectStarter(previous)) {
    score += 2
  }

  if (previous?.normalized === 'to') {
    score -= 4
  }

  if (
    previous &&
    hasPosHint(previous, 'preposition') &&
    previous.normalized !== 'to'
  ) {
    score -= 5
  }

  if (
    next &&
    (hasPosHint(next, 'adverb') ||
      hasPosHint(next, 'preposition') ||
      hasPosHint(next, 'determiner') ||
      hasPosHint(next, 'pronoun') ||
      hasPosHint(next, 'noun'))
  ) {
    score += 1
  }

  if (isLikelyPostNominalModifier(tokens, index)) {
    score -= 4
  }

  if (isAuxiliaryLeadingIntoMainVerb(tokens, index)) {
    score -= 5
  }

  return score
}

function findNearbyFiniteVerbIndex(tokens: Token[], startIndex: number) {
  const maxIndex = Math.min(tokens.length - 1, startIndex + 5)

  for (let index = startIndex + 1; index <= maxIndex; index += 1) {
    const token = tokens[index]

    if (
      STRONG_CLAUSE_BOUNDARY_REGEX.test(token.leadingText) ||
      COMMA_BOUNDARY_REGEX.test(token.leadingText)
    ) {
      return null
    }

    if (
      isFiniteVerbCandidate(token) ||
      isLikelyFiniteSFormVerb(token, tokens[index - 1], tokens[index + 1])
    ) {
      return index
    }
  }

  return null
}

function hasEarlierPredicateCandidate(tokens: Token[], index: number) {
  if (index <= 0) {
    return false
  }

  return findPredicateIndex(tokens.slice(0, index)) !== null
}

function shouldStartClause(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = tokens[index - 1]

  if (!token || index === 0) {
    return false
  }

  if (
    CLAUSE_COORDINATORS.has(token.normalized) &&
    previous &&
    token.trailingText.trim().length === 0 &&
    isSubjectStarter(previous) &&
    findNearbyFiniteVerbIndex(tokens, index) !== null &&
    hasEarlierPredicateCandidate(tokens, index)
  ) {
    return true
  }

  if (STRONG_CLAUSE_BOUNDARY_REGEX.test(token.leadingText)) {
    return true
  }

  if (
    !COMMA_BOUNDARY_REGEX.test(token.leadingText) ||
    !isSubjectStarter(token)
  ) {
    return false
  }

  return findNearbyFiniteVerbIndex(tokens, index) !== null
}

function getClauseSubjectStartIndex(tokens: Token[], verbIndex: number | null) {
  const searchEnd = verbIndex ?? tokens.length

  for (let index = 0; index < searchEnd; index += 1) {
    if (isSubjectStarter(tokens[index])) {
      return index
    }
  }

  return null
}

function findPredicateIndex(tokens: Token[]) {
  if (tokens.length === 0) {
    return null
  }

  const initialFiniteVerbIndex = tokens.findIndex(isFiniteVerbCandidate)
  const initialVerbIndex = tokens.findIndex(isVerbLikeToken)
  const initialSearchEnd =
    initialFiniteVerbIndex >= 0
      ? initialFiniteVerbIndex
      : initialVerbIndex >= 0
        ? initialVerbIndex
        : tokens.length
  const subjectStartIndex = getClauseSubjectStartIndex(tokens, initialSearchEnd)
  const searchStart = subjectStartIndex ?? 0
  let bestIndex: number | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (let index = searchStart; index < tokens.length; index += 1) {
    const score = getPredicateCandidateScore(tokens, index)

    if (score <= 0) {
      continue
    }

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  if (bestIndex !== null) {
    return bestIndex
  }

  if (subjectStartIndex === null) {
    const firstToken = tokens[0]
    const infinitiveHead = tokens[1]

    if (firstToken && isVerbLikeToken(firstToken)) {
      return 0
    }

    if (
      firstToken?.normalized === 'to' &&
      infinitiveHead &&
      isVerbLikeToken(infinitiveHead)
    ) {
      return 1
    }
  }

  return initialFiniteVerbIndex >= 0
    ? initialFiniteVerbIndex
    : initialVerbIndex >= 0
      ? initialVerbIndex
      : null
}

function getClausePart(
  tokenIndex: number,
  subjectStartIndex: number | null,
  verbIndex: number | null,
): ClausePart {
  if (subjectStartIndex === null) {
    return verbIndex !== null && tokenIndex >= verbIndex
      ? 'predicate'
      : 'subject'
  }

  if (tokenIndex < subjectStartIndex) {
    return 'lead'
  }

  if (verbIndex === null || tokenIndex < verbIndex) {
    return 'subject'
  }

  return 'predicate'
}

function annotateClause(tokens: Token[], clauseIndex: number) {
  const verbIndex = findPredicateIndex(tokens)
  const subjectStartIndex = getClauseSubjectStartIndex(tokens, verbIndex)

  for (let index = 0; index < tokens.length; index += 1) {
    tokens[index].clauseIndex = clauseIndex
    tokens[index].clausePart = getClausePart(
      index,
      subjectStartIndex,
      verbIndex,
    )
  }
}

export function buildClauseGroups(
  text: string,
  sentenceRanges: SentenceRange[],
  sentenceTokens: Token[][],
) {
  const clauseRanges: ClauseRange[] = []
  const clauseTokens: Token[][] = []

  for (const sentenceRange of sentenceRanges) {
    const tokens = sentenceTokens[sentenceRange.index] ?? []

    if (tokens.length === 0) {
      continue
    }

    let clauseStartIndex = 0

    for (let index = 1; index < tokens.length; index += 1) {
      if (!shouldStartClause(tokens, index)) {
        continue
      }

      const currentClauseTokens = tokens.slice(clauseStartIndex, index)

      if (currentClauseTokens.length > 0) {
        const firstToken = currentClauseTokens[0]
        const lastToken = currentClauseTokens.at(-1) ?? firstToken
        const clauseIndex = clauseRanges.length

        annotateClause(currentClauseTokens, clauseIndex)
        clauseTokens.push(currentClauseTokens)
        clauseRanges.push({
          index: clauseIndex,
          sentenceIndex: sentenceRange.index,
          start: firstToken.offset,
          end: lastToken.offset + lastToken.length,
          text: text.slice(
            firstToken.offset,
            lastToken.offset + lastToken.length,
          ),
        })
      }

      clauseStartIndex = index
    }

    const trailingClauseTokens = tokens.slice(clauseStartIndex)

    if (trailingClauseTokens.length === 0) {
      continue
    }

    const firstToken = trailingClauseTokens[0]
    const lastToken = trailingClauseTokens.at(-1) ?? firstToken
    const clauseIndex = clauseRanges.length

    annotateClause(trailingClauseTokens, clauseIndex)
    clauseTokens.push(trailingClauseTokens)
    clauseRanges.push({
      index: clauseIndex,
      sentenceIndex: sentenceRange.index,
      start: firstToken.offset,
      end: lastToken.offset + lastToken.length,
      text: text.slice(firstToken.offset, lastToken.offset + lastToken.length),
    })
  }

  return {
    clauseRanges,
    clauseTokens,
  }
}
