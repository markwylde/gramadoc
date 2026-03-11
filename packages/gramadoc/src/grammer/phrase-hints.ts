import { hasPosHint } from './linguistics.js'
import { multiwordExpressionEntries } from './resources/multiword-expressions.js'
import { technicalCompoundEntries } from './resources/technical-compounds.js'
import type {
  AnnotationConfidence,
  PhraseHint,
  PhraseHintKind,
  Token,
} from './types.js'

function hasOnlyWhitespaceBetween(left: Token, right: Token) {
  return /^\s+$/u.test(left.trailingText) && /^\s*$/u.test(right.leadingText)
}

function getPhraseConfidence(tokens: Token[]): AnnotationConfidence {
  if (tokens.some((token) => token.posHintConfidence === 'low')) {
    return 'low'
  }

  if (tokens.some((token) => token.posHintConfidence === 'medium')) {
    return 'medium'
  }

  return 'high'
}

function createPhraseHint(
  kind: PhraseHintKind,
  tokens: Token[],
  sentenceIndex: number,
  options?: {
    label?: string
    source?: PhraseHint['source']
  },
): PhraseHint | null {
  const firstToken = tokens[0]
  const lastToken = tokens.at(-1)

  if (!firstToken || !lastToken) {
    return null
  }

  return {
    kind,
    sentenceIndex,
    clauseIndex: firstToken.clauseIndex,
    start: firstToken.offset,
    end: lastToken.offset + lastToken.length,
    tokenIndexes: tokens.map((token) => token.index),
    text: tokens.map((token) => token.value).join(' '),
    confidence: getPhraseConfidence(tokens),
    label: options?.label,
    source: options?.source ?? 'heuristic',
  }
}

function addPhraseHint(
  phraseHints: PhraseHint[],
  kind: PhraseHintKind,
  tokens: Token[],
  sentenceIndex: number,
  options?: {
    label?: string
    source?: PhraseHint['source']
  },
) {
  const phraseHint = createPhraseHint(kind, tokens, sentenceIndex, options)

  if (!phraseHint) {
    return
  }

  const key = [
    phraseHint.kind,
    phraseHint.start,
    phraseHint.end,
    phraseHint.label ?? '',
  ].join(':')

  if (
    phraseHints.some(
      (existingHint) =>
        [
          existingHint.kind,
          existingHint.start,
          existingHint.end,
          existingHint.label ?? '',
        ].join(':') === key,
    )
  ) {
    return
  }

  phraseHints.push(phraseHint)
}

function buildContiguousPhrases(options: {
  kind: PhraseHintKind
  sentenceIndex: number
  tokens: Token[]
  accepts: (token: Token) => boolean
  minLength?: number
  requires?: (tokens: Token[]) => boolean
}) {
  const {
    kind,
    sentenceIndex,
    tokens,
    accepts,
    minLength = 1,
    requires,
  } = options
  const phraseHints: PhraseHint[] = []
  let current: Token[] = []

  for (const token of tokens) {
    const previous = current.at(-1)

    if (
      accepts(token) &&
      (!previous || hasOnlyWhitespaceBetween(previous, token))
    ) {
      current.push(token)
      continue
    }

    if (
      current.length >= minLength &&
      (requires === undefined || requires(current))
    ) {
      const phraseHint = createPhraseHint(kind, current, sentenceIndex)

      if (phraseHint) {
        phraseHints.push(phraseHint)
      }
    }

    current =
      accepts(token) && minLength <= 1 ? [token] : accepts(token) ? [token] : []
  }

  if (
    current.length >= minLength &&
    (requires === undefined || requires(current))
  ) {
    const phraseHint = createPhraseHint(kind, current, sentenceIndex)

    if (phraseHint) {
      phraseHints.push(phraseHint)
    }
  }

  return phraseHints
}

function isNounPhraseToken(token: Token) {
  if (
    hasPosHint(token, 'preposition') ||
    hasPosHint(token, 'pronoun') ||
    hasPosHint(token, 'modal') ||
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'adverb')
  ) {
    return false
  }

  return (
    hasPosHint(token, 'determiner') ||
    hasPosHint(token, 'adjective') ||
    hasPosHint(token, 'noun')
  )
}

function isVerbPhraseToken(token: Token) {
  return (
    token.clausePart === 'predicate' &&
    (hasPosHint(token, 'verb') ||
      hasPosHint(token, 'auxiliary') ||
      hasPosHint(token, 'modal') ||
      hasPosHint(token, 'adverb'))
  )
}

