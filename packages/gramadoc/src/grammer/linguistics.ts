import type {
  AnnotationConfidence,
  StyleRepetitionPosBucket,
  Token,
  TokenPosEvidenceSource,
  TokenPosHint,
  TokenPosReading,
} from './types.js'
import {
  analyzeTokenMorphology,
  CONTRACTION_ANNOTATIONS,
  getPreferredLemma,
  isLikelyVerbDerivation,
  KNOWN_BASE_VERBS,
  PARTICIPIAL_ADJECTIVES,
  S_FORM_MORPHOLOGY_BLOCKLIST,
} from './morphology.js'

const ADJECTIVES = new Set([
  'alive',
  'available',
  'aware',
  'broken',
  'busy',
  'available',
  'clear',
  'close',
  'configured',
  'done',
  'different',
  'fast',
  'failing',
  'happy',
  'hard',
  'helpful',
  'interested',
  'late',
  'live',
  'long',
  'many',
  'much',
  'offline',
  'okay',
  'online',
  'ready',
  'right',
  'round',
  'responsible',
  'safe',
  'similar',
  'short',
  'sorry',
  'stuck',
  'useful',
  'well',
  'welcome',
  'wrong',
])
const ADVERBS = new Set([
  'already',
  'also',
  'close',
  'deeply',
  'definitely',
  'directly',
  'early',
  'fast',
  'hard',
  'just',
  'likely',
  'mainly',
  'only',
  'probably',
  'quickly',
  'really',
  'right',
  'round',
  'safely',
  'still',
  'very',
  'well',
])
const AUXILIARIES = new Set([
  'am',
  'are',
  'be',
  'been',
  'being',
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
const DETERMINERS = new Set([
  'a',
  'an',
  'another',
  'any',
  'each',
  'every',
  'few',
  'fewer',
  'her',
  'his',
  'its',
  'less',
  'many',
  'much',
  'my',
  'our',
  'some',
  'that',
  'the',
  'their',
  'these',
  'this',
  'those',
  'your',
])
const MODALS = new Set([
  'can',
  'could',
  'may',
  'might',
  'must',
  'shall',
  'should',
  'will',
  'would',
])
const PREPOSITIONS = new Set([
  'about',
  'after',
  'against',
  'around',
  'as',
  'at',
  'before',
  'between',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'over',
  'through',
  'to',
  'under',
  'with',
  'without',
])
const PRONOUNS = new Set([
  'he',
  'her',
  'herself',
  'him',
  'himself',
  'i',
  'it',
  'itself',
  'me',
  'myself',
  'our',
  'ourselves',
  'she',
  'them',
  'themselves',
  'they',
  'us',
  'we',
  'you',
  'yourself',
])
const PLURAL_PRONOUNS = new Set([
  'they',
  'them',
  'these',
  'those',
  'we',
  'us',
  'you',
])
const SINGULAR_PRONOUNS = new Set([
  'each',
  'everybody',
  'everyone',
  'he',
  'her',
  'herself',
  'him',
  'himself',
  'i',
  'it',
  'itself',
  'me',
  'myself',
  'she',
  'that',
  'this',
])
const SINGULAR_NOUN_EXCEPTIONS = new Set([
  'analysis',
  'news',
  'series',
  'species',
  'status',
])
const OPEN_CLASS_HINTS = new Set<TokenPosHint>([
  'adjective',
  'adverb',
  'noun',
  'verb',
])

interface TokenAnnotation {
  morphology: Token['morphology']
  lexicalPosHints: TokenPosHint[]
  morphologyPosHints: TokenPosHint[]
  fallbackPosHints: TokenPosHint[]
  posReadings: TokenPosReading[]
  posHints: TokenPosHint[]
  posHintConfidence: AnnotationConfidence
  usedFallbackPosGuess: boolean
  isPosAmbiguous: boolean
}

function dedupeHints(hints: TokenPosHint[]) {
  return [...new Set(hints)]
}

function getReadingConfidence(
  sources: TokenPosEvidenceSource[],
): AnnotationConfidence {
  if (sources.includes('fallback')) {
    return 'low'
  }

  if (
    sources.includes('closed-class-lexicon') ||
    sources.includes('open-class-lexicon')
  ) {
    return 'high'
  }

  if (sources.includes('contextual-disambiguation')) {
    return 'medium'
  }

  return 'medium'
}

function buildPosReadings(options: {
  lexicalPosHints: TokenPosHint[]
  morphologyPosHints: TokenPosHint[]
  fallbackPosHints: TokenPosHint[]
  closedClassHints: TokenPosHint[]
}) {
  const readingSources = new Map<TokenPosHint, Set<TokenPosEvidenceSource>>()

  const addReadings = (
    hints: TokenPosHint[],
    source: TokenPosEvidenceSource,
  ) => {
    for (const hint of hints) {
      if (!readingSources.has(hint)) {
        readingSources.set(hint, new Set())
      }

      readingSources.get(hint)?.add(source)
    }
  }

  addReadings(options.closedClassHints, 'closed-class-lexicon')
  addReadings(
    options.lexicalPosHints.filter(
      (hint) => !options.closedClassHints.includes(hint),
    ),
    'open-class-lexicon',
  )
  addReadings(options.morphologyPosHints, 'morphology')
  addReadings(options.fallbackPosHints, 'fallback')

  return [...readingSources.entries()].map(([pos, sources]) => {
    const dedupedSources = [...sources]

    return {
      pos,
      sources: dedupedSources,
      confidence: getReadingConfidence(dedupedSources),
    }
  })
}

function getMorphologyHints(normalized: string) {
  const morphology = analyzeTokenMorphology(normalized)
  const hints: TokenPosHint[] = []

  if (/(ly)$/u.test(normalized)) {
    hints.push('adverb')
  }

  if (/(ous|ive|al|ic|able|ible|ful|less)$/u.test(normalized)) {
    hints.push('adjective')
  }

  if (/(tion|sion|ment|ness|ity|ship|ance|ence)$/u.test(normalized)) {
    hints.push('noun')
  }

  const hasStrongVerbLemma =
    KNOWN_BASE_VERBS.has(morphology.lemma) ||
    isLikelyVerbDerivation(morphology.lemma) ||
    morphology.provenance === 'irregular' ||
    morphology.provenance === 'contraction'

  if (
    morphology.verb.isCandidate &&
    (morphology.verb.canBePast ||
      morphology.verb.canBePastParticiple ||
      morphology.verb.canBePresentParticiple ||
      (morphology.verb.canBeBase && hasStrongVerbLemma) ||
      (morphology.verb.canBeThirdPersonSingular && hasStrongVerbLemma))
  ) {
    hints.push('verb')
  }

  if (
    normalized.endsWith('s') &&
    normalized.length > 3 &&
    !/(ss|us|is)$/u.test(normalized) &&
    !S_FORM_MORPHOLOGY_BLOCKLIST.has(normalized)
  ) {
    hints.push('noun')
  }

  return hints
}

export function getLemma(normalized: string) {
  return getPreferredLemma(normalized)
}

export function getLemmaAnnotation(normalized: string) {
  const morphology = analyzeTokenMorphology(normalized)

  return {
    lemma: morphology.lemma,
    source: morphology.provenance,
  }
}

export function getTokenPosHints(normalized: string) {
  return getTokenAnnotation(normalized).posHints
}

function getPosHintConfidence(options: {
  hints: TokenPosHint[]
  usedClosedClassLexicon: boolean
  usedOpenClassLexicon: boolean
  usedMorphology: boolean
  usedFallbackPosGuess: boolean
}) {
  const {
    hints,
    usedClosedClassLexicon,
    usedOpenClassLexicon,
    usedMorphology,
    usedFallbackPosGuess,
  } = options

  const openClassHintCount = hints.filter((hint) =>
    OPEN_CLASS_HINTS.has(hint),
  ).length

  if (usedFallbackPosGuess) {
    return 'low'
  }

  if (usedClosedClassLexicon) {
    return 'high'
  }

  if (usedOpenClassLexicon && openClassHintCount <= 1) {
    return 'high'
  }

  if (usedOpenClassLexicon || usedMorphology) {
    return openClassHintCount > 1 ? 'medium' : 'medium'
  }

  return 'low'
}

export function getTokenAnnotation(normalized: string): TokenAnnotation {
  const lexicalPosHints: TokenPosHint[] = []
  const closedClassHints: TokenPosHint[] = []
  let usedClosedClassLexicon = false
  let usedOpenClassLexicon = false
  const morphologyPosHints: TokenPosHint[] = []
  const contractionAnnotation = CONTRACTION_ANNOTATIONS[normalized]
  const morphology = analyzeTokenMorphology(normalized)

  if (contractionAnnotation) {
    lexicalPosHints.push(...contractionAnnotation.hints)
    closedClassHints.push(...contractionAnnotation.hints)
    usedClosedClassLexicon = true
  }

  if (PRONOUNS.has(normalized)) {
    lexicalPosHints.push('pronoun')
    closedClassHints.push('pronoun')
    usedClosedClassLexicon = true
  }

  if (DETERMINERS.has(normalized)) {
    lexicalPosHints.push('determiner')
    closedClassHints.push('determiner')
    usedClosedClassLexicon = true
  }

  if (PREPOSITIONS.has(normalized)) {
    lexicalPosHints.push('preposition')
    closedClassHints.push('preposition')
    usedClosedClassLexicon = true
  }

  if (MODALS.has(normalized)) {
    lexicalPosHints.push('modal', 'verb')
    closedClassHints.push('modal', 'verb')
    usedClosedClassLexicon = true
  }

  if (AUXILIARIES.has(normalized)) {
    lexicalPosHints.push('auxiliary', 'verb')
    closedClassHints.push('auxiliary', 'verb')
    usedClosedClassLexicon = true
  }

  if (ADVERBS.has(normalized)) {
    lexicalPosHints.push('adverb')
    usedOpenClassLexicon = true
  }

  if (ADJECTIVES.has(normalized)) {
    lexicalPosHints.push('adjective')
    usedOpenClassLexicon = true
  }

  if (PARTICIPIAL_ADJECTIVES.has(normalized)) {
    lexicalPosHints.push('adjective')
    usedOpenClassLexicon = true
  }

  if (
    KNOWN_BASE_VERBS.has(normalized) ||
    KNOWN_BASE_VERBS.has(morphology.lemma)
  ) {
    lexicalPosHints.push('verb')
    usedOpenClassLexicon = true
  }

  const morphologyHints = getMorphologyHints(normalized)

  if (morphologyHints.length > 0) {
    morphologyPosHints.push(...morphologyHints)
  }

  const dedupedLexicalPosHints = dedupeHints(lexicalPosHints)
  const dedupedMorphologyPosHints = dedupeHints(morphologyPosHints)
  const fallbackPosHints =
    dedupedLexicalPosHints.length === 0 &&
    dedupedMorphologyPosHints.length === 0 &&
    !normalized.includes("'") &&
    !isLikelyVerbDerivation(normalized)
      ? (['noun'] as TokenPosHint[])
      : []
  const effectivePosHints = dedupeHints([
    ...dedupedLexicalPosHints,
    ...dedupedMorphologyPosHints,
    ...fallbackPosHints,
  ])
  const usedFallbackPosGuess = fallbackPosHints.length > 0
  const openClassHints = effectivePosHints.filter((hint) =>
    OPEN_CLASS_HINTS.has(hint),
  )
  const posReadings = buildPosReadings({
    lexicalPosHints: dedupedLexicalPosHints,
    morphologyPosHints: dedupedMorphologyPosHints,
    fallbackPosHints,
    closedClassHints: dedupeHints(closedClassHints),
  })

  return {
    morphology,
    lexicalPosHints: dedupedLexicalPosHints,
    morphologyPosHints: dedupedMorphologyPosHints,
    fallbackPosHints,
    posReadings,
    posHints: effectivePosHints,
    posHintConfidence: getPosHintConfidence({
      hints: effectivePosHints,
      usedClosedClassLexicon,
      usedOpenClassLexicon,
      usedMorphology: dedupedMorphologyPosHints.length > 0,
      usedFallbackPosGuess,
    }),
    usedFallbackPosGuess,
    isPosAmbiguous: openClassHints.length > 1,
  }
}

export function isPluralLike(normalized: string) {
  if (PLURAL_PRONOUNS.has(normalized)) {
    return true
  }

  if (
    SINGULAR_PRONOUNS.has(normalized) ||
    SINGULAR_NOUN_EXCEPTIONS.has(normalized)
  ) {
    return false
  }

  return normalized.endsWith('s') && !/(ss|us|is)$/u.test(normalized)
}

export function hasPosHint(token: Token, hint: TokenPosHint) {
  return token.posHints.includes(hint)
}

export function getPosReading(token: Token, hint: TokenPosHint) {
  return token.posReadings.find((reading) => reading.pos === hint) ?? null
}

export function hasFallbackOnlyPosHint(token: Token, hint: TokenPosHint) {
  const reading = getPosReading(token, hint)

  return reading?.sources.includes('fallback') && reading.sources.length === 1
}

export function hasStrongPosHint(token: Token, hint: TokenPosHint) {
  const reading = getPosReading(token, hint)

  if (!reading) {
    return false
  }

  return reading.sources.some(
    (source) =>
      source === 'closed-class-lexicon' ||
      source === 'open-class-lexicon' ||
      source === 'contextual-disambiguation' ||
      source === 'morphology',
  )
}

export function isContentWord(token: Token) {
  return (
    hasPosHint(token, 'noun') ||
    hasPosHint(token, 'verb') ||
    hasPosHint(token, 'adjective') ||
    hasPosHint(token, 'adverb')
  )
}

export function getStyleRepetitionPosBucket(
  token: Token,
): StyleRepetitionPosBucket | null {
  if (
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'determiner') ||
    hasPosHint(token, 'modal') ||
    hasPosHint(token, 'preposition') ||
    hasPosHint(token, 'pronoun')
  ) {
    return null
  }

  const styleHints = ['adjective', 'noun', 'verb'].filter((hint) =>
    hasPosHint(token, hint as StyleRepetitionPosBucket),
  ) as StyleRepetitionPosBucket[]

  if (
    hasPosHint(token, 'adjective') &&
    /(?:ous|ive|al|ic|able|ible|ful|less)$/u.test(token.normalized)
  ) {
    return 'adjective'
  }

  if (
    hasPosHint(token, 'verb') &&
    (KNOWN_BASE_VERBS.has(token.morphology.lemma) ||
      token.morphology.verb.isCandidate)
  ) {
    return 'verb'
  }

  if (styleHints.length !== 1) {
    return null
  }

  if (styleHints[0] === 'noun') {
    return 'noun'
  }

  if (token.posHintConfidence === 'low') {
    return null
  }

  return styleHints[0]
}
