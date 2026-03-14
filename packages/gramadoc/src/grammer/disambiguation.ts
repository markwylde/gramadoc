import {
  isLikelyPastParticipleMorphology,
  isLikelyVerbInAuxiliaryContext,
  isLikelyVerbInInfinitiveContext,
} from './morphology.js'
import type {
  AnnotationConfidence,
  Token,
  TokenPosEvidenceSource,
  TokenPosHint,
} from './types.js'

const SUBJECT_STARTER_HINTS = new Set<TokenPosHint>([
  'determiner',
  'noun',
  'pronoun',
])
const BE_PREDICATE_HINTS: TokenPosHint[] = ['adjective', 'adverb']
const MODIFIER_HINTS = new Set<TokenPosHint>(['adjective', 'adverb'])
const BARE_VERB_HINTS = new Set<TokenPosHint>(['verb'])
const SAFE_SINGULAR_VERB_FORMS = new Set([
  'involves',
  'performs',
  'reads',
  'scales',
  'works',
])
const BE_AUXILIARY_FORMS = new Set([
  'am',
  'are',
  'be',
  'been',
  'being',
  'is',
  'was',
  'were',
])
const CONTRACTED_BE_FORMS = new Set([
  "he's",
  "how's",
  "i'm",
  "it's",
  "she's",
  "that's",
  "there's",
  "they're",
  "we're",
  "what's",
  "who's",
  "you're",
])

function upsertPosReading(
  token: Token,
  pos: TokenPosHint,
  source: TokenPosEvidenceSource,
  confidence: AnnotationConfidence,
) {
  const existingReading = token.posReadings.find(
    (reading) => reading.pos === pos,
  )

  if (!existingReading) {
    token.posReadings.push({
      pos,
      sources: [source],
      confidence,
    })
    return
  }

  if (!existingReading.sources.includes(source)) {
    existingReading.sources.push(source)
  }
  existingReading.confidence =
    existingReading.confidence === 'high' || confidence === 'high'
      ? 'high'
      : existingReading.confidence === 'medium' || confidence === 'medium'
        ? 'medium'
        : 'low'
}

function dedupeHints(hints: TokenPosHint[]) {
  return [...new Set(hints)]
}

function hasAnyHint(token: Token, hints: Set<TokenPosHint>) {
  return token.posHints.some((hint) => hints.has(hint))
}

function canResolveTo(token: Token, target: TokenPosHint) {
  return (
    token.lexicalPosHints.includes(target) ||
    token.morphologyPosHints.includes(target) ||
    token.fallbackPosHints.includes(target) ||
    token.contextualPosHints.includes(target)
  )
}

function applyResolution(
  token: Token,
  hints: TokenPosHint[],
  provenance: string,
  confidence: AnnotationConfidence,
) {
  token.contextualPosHints = dedupeHints([
    ...token.contextualPosHints,
    ...hints,
  ])
  token.posHints = dedupeHints(hints)
  token.posHintConfidence = confidence
  token.isPosAmbiguous = token.posHints.length > 1
  token.disambiguationProvenance.push(provenance)
  for (const hint of hints) {
    upsertPosReading(token, hint, 'contextual-disambiguation', confidence)
  }
}

function getPreviousToken(tokens: Token[], index: number) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor]

    if (token) {
      return token
    }
  }

  return null
}

function getNextToken(tokens: Token[], index: number) {
  for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor]

    if (token) {
      return token
    }
  }

  return null
}

function disambiguateVerbWell(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = getPreviousToken(tokens, index)

  if (
    token?.normalized !== 'well' ||
    !canResolveTo(token, 'adverb') ||
    !previous ||
    !previous.posHints.includes('verb')
  ) {
    return
  }

  applyResolution(
    token,
    ['adverb'],
    'verb-plus-well',
    previous.posHintConfidence === 'high' ? 'high' : 'medium',
  )
}