function parsePhraseWords(phrase: string) {
  return [...phrase.toLowerCase().matchAll(/[\p{L}\p{M}\p{N}']+/gu)].map(
    (match) => match[0],
  )
}

function findPhraseMatches(tokens: Token[], phrase: string) {
  const words = parsePhraseWords(phrase)
  const matches: Token[][] = []

  if (words.length === 0) {
    return matches
  }

  for (let index = 0; index <= tokens.length - words.length; index += 1) {
    const candidate = tokens.slice(index, index + words.length)

    if (
      candidate.every(
        (token, tokenIndex) => token.normalized === words[tokenIndex],
      ) &&
      candidate.every((token, tokenIndex) => {
        if (tokenIndex === 0) {
          return true
        }

        const previous = candidate[tokenIndex - 1]
        return Boolean(previous) && hasOnlyWhitespaceBetween(previous, token)
      })
    ) {
      matches.push(candidate)
    }
  }

  return matches
}

function buildRecognizedMultiwordHints(tokens: Token[], sentenceIndex: number) {
  const phraseHints: PhraseHint[] = []

  for (const entry of technicalCompoundEntries) {
    for (const matchTokens of findPhraseMatches(tokens, entry.phrase)) {
      addPhraseHint(
        phraseHints,
        'multiword-expression',
        matchTokens,
        sentenceIndex,
        {
          label: entry.label,
          source: 'lexicon',
        },
      )
      addPhraseHint(phraseHints, 'noun-phrase', matchTokens, sentenceIndex, {
        label: entry.label,
        source: 'lexicon',
      })
    }
  }

  for (const entry of multiwordExpressionEntries) {
    for (const matchTokens of findPhraseMatches(tokens, entry.phrase)) {
      addPhraseHint(
        phraseHints,
        'multiword-expression',
        matchTokens,
        sentenceIndex,
        {
          label: entry.label,
          source: 'lexicon',
        },
      )

      if (entry.kind !== 'multiword-expression') {
        addPhraseHint(phraseHints, entry.kind, matchTokens, sentenceIndex, {
          label: entry.label,
          source: 'lexicon',
        })
      }
    }
  }

  return phraseHints
}

export function buildPhraseHints(options: {
  sentenceTokens?: Token[][]
  clauseTokens?: Token[][]
  text?: string
}) {
  const sentenceTokens = options.sentenceTokens ?? []
  const phraseHints: PhraseHint[] = []

  for (const tokens of sentenceTokens) {
    const sentenceIndex = tokens[0]?.sentenceIndex

    if (sentenceIndex === undefined) {
      continue
    }

    phraseHints.push(...buildRecognizedMultiwordHints(tokens, sentenceIndex))

    phraseHints.push(
      ...buildContiguousPhrases({
        kind: 'noun-phrase',
        sentenceIndex,
        tokens,
        minLength: 2,
        accepts: isNounPhraseToken,
        requires: (phraseTokens) =>
          phraseTokens.some((token) => hasPosHint(token, 'noun')),
      }),
    )

    phraseHints.push(
      ...buildContiguousPhrases({
        kind: 'verb-phrase',
        sentenceIndex,
        tokens,
        minLength: 1,
        accepts: isVerbPhraseToken,
        requires: (phraseTokens) =>
          phraseTokens.some(
            (token) =>
              hasPosHint(token, 'verb') ||
              hasPosHint(token, 'auxiliary') ||
              hasPosHint(token, 'modal'),
          ),
      }),
    )

    phraseHints.push(
      ...buildContiguousPhrases({
        kind: 'adverb-phrase',
        sentenceIndex,
        tokens,
        minLength: 1,
        accepts: (token) => hasPosHint(token, 'adverb'),
      }),
    )
  }

  for (const hint of [...phraseHints]) {
    if (hint.kind !== 'noun-phrase') {
      continue
    }

    const phraseTokens = hint.tokenIndexes
      .map((tokenIndex) =>
        sentenceTokens[hint.sentenceIndex]?.find(
          (token) => token.index === tokenIndex,
        ),
      )
      .filter((token): token is Token => token !== undefined)
    const firstToken = phraseTokens[0]
    const previousToken = firstToken
      ? sentenceTokens[hint.sentenceIndex]?.find(
          (token) => token.index === firstToken.index - 1,
        )
      : undefined

    if (!previousToken || !hasPosHint(previousToken, 'preposition')) {
      continue
    }

    const phraseHint = createPhraseHint(
      'prepositional-phrase',
      [previousToken, ...phraseTokens],
      hint.sentenceIndex,
    )

    if (phraseHint) {
      phraseHints.push(phraseHint)
    }
  }

  for (const tokens of sentenceTokens) {
    for (let index = 0; index < tokens.length - 1; index += 1) {
      const token = tokens[index]

      if (!hasPosHint(token, 'preposition')) {
        continue
      }

      const followingTokens: Token[] = []

      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor]
        const previous = followingTokens.at(-1) ?? token

        if (
          !candidate ||
          !isNounPhraseToken(candidate) ||
          !hasOnlyWhitespaceBetween(previous, candidate)
        ) {
          break
        }

        followingTokens.push(candidate)
      }

      if (followingTokens.length === 0) {
        continue
      }

      const phraseHint = createPhraseHint(
        'prepositional-phrase',
        [token, ...followingTokens],
        token.sentenceIndex,
      )

      if (phraseHint) {
        phraseHints.push(phraseHint)
      }
    }
  }

  return phraseHints.sort((left, right) => {
    if (left.sentenceIndex !== right.sentenceIndex) {
      return left.sentenceIndex - right.sentenceIndex
    }

    if (left.start !== right.start) {
      return left.start - right.start
    }

    return left.end - right.end
  })
}
