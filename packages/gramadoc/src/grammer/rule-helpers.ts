import { hasPosHint, isContentWord } from './linguistics.js'
import {
  isLikelyFiniteVerbMorphology,
  isLikelyPastParticipleMorphology,
} from './morphology.js'
import { findPatternMatches } from './patterns.js'
import type {
  LexicalContextGuard,
  LexicalPhraseRuleResource,
  LexicalTokenRuleResource,
} from './resources/lexical-rules.js'
import type {
  PhraseHint,
  PhraseHintKind,
  RuleCheckContext,
  StructuredTextKind,
  StructuredTextSpan,
  TextBlockKind,
  Token,
} from './types.js'

const FINITE_AUXILIARY_WORDS = new Set([
  'am',
  'are',
  'did',
  'do',
  'does',
  'had',
  'has',
  'have',
  'is',
  'was',
  'were',
])

type PhraseGap = 'hyphen' | 'space'

export interface TokenPhrasePattern {
  phrase: string
}

export interface ParsedTokenPhrase {
  raw: string
  words: string[]
  gaps: PhraseGap[]
}

export interface TokenPhraseMatch<T> {
  entry: T
  tokens: Token[]
}

export interface TokenValueMatch<T> {
  entry: T
  token: Token
}

export function isWhitespaceOnly(text: string, start: number, end: number) {
  return /^\s+$/u.test(text.slice(start, end))
}

