import { hasPosHint } from './linguistics.js'
import { isLikelyFiniteVerbMorphology } from './morphology.js'
import type { Token } from './types.js'

export function isLikelyContentClauseSubjectToken(token: Token | undefined) {
  if (!token) {
    return false
  }

  return (
    hasPosHint(token, 'pronoun') ||
    hasPosHint(token, 'noun') ||
    hasPosHint(token, 'determiner')
  )
}

export function isLikelyContentClausePredicateToken(
  token: Token | undefined,
  options?: {
    predicateWords?: ReadonlySet<string>
  },
) {
  if (!token || hasPosHint(token, 'preposition')) {
    return false
  }

  return (
    !!options?.predicateWords?.has(token.normalized) ||
    hasPosHint(token, 'verb') ||
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'modal') ||
    isLikelyFiniteVerbMorphology(token)
  )
}

export function isLikelyContentClauseEmbeddingTrigger(
  token: Token | undefined,
) {
  if (!token || hasPosHint(token, 'preposition')) {
    return false
  }

  return (
    hasPosHint(token, 'verb') ||
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'modal') ||
    isLikelyFiniteVerbMorphology(token)
  )
}

export function hasEmbeddedContentClauseShape(
  next: Token | undefined,
  following: Token | undefined,
  options?: {
    predicateWords?: ReadonlySet<string>
  },
) {
  return (
    isLikelyContentClauseSubjectToken(next) &&
    isLikelyContentClausePredicateToken(following, options)
  )
}

function hasDefaultWhitespaceBridge(left: Token, right: Token) {
  return /^\s+$/u.test(left.trailingText) && /^\s*$/u.test(right.leadingText)
}

function hasSentenceLevelPredicateAfterThatClause(
  tokens: Token[],
  index: number,
  options?: {
    predicateWords?: ReadonlySet<string>
  },
) {
  const current = tokens[index]

  if (!current) {
    return false
  }

  for (let lookahead = index + 3; lookahead < tokens.length; lookahead += 1) {
    const candidate = tokens[lookahead]

    if (!candidate || candidate.sentenceIndex !== current.sentenceIndex) {
      break
    }

    if (isLikelyContentClausePredicateToken(candidate, options)) {
      return true
    }
  }

  return false
}

export function isClauseIntroducingThat(
  tokens: Token[],
  index: number,
  options?: {
    predicateWords?: ReadonlySet<string>
    isLikelyAntecedent?: (token: Token | undefined) => boolean
    hasWhitespaceBridge?: (left: Token, right: Token) => boolean
  },
) {
  const current = tokens[index]
  const previous = tokens[index - 1]
  const next = tokens[index + 1]
  const following = tokens[index + 2]

  if (
    current?.normalized !== 'that' ||
    !next ||
    next.sentenceIndex !== current.sentenceIndex
  ) {
    return false
  }

  if (!isLikelyContentClauseSubjectToken(next)) {
    return false
  }

  if (current.isSentenceStart) {
    return hasSentenceLevelPredicateAfterThatClause(tokens, index, {
      predicateWords: options?.predicateWords,
    })
  }

  if (!previous || previous.sentenceIndex !== current.sentenceIndex) {
    return false
  }

  const hasWhitespaceBridge =
    options?.hasWhitespaceBridge ?? hasDefaultWhitespaceBridge

  if (!hasWhitespaceBridge(previous, current)) {
    return false
  }

  if (isLikelyContentClauseEmbeddingTrigger(previous)) {
    return true
  }

  return (
    !!following &&
    following.sentenceIndex === current.sentenceIndex &&
    !!options?.isLikelyAntecedent?.(previous) &&
    hasEmbeddedContentClauseShape(next, following, {
      predicateWords: options?.predicateWords,
    })
  )
}