function disambiguateBePredicate(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = getPreviousToken(tokens, index)
  const next = getNextToken(tokens, index)

  if (
    !token ||
    !previous ||
    (previous.morphology.lemma !== 'be' &&
      !CONTRACTED_BE_FORMS.has(previous.normalized)) ||
    (!BE_AUXILIARY_FORMS.has(previous.normalized) &&
      !CONTRACTED_BE_FORMS.has(previous.normalized)) ||
    next?.posHints.includes('noun')
  ) {
    return
  }

  const preferredHints = BE_PREDICATE_HINTS.filter((hint) =>
    canResolveTo(token, hint),
  )

  if (preferredHints.length === 0) {
    return
  }

  applyResolution(
    token,
    preferredHints,
    'be-plus-predicate',
    previous.posHintConfidence === 'high' ? 'high' : 'medium',
  )
}

function disambiguateBeParticiplePredicate(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = getPreviousToken(tokens, index)

  if (
    !token ||
    !previous ||
    (previous.morphology.lemma !== 'be' &&
      !CONTRACTED_BE_FORMS.has(previous.normalized)) ||
    (!BE_AUXILIARY_FORMS.has(previous.normalized) &&
      !CONTRACTED_BE_FORMS.has(previous.normalized)) ||
    !canResolveTo(token, 'adjective')
  ) {
    return
  }

  if (!isLikelyPastParticipleMorphology(token)) {
    return
  }

  applyResolution(
    token,
    ['adjective'],
    'be-plus-participle-predicate',
    previous.posHintConfidence === 'high' ? 'high' : 'medium',
  )
}

function disambiguateModalOrAuxiliaryVerb(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = getPreviousToken(tokens, index)

  if (
    !token ||
    !previous ||
    !canResolveTo(token, 'verb') ||
    !isLikelyVerbInAuxiliaryContext({
      leader: previous,
      candidate: token,
    })
  ) {
    return
  }

  applyResolution(token, ['verb'], 'auxiliary-or-modal-plus-verb', 'high')
}

function disambiguateToVerb(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = getPreviousToken(tokens, index)

  if (
    !token ||
    !previous ||
    !canResolveTo(token, 'verb') ||
    !isLikelyVerbInInfinitiveContext({
      leader: previous,
      candidate: token,
    })
  ) {
    return
  }

  applyResolution(token, ['verb'], 'to-plus-verb', 'high')
}

function disambiguateVeryModifier(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = getPreviousToken(tokens, index)

  if (!token || !previous || previous.normalized !== 'very') {
    return
  }

  const hints = token.posHints.filter((hint) => MODIFIER_HINTS.has(hint))

  if (hints.length === 0) {
    return
  }

  applyResolution(token, hints, 'very-plus-modifier', 'high')
}

function disambiguateSubjectVerbS(tokens: Token[], index: number) {
  const token = tokens[index]
  const previous = getPreviousToken(tokens, index)
  const next = getNextToken(tokens, index)

  if (
    !token ||
    !previous ||
    !token.morphology.verb.canBeThirdPersonSingular ||
    !SAFE_SINGULAR_VERB_FORMS.has(token.normalized) ||
    !canResolveTo(token, 'verb') ||
    !hasAnyHint(previous, SUBJECT_STARTER_HINTS) ||
    previous.posHints.includes('determiner') ||
    (next?.posHints.includes('preposition') ?? false) ||
    (next?.posHints.includes('determiner') ?? false)
  ) {
    return
  }

  applyResolution(token, [...BARE_VERB_HINTS], 'subject-plus-s-form', 'medium')
}

export function applyContextualPosDisambiguation(sentenceTokens: Token[][]) {
  for (const tokens of sentenceTokens) {
    for (let index = 0; index < tokens.length; index += 1) {
      disambiguateBePredicate(tokens, index)
      disambiguateBeParticiplePredicate(tokens, index)
      disambiguateModalOrAuxiliaryVerb(tokens, index)
      disambiguateToVerb(tokens, index)
      disambiguateVeryModifier(tokens, index)
      disambiguateSubjectVerbS(tokens, index)
      disambiguateVerbWell(tokens, index)
    }
  }
}