export function isSoftSeparatorOnly(text: string, start: number, end: number) {
  return /^[\s"'“”‘’]*$/u.test(text.slice(start, end))
}

export function hasClauseBoundary(text: string, start: number, end: number) {
  return /[.!?;:()[\]{}]/u.test(text.slice(start, end))
}

export function getSentenceTokens(
  context: RuleCheckContext,
  sentenceIndex: number,
) {
  return context.sentenceTokens[sentenceIndex] ?? []
}

export function getClauseTokens(
  context: RuleCheckContext,
  clauseIndex: number,
) {
  return context.clauseTokens[clauseIndex] ?? []
}

export function getSentenceClauseTokens(
  context: RuleCheckContext,
  sentenceIndex: number,
) {
  return context.clauseRanges
    .filter((clauseRange) => clauseRange.sentenceIndex === sentenceIndex)
    .map((clauseRange) => getClauseTokens(context, clauseRange.index))
}

export function getTokenClauseTokens(context: RuleCheckContext, token: Token) {
  return getClauseTokens(context, token.clauseIndex)
}

export function getClauseSubjectTokens(tokens: Token[]) {
  return tokens.filter((token) => token.clausePart === 'subject')
}

export function getClausePredicateTokens(tokens: Token[]) {
  return tokens.filter((token) => token.clausePart === 'predicate')
}

export function getSentenceClauses(
  context: RuleCheckContext,
  sentenceIndex: number,
) {
  return context.clauseRanges.filter(
    (clauseRange) => clauseRange.sentenceIndex === sentenceIndex,
  )
}

export function getPhraseHints(
  context: RuleCheckContext,
  options?: {
    kind?: PhraseHintKind
    sentenceIndex?: number
    clauseIndex?: number
  },
) {
  return context.phraseHints.filter((phraseHint) => {
    if (options?.kind && phraseHint.kind !== options.kind) {
      return false
    }

    if (
      options?.sentenceIndex !== undefined &&
      phraseHint.sentenceIndex !== options.sentenceIndex
    ) {
      return false
    }

    if (
      options?.clauseIndex !== undefined &&
      phraseHint.clauseIndex !== options.clauseIndex
    ) {
      return false
    }

    return true
  })
}

export function getSentencePhraseHints(
  context: RuleCheckContext,
  sentenceIndex: number,
  kind?: PhraseHintKind,
) {
  return getPhraseHints(context, { sentenceIndex, kind })
}

export function getTokenPhraseHints(
  context: RuleCheckContext,
  token: Token,
  kind?: PhraseHintKind,
) {
  return getPhraseHints(context, {
    sentenceIndex: token.sentenceIndex,
    kind,
  }).filter(
    (phraseHint) =>
      token.offset >= phraseHint.start &&
      token.offset + token.length <= phraseHint.end,
  )
}

export function getPhraseHintTokens(
  context: RuleCheckContext,
  phraseHint: PhraseHint,
) {
  return phraseHint.tokenIndexes
    .map((tokenIndex) => context.tokens[tokenIndex])
    .filter((token): token is Token => token !== undefined)
}

export function getTokensInRange(tokens: Token[], start: number, end: number) {
  return tokens.filter(
    (token) => token.offset >= start && token.offset + token.length <= end,
  )
}

export function getStructuredTextSpans(
  context: RuleCheckContext,
  options?: {
    kind?: StructuredTextKind
    subtype?: StructuredTextSpan['subtype']
  },
) {
  return context.structuredTextSpans.filter((span) => {
    if (options?.kind && span.kind !== options.kind) {
      return false
    }

    if (options?.subtype && span.subtype !== options.subtype) {
      return false
    }

    return true
  })
}

export function isOffsetInsideStructuredText(
  context: RuleCheckContext,
  offset: number,
  kinds?: StructuredTextKind[],
) {
  return context.structuredTextSpans.some(
    (span) =>
      (kinds === undefined || kinds.includes(span.kind)) &&
      offset >= span.start &&
      offset < span.end,
  )
}

export function nextTokenWithHints(
  tokens: Token[],
  startIndex: number,
  options?: {
    maxDistance?: number
    requiredHints?: Array<
      | 'adjective'
      | 'adverb'
      | 'auxiliary'
      | 'determiner'
      | 'modal'
      | 'noun'
      | 'preposition'
      | 'pronoun'
      | 'verb'
    >
    skipHints?: Array<
      | 'adjective'
      | 'adverb'
      | 'auxiliary'
      | 'determiner'
      | 'modal'
      | 'noun'
      | 'preposition'
      | 'pronoun'
      | 'verb'
    >
  },
) {
  const maxDistance = options?.maxDistance ?? tokens.length

  for (let index = startIndex + 1; index < tokens.length; index += 1) {
    if (index - startIndex > maxDistance) {
      return null
    }

    const token = tokens[index]

    if (
      options?.skipHints?.some((hint) => hasPosHint(token, hint)) &&
      (!options.requiredHints ||
        !options.requiredHints.some((hint) => hasPosHint(token, hint)))
    ) {
      continue
    }

    if (
      options?.requiredHints &&
      !options.requiredHints.some((hint) => hasPosHint(token, hint))
    ) {
      return null
    }

    return token
  }

  return null
}

export function isLikelyFiniteVerb(token: Token) {
  if (FINITE_AUXILIARY_WORDS.has(token.normalized)) {
    return true
  }

  return hasPosHint(token, 'verb') && isLikelyFiniteVerbMorphology(token)
}

export function isLikelyPastParticiple(token: Token) {
  return isLikelyPastParticipleMorphology(token)
}

export function getOpeningContentTokens(
  tokens: Token[],
  count = 2,
  options?: { allowDeterminers?: boolean },
) {
  const selected: Token[] = []

  for (const token of tokens) {
    const allowedDeterminer =
      options?.allowDeterminers && hasPosHint(token, 'determiner')

    if (!allowedDeterminer && !isContentWord(token)) {
      continue
    }

    selected.push(token)

    if (selected.length === count) {
      break
    }
  }

  return selected
}

export function parseTokenPhrase(phrase: string): ParsedTokenPhrase {
  const trimmedPhrase = phrase.trim().toLowerCase()
  const wordMatches = [...trimmedPhrase.matchAll(/[\p{L}\p{M}\p{N}']+/gu)]
  const words = wordMatches.map((match) => match[0])
  const gaps = words.slice(0, -1).map((_, index) => {
    const current = wordMatches[index]
    const next = wordMatches[index + 1]
    const gapText = trimmedPhrase.slice(
      (current?.index ?? 0) + (current?.[0].length ?? 0),
      next?.index ?? trimmedPhrase.length,
    )

    return gapText.includes('-') ? 'hyphen' : 'space'
  })

  return {
    raw: phrase,
    words,
    gaps,
  }
}

function matchesPhraseGap(gapText: string, gap: PhraseGap) {
  return gap === 'hyphen' ? /^\s*-\s*$/u.test(gapText) : /^\s+$/u.test(gapText)
}

function matchesParsedPhraseSeparators(
  tokens: Token[],
  parsedPhrase: ParsedTokenPhrase,
) {
  return tokens.every((token, index) => {
    if (index === 0) {
      return true
    }

    const previous = tokens[index - 1]

    return (
      previous?.sentenceIndex === token.sentenceIndex &&
      matchesPhraseGap(
        token.leadingText,
        parsedPhrase.gaps[index - 1] ?? 'space',
      )
    )
  })
}

function normalizeValues(values?: string[]) {
  return (
    values?.map((value) => value.trim().toLowerCase()).filter(Boolean) ?? []
  )
}

function getTokenBlockKind(
  context: RuleCheckContext,
  token: Token,
): TextBlockKind | null {
  if (token.blockIndex === null) {
    return null
  }

  return (
    context.blockRanges?.find(
      (blockRange) => blockRange.index === token.blockIndex,
    )?.kind ?? null
  )
}

function matchesContextValues(
  actual: string | undefined,
  candidates?: string[],
  selector: (value: string) => string = (value) => value,
) {
  if (!candidates?.length) {
    return true
  }

  if (!actual) {
    return false
  }

  const normalizedActual = selector(actual.trim().toLowerCase())

  return normalizeValues(candidates).includes(normalizedActual)
}

export function matchesLexicalContextGuard(
  context: RuleCheckContext,
  tokens: Token[],
  guard?: LexicalContextGuard,
) {
  if (!guard) {
    return true
  }

  const firstToken = tokens[0]
  const lastToken = tokens.at(-1) ?? firstToken

  if (!firstToken || !lastToken) {
    return false
  }

  if (guard.blockKinds?.length) {
    const blockKind = getTokenBlockKind(context, firstToken)

    if (!blockKind || !guard.blockKinds.includes(blockKind)) {
      return false
    }
  }

  const previousToken = context.tokens[firstToken.index - 1]
  const nextToken = context.tokens[lastToken.index + 1]

  return (
    matchesContextValues(
      previousToken?.normalized,
      guard.previousTokenValues,
    ) &&
    matchesContextValues(nextToken?.normalized, guard.nextTokenValues) &&
    matchesContextValues(previousToken?.morphology.lemma, guard.previousLemmas) &&
    matchesContextValues(nextToken?.morphology.lemma, guard.nextLemmas)
  )
}

export function findTokenPhraseMatches<T extends TokenPhrasePattern>(
  context: RuleCheckContext,
  entries: T[],
) {
  const candidates = entries.flatMap((entry, entryIndex) => {
    const parsed = parseTokenPhrase(entry.phrase)

    if (parsed.words.length === 0) {
      return []
    }

    return findPatternMatches(
      context,
      parsed.words.map((word) => ({ literal: word })),
    )
      .filter((match) => matchesParsedPhraseSeparators(match.tokens, parsed))
      .map((match) => ({
        entry,
        entryIndex,
        tokens: match.tokens,
      }))
  })

  candidates.sort((left, right) => {
    const leftStart = left.tokens[0]?.index ?? 0
    const rightStart = right.tokens[0]?.index ?? 0

    if (leftStart !== rightStart) {
      return leftStart - rightStart
    }

    return left.entryIndex - right.entryIndex
  })

  const matches: Array<TokenPhraseMatch<T>> = []
  let nextAvailableTokenIndex = 0

  for (const candidate of candidates) {
    const firstToken = candidate.tokens[0]
    const lastToken = candidate.tokens.at(-1)

    if (
      !firstToken ||
      !lastToken ||
      firstToken.index < nextAvailableTokenIndex
    ) {
      continue
    }

    matches.push({
      entry: candidate.entry,
      tokens: candidate.tokens,
    })
    nextAvailableTokenIndex = lastToken.index + 1
  }

  return matches
}

function isLexicalEntryEnabled(
  languageCode: RuleCheckContext['language']['code'],
  variants?: string[],
) {
  if (!variants?.length) {
    return true
  }

  return variants.includes(languageCode) || variants.includes('en')
}

export function findLexicalPhraseMatches<T extends LexicalPhraseRuleResource>(
  context: RuleCheckContext,
  entries: T[],
) {
  return findTokenPhraseMatches(context, entries).filter(
    ({ entry, tokens }) => {
      return (
        isLexicalEntryEnabled(
          context.language.code,
          entry.metadata.variantRestrictions,
        ) && matchesLexicalContextGuard(context, tokens, entry.guard)
      )
    },
  )
}

export function findLexicalTokenMatches<T extends LexicalTokenRuleResource>(
  context: RuleCheckContext,
  entries: T[],
) {
  const matches: Array<TokenValueMatch<T>> = []

  for (const token of context.tokens) {
    for (const entry of entries) {
      if (
        token.normalized !== entry.token.toLowerCase() ||
        !isLexicalEntryEnabled(
          context.language.code,
          entry.metadata.variantRestrictions,
        ) ||
        !matchesLexicalContextGuard(context, [token], entry.guard)
      ) {
        continue
      }

      matches.push({
        entry,
        token,
      })
    }
  }

  return matches
}
