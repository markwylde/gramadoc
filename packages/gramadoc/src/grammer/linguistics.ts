import type {
  AnnotationConfidence,
  LemmaSource,
  StyleRepetitionPosBucket,
  Token,
  TokenPosEvidenceSource,
  TokenPosHint,
  TokenPosReading,
} from './types.js'

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
const PARTICIPIAL_ADJECTIVES = new Set([
  'broken',
  'configured',
  'disabled',
  'done',
  'enabled',
  'failing',
  'finished',
  'stuck',
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
const VERBS = new Set([
  'accept',
  'affect',
  'agree',
  'analyze',
  'approve',
  'arrive',
  'begin',
  'build',
  'care',
  'change',
  'check',
  'clarify',
  'close',
  'deploy',
  'discuss',
  'depend',
  'effect',
  'explain',
  'finish',
  'fix',
  'go',
  'help',
  'improve',
  'involve',
  'join',
  'keep',
  'know',
  'launch',
  'leave',
  'listen',
  'live',
  'make',
  'miss',
  'need',
  'note',
  'organize',
  'participate',
  'plan',
  'perform',
  'practice',
  'practise',
  'publish',
  'read',
  'remind',
  'return',
  'round',
  'run',
  'scale',
  'seem',
  'ship',
  'stand',
  'support',
  'try',
  'use',
  'walk',
  'work',
  'wrap',
  'write',
])
const CONTRACTION_ANNOTATIONS: Record<
  string,
  {
    lemma: string
    hints: TokenPosHint[]
  }
> = {
  "aren't": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "can't": { lemma: 'can', hints: ['modal', 'verb'] },
  "could've": { lemma: 'could', hints: ['modal', 'verb'] },
  "couldn't": { lemma: 'could', hints: ['modal', 'verb'] },
  "didn't": { lemma: 'do', hints: ['auxiliary', 'verb'] },
  "doesn't": { lemma: 'do', hints: ['auxiliary', 'verb'] },
  "don't": { lemma: 'do', hints: ['auxiliary', 'verb'] },
  "hasn't": { lemma: 'have', hints: ['auxiliary', 'verb'] },
  "haven't": { lemma: 'have', hints: ['auxiliary', 'verb'] },
  "hadn't": { lemma: 'have', hints: ['auxiliary', 'verb'] },
  "he's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "he'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "how's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "i'm": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "i'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "i've": { lemma: 'have', hints: ['auxiliary', 'verb'] },
  "isn't": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "it'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "it's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "let's": { lemma: 'let', hints: ['verb'] },
  "might've": { lemma: 'might', hints: ['modal', 'verb'] },
  "mightn't": { lemma: 'might', hints: ['modal', 'verb'] },
  "must've": { lemma: 'must', hints: ['modal', 'verb'] },
  "mustn't": { lemma: 'must', hints: ['modal', 'verb'] },
  "needn't": { lemma: 'need', hints: ['modal', 'verb'] },
  "shan't": { lemma: 'shall', hints: ['modal', 'verb'] },
  "she's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "she'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "should've": { lemma: 'should', hints: ['modal', 'verb'] },
  "shouldn't": { lemma: 'should', hints: ['modal', 'verb'] },
  "that's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "that'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "there's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "there'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "they'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "they're": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "they've": { lemma: 'have', hints: ['auxiliary', 'verb'] },
  "wasn't": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "we'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "we're": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "we've": { lemma: 'have', hints: ['auxiliary', 'verb'] },
  "weren't": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "when's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "what's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "where's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "who'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "who's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "why's": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "won't": { lemma: 'will', hints: ['modal', 'verb'] },
  "would've": { lemma: 'would', hints: ['modal', 'verb'] },
  "wouldn't": { lemma: 'would', hints: ['modal', 'verb'] },
  "you'll": { lemma: 'will', hints: ['modal', 'verb'] },
  "you're": { lemma: 'be', hints: ['auxiliary', 'verb'] },
  "you've": { lemma: 'have', hints: ['auxiliary', 'verb'] },
}
const IRREGULAR_LEMMAS: Record<string, string> = {
  am: 'be',
  are: 'be',
  been: 'be',
  did: 'do',
  does: 'do',
  gone: 'go',
  had: 'have',
  has: 'have',
  is: 'be',
  was: 'be',
  were: 'be',
  went: 'go',
  wrote: 'write',
  written: 'write',
}
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
const SINGULAR_NOUN_EXCEPTIONS = new Set(['analysis', 'news'])
const S_FORM_MORPHOLOGY_BLOCKLIST = new Set([
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
  lemma: string
  lemmaSource: LemmaSource
  lexicalPosHints: TokenPosHint[]
  morphologyPosHints: TokenPosHint[]
  fallbackPosHints: TokenPosHint[]
  posReadings: TokenPosReading[]
  posHints: TokenPosHint[]
  posHintConfidence: AnnotationConfidence
  usedFallbackPosGuess: boolean
  isOpenClassUnknown: boolean
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

function isLikelyVerbDerivation(normalized: string) {
  return (
    /(?:ize|ise|ify)$/u.test(normalized) ||
    (normalized.length > 5 && /ate$/u.test(normalized))
  )
}

function isLikelyThirdPersonSingularSForm(normalized: string) {
  if (
    !/^[a-z]+$/u.test(normalized) ||
    !normalized.endsWith('s') ||
    normalized.length <= 3 ||
    /(?:ss|us|is)$/u.test(normalized) ||
    S_FORM_MORPHOLOGY_BLOCKLIST.has(normalized)
  ) {
    return false
  }

  const base =
    normalized.endsWith('ies') && normalized.length > 4
      ? `${normalized.slice(0, -3)}y`
      : /(ches|shes|sses|xes|zes|oes)$/u.test(normalized)
        ? normalized.slice(0, -2)
        : normalized.slice(0, -1)

  return VERBS.has(base) || isLikelyVerbDerivation(base)
}

function getMorphologyHints(normalized: string) {
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

  if (/(ing|ed)$/u.test(normalized) || isLikelyVerbDerivation(normalized)) {
    hints.push('verb')
  }

  if (isLikelyThirdPersonSingularSForm(normalized)) {
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
  if (IRREGULAR_LEMMAS[normalized]) {
    return IRREGULAR_LEMMAS[normalized]
  }

  if (normalized.endsWith('ies') && normalized.length > 4) {
    return `${normalized.slice(0, -3)}y`
  }

  if (normalized.endsWith('ing') && normalized.length > 5) {
    return normalized.slice(0, -3)
  }

  if (normalized.endsWith('ed') && normalized.length > 4) {
    return normalized.slice(0, -2)
  }

  if (
    normalized.endsWith('s') &&
    normalized.length > 3 &&
    !normalized.endsWith('ss')
  ) {
    return normalized.slice(0, -1)
  }

  return normalized
}

export function getLemmaAnnotation(normalized: string) {
  if (CONTRACTION_ANNOTATIONS[normalized]) {
    return {
      lemma: CONTRACTION_ANNOTATIONS[normalized].lemma,
      source: 'irregular' as const,
    }
  }

  if (IRREGULAR_LEMMAS[normalized]) {
    return {
      lemma: IRREGULAR_LEMMAS[normalized],
      source: 'irregular' as const,
    }
  }

  const heuristicLemma = getLemma(normalized)

  return {
    lemma: heuristicLemma,
    source:
      heuristicLemma === normalized
        ? ('identity' as const)
        : ('heuristic' as const),
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

  const lemmaAnnotation = getLemmaAnnotation(normalized)

  if (VERBS.has(normalized) || VERBS.has(lemmaAnnotation.lemma)) {
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
    lemma: lemmaAnnotation.lemma,
    lemmaSource: lemmaAnnotation.source,
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
    isOpenClassUnknown: usedFallbackPosGuess,
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
    (VERBS.has(token.lemma) || /(ed|ing)$/u.test(token.normalized))
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
