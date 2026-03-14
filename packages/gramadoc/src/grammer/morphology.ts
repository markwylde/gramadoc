import { isKnownDictionaryWord } from './rules/spelling-orthography/basic-spelling/helpers.js'
import type {
  AnnotationConfidence,
  MorphologyProvenance,
  Token,
  TokenMorphology,
  TokenPosHint,
  VerbForm,
  VerbMorphology,
} from './types.js'

type ContractionAnnotation = {
  lemma: string
  hints: TokenPosHint[]
}

type IrregularVerbSpec = {
  past?: string[]
  pastParticiple?: string[]
  thirdPersonSingular?: string[]
  presentParticiple?: string[]
}

type SurfaceReading = {
  lemma: string
  form: VerbForm
}

type BaseCandidate = {
  base: string
  confidence: AnnotationConfidence
  provenance: MorphologyProvenance
  supported: boolean
}

const VOWEL_REGEX = /[aeiou]/u
const CONSONANT_REGEX = /[bcdfghjklmnpqrstvwxyz]/u

export const PARTICIPIAL_ADJECTIVES = new Set([
  'broken',
  'configured',
  'disabled',
  'done',
  'enabled',
  'failing',
  'finished',
  'stuck',
])

export const S_FORM_MORPHOLOGY_BLOCKLIST = new Set([
  'analysis',
  'news',
  'series',
  'species',
  'status',
])

export const CONTRACTION_ANNOTATIONS: Record<string, ContractionAnnotation> = {
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

const IRREGULAR_VERBS: Record<string, IrregularVerbSpec> = {
  be: {
    past: ['was', 'were'],
    pastParticiple: ['been'],
    thirdPersonSingular: ['is'],
    presentParticiple: ['being'],
  },
  begin: {
    past: ['began'],
    pastParticiple: ['begun'],
    thirdPersonSingular: ['begins'],
  },
  break: {
    past: ['broke'],
    pastParticiple: ['broken'],
    thirdPersonSingular: ['breaks'],
  },
  come: {
    past: ['came'],
    pastParticiple: ['come'],
    thirdPersonSingular: ['comes'],
  },
  do: {
    past: ['did'],
    pastParticiple: ['done'],
    thirdPersonSingular: ['does'],
  },
  drive: {
    past: ['drove'],
    pastParticiple: ['driven'],
    thirdPersonSingular: ['drives'],
  },
  eat: {
    past: ['ate'],
    pastParticiple: ['eaten'],
    thirdPersonSingular: ['eats'],
  },
  find: {
    past: ['found'],
    pastParticiple: ['found'],
    thirdPersonSingular: ['finds'],
  },
  forget: {
    past: ['forgot'],
    pastParticiple: ['forgotten'],
    thirdPersonSingular: ['forgets'],
  },
  go: {
    past: ['went'],
    pastParticiple: ['gone'],
    thirdPersonSingular: ['goes'],
  },
  have: {
    past: ['had'],
    pastParticiple: ['had'],
    thirdPersonSingular: ['has'],
  },
  leave: {
    past: ['left'],
    pastParticiple: ['left'],
    thirdPersonSingular: ['leaves'],
  },
  make: {
    past: ['made'],
    pastParticiple: ['made'],
    thirdPersonSingular: ['makes'],
  },
  read: {
    past: ['read'],
    pastParticiple: ['read'],
    thirdPersonSingular: ['reads'],
  },
  run: {
    past: ['ran'],
    pastParticiple: ['run'],
    thirdPersonSingular: ['runs'],
  },
  say: {
    past: ['said'],
    pastParticiple: ['said'],
    thirdPersonSingular: ['says'],
  },
  see: {
    past: ['saw'],
    pastParticiple: ['seen'],
    thirdPersonSingular: ['sees'],
  },
  speak: {
    past: ['spoke'],
    pastParticiple: ['spoken'],
    thirdPersonSingular: ['speaks'],
  },
  stick: {
    past: ['stuck'],
    pastParticiple: ['stuck'],
    thirdPersonSingular: ['sticks'],
  },
  take: {
    past: ['took'],
    pastParticiple: ['taken'],
    thirdPersonSingular: ['takes'],
  },
  write: {
    past: ['wrote'],
    pastParticiple: ['written'],
    thirdPersonSingular: ['writes'],
  },
}

export const KNOWN_BASE_VERBS = new Set([
  'accept',
  'affect',
  'agree',
  'analyze',
  'announce',
  'appear',
  'approve',
  'argue',
  'arrive',
  'attempt',
  'begin',
  'believe',
  'belong',
  'blend',
  'block',
  'build',
  'care',
  'catalog',
  'catalogue',
  'caution',
  'claim',
  'change',
  'check',
  'clean',
  'clarify',
  'close',
  'complain',
  'connect',
  'consider',
  'contain',
  'continue',
  'construct',
  'cover',
  'cut',
  'date',
  'deploy',
  'decide',
  'depend',
  'develop',
  'discuss',
  'effect',
  'explain',
  'expect',
  'face',
  'finish',
  'fix',
  'forget',
  'follow',
  'get',
  'go',
  'grab',
  'grow',
  'help',
  'highlight',
  'hope',
  'improve',
  'include',
  'increase',
  'involve',
  'issue',
  'join',
  'keep',
  'know',
  'launch',
  'learn',
  'leave',
  'listen',
  'live',
  'look',
  'love',
  'make',
  'miss',
  'move',
  'need',
  'note',
  'open',
  'organize',
  'participate',
  'perform',
  'pick',
  'plan',
  'practice',
  'practise',
  'prefer',
  'publish',
  'raise',
  'read',
  'reach',
  'reduce',
  'remain',
  'remind',
  'remember',
  'replace',
  'report',
  'return',
  'round',
  'run',
  'say',
  'scale',
  'seem',
  'ship',
  'stay',
  'stand',
  'start',
  'study',
  'support',
  'take',
  'talk',
  'think',
  'understand',
  'urge',
  'try',
  'update',
  'use',
  'warn',
  'walk',
  'want',
  'work',
  'wrap',
  'write',
])

for (const lemma of Object.keys(IRREGULAR_VERBS)) {
  KNOWN_BASE_VERBS.add(lemma)
}

const IRREGULAR_SURFACE_LOOKUP = new Map<string, SurfaceReading[]>()

for (const [lemma, spec] of Object.entries(IRREGULAR_VERBS)) {
  for (const value of spec.past ?? []) {
    const existing = IRREGULAR_SURFACE_LOOKUP.get(value) ?? []
    existing.push({ lemma, form: 'past' })
    IRREGULAR_SURFACE_LOOKUP.set(value, existing)
  }

  for (const value of spec.pastParticiple ?? []) {
    const existing = IRREGULAR_SURFACE_LOOKUP.get(value) ?? []
    existing.push({ lemma, form: 'past-participle' })
    IRREGULAR_SURFACE_LOOKUP.set(value, existing)
  }

  for (const value of spec.thirdPersonSingular ?? []) {
    const existing = IRREGULAR_SURFACE_LOOKUP.get(value) ?? []
    existing.push({ lemma, form: 'third-person-singular' })
    IRREGULAR_SURFACE_LOOKUP.set(value, existing)
  }

  for (const value of spec.presentParticiple ?? []) {
    const existing = IRREGULAR_SURFACE_LOOKUP.get(value) ?? []
    existing.push({ lemma, form: 'present-participle' })
    IRREGULAR_SURFACE_LOOKUP.set(value, existing)
  }
}

function dedupe<T>(values: T[]) {
  return [...new Set(values)]
}

function isAlphabeticWord(normalized: string) {
  return /^[a-z]+$/u.test(normalized)
}

export function isLikelyVerbDerivation(normalized: string) {
  return (
    /(?:ize|ise|ify)$/u.test(normalized) ||
    (normalized.length > 5 && /ate$/u.test(normalized))
  )
}

function isKnownBaseVerb(base: string) {
  return KNOWN_BASE_VERBS.has(base) || isLikelyVerbDerivation(base)
}

function buildVerbMorphology(
  options: Partial<VerbMorphology> & Pick<VerbMorphology, 'isCandidate'>,
): VerbMorphology {
  return {
    form: null,
    base: null,
    candidates: [],
    provenance: null,
    confidence: 'low',
    isAmbiguous: false,
    isNonBaseForm: false,
    canBeBase: false,
    canBeThirdPersonSingular: false,
    canBePast: false,
    canBePastParticiple: false,
    canBePresentParticiple: false,
    isLexicalized: false,
    ...options,
  }
}

function buildUnsupportedMorphology(normalized: string): TokenMorphology {
  return {
    lemma: normalized,
    lemmaAlternates: [],
    provenance: 'identity',
    confidence: isKnownDictionaryWord(normalized) ? 'medium' : 'low',
    isAmbiguous: false,
    ambiguityTags: [],
    isDictionaryWord: isKnownDictionaryWord(normalized),
    verb: buildVerbMorphology({
      isCandidate: false,
    }),
  }
}

function rankBaseCandidates(
  candidates: string[],
  options: {
    allowDictionarySupport: boolean
  },
) {
  const uniqueCandidates = dedupe(candidates).filter(
    (candidate) => candidate.length > 1 && isAlphabeticWord(candidate),
  )
  const supportedCandidates: BaseCandidate[] = uniqueCandidates.map((base) => {
    if (KNOWN_BASE_VERBS.has(base)) {
      return {
        base,
        confidence: 'high',
        provenance: 'regular',
        supported: true,
      }
    }

    if (options.allowDictionarySupport && isKnownDictionaryWord(base)) {
      return {
        base,
        confidence: 'medium',
        provenance: 'regular',
        supported: true,
      }
    }

    if (isLikelyVerbDerivation(base)) {
      return {
        base,
        confidence: 'low',
        provenance: 'heuristic',
        supported: true,
      }
    }

    return {
      base,
      confidence: 'low',
      provenance: 'heuristic',
      supported: false,
    }
  })

  supportedCandidates.sort((left, right) => {
    const rank = { high: 3, medium: 2, low: 1 }
    const confidenceDelta = rank[right.confidence] - rank[left.confidence]

    if (confidenceDelta !== 0) {
      return confidenceDelta
    }

    return right.base.length - left.base.length
  })

  return supportedCandidates
}

function getRegularPastCandidates(normalized: string) {
  if (normalized.length <= 3 || !normalized.endsWith('ed')) {
    return []
  }

  const candidates: string[] = []

  if (normalized.endsWith('ied') && normalized.length > 4) {
    candidates.push(`${normalized.slice(0, -3)}y`)
    candidates.push(normalized.slice(0, -1))
  }

  if (
    /([b-df-hj-np-tv-z])\1ed$/u.test(normalized) &&
    !/(need|seed|feed)ed$/u.test(normalized)
  ) {
    candidates.push(normalized.slice(0, -3))
  }

  candidates.push(normalized.slice(0, -1))
  candidates.push(normalized.slice(0, -2))

  return candidates
}

function getRegularPresentParticipleCandidates(normalized: string) {
  if (normalized.length <= 4 || !normalized.endsWith('ing')) {
    return []
  }

  const stripped = normalized.slice(0, -3)
  const candidates = [stripped, `${stripped}e`]

  if (normalized.endsWith('ying') && normalized.length > 5) {
    candidates.push(`${normalized.slice(0, -4)}ie`)
  }

  if (/([b-df-hj-np-tv-z])\1ing$/u.test(normalized)) {
    candidates.push(stripped.slice(0, -1))
  }

  return candidates
}

function getRegularThirdPersonCandidates(normalized: string) {
  if (
    !isAlphabeticWord(normalized) ||
    !normalized.endsWith('s') ||
    normalized.length <= 3 ||
    /(?:ss|us|is)$/u.test(normalized) ||
    S_FORM_MORPHOLOGY_BLOCKLIST.has(normalized)
  ) {
    return []
  }

  const candidates: string[] = []

  if (normalized.endsWith('ies') && normalized.length > 4) {
    candidates.push(`${normalized.slice(0, -3)}y`)
  }

  if (/(ches|shes|sses|xes|zes|oes)$/u.test(normalized)) {
    candidates.push(normalized.slice(0, -2))
  }

  candidates.push(normalized.slice(0, -1))

  return candidates
}

function createRegularVerbMorphology(options: {
  normalized: string
  form: VerbForm
  candidates: string[]
  ambiguityTags?: string[]
  allowDictionarySupport?: boolean
}) {
  const rankedCandidates = rankBaseCandidates(options.candidates, {
    allowDictionarySupport: options.allowDictionarySupport ?? true,
  })
  const primary = rankedCandidates[0]

  if (!primary || !primary.supported) {
    return null
  }

  const baseCandidates = rankedCandidates
    .filter((candidate) => candidate.supported)
    .map((candidate) => candidate.base)

  return {
    lemma: primary.base,
    lemmaAlternates: baseCandidates.slice(1),
    provenance:
      baseCandidates.length > 1 ? ('ambiguous' as const) : primary.provenance,
    confidence:
      baseCandidates.length > 1 ? ('medium' as const) : primary.confidence,
    isAmbiguous: baseCandidates.length > 1,
    ambiguityTags:
      baseCandidates.length > 1
        ? dedupe(['multiple-base-candidates', ...(options.ambiguityTags ?? [])])
        : (options.ambiguityTags ?? []),
    isDictionaryWord: isKnownDictionaryWord(options.normalized),
    verb: buildVerbMorphology({
      isCandidate: true,
      form: options.form,
      base: primary.base,
      candidates: baseCandidates,
      provenance:
        baseCandidates.length > 1 ? ('ambiguous' as const) : primary.provenance,
      confidence:
        baseCandidates.length > 1 ? ('medium' as const) : primary.confidence,
      isAmbiguous: baseCandidates.length > 1,
      isNonBaseForm: true,
      canBeBase: false,
      canBeThirdPersonSingular: options.form === 'third-person-singular',
      canBePast: options.form === 'past',
      canBePastParticiple: options.form === 'past-participle',
      canBePresentParticiple: options.form === 'present-participle',
      isLexicalized: PARTICIPIAL_ADJECTIVES.has(options.normalized),
    }),
  } satisfies TokenMorphology
}

export function analyzeTokenMorphology(normalized: string): TokenMorphology {
  const contraction = CONTRACTION_ANNOTATIONS[normalized]

  if (contraction) {
    return {
      lemma: contraction.lemma,
      lemmaAlternates: [],
      provenance: 'contraction',
      confidence: 'high',
      isAmbiguous: false,
      ambiguityTags: [],
      isDictionaryWord: false,
      verb: buildVerbMorphology({
        isCandidate: contraction.hints.includes('verb'),
      }),
    }
  }

  const irregularReadings = IRREGULAR_SURFACE_LOOKUP.get(normalized)

  if (irregularReadings?.length) {
    const uniqueLemmas = dedupe(
      irregularReadings.map((reading) => reading.lemma),
    )
    const forms = dedupe(irregularReadings.map((reading) => reading.form))
    const primaryLemma = uniqueLemmas[0] ?? normalized
    const form = forms.length === 1 ? forms[0] : null
    const canBeBase = KNOWN_BASE_VERBS.has(normalized)

    return {
      lemma: primaryLemma,
      lemmaAlternates: uniqueLemmas.slice(1),
      provenance:
        uniqueLemmas.length > 1 || forms.length > 1 ? 'ambiguous' : 'irregular',
      confidence:
        uniqueLemmas.length > 1 || forms.length > 1 ? 'medium' : 'high',
      isAmbiguous: uniqueLemmas.length > 1 || forms.length > 1,
      ambiguityTags:
        uniqueLemmas.length > 1 || forms.length > 1
          ? ['irregular-surface-ambiguity']
          : [],
      isDictionaryWord: isKnownDictionaryWord(normalized),
      verb: buildVerbMorphology({
        isCandidate: true,
        form,
        base: primaryLemma,
        candidates: uniqueLemmas,
        provenance:
          uniqueLemmas.length > 1 || forms.length > 1
            ? 'ambiguous'
            : 'irregular',
        confidence:
          uniqueLemmas.length > 1 || forms.length > 1 ? 'medium' : 'high',
        isAmbiguous: uniqueLemmas.length > 1 || forms.length > 1,
        isNonBaseForm: !canBeBase,
        canBeBase,
        canBeThirdPersonSingular: forms.includes('third-person-singular'),
        canBePast: forms.includes('past'),
        canBePastParticiple: forms.includes('past-participle'),
        canBePresentParticiple: forms.includes('present-participle'),
        isLexicalized: PARTICIPIAL_ADJECTIVES.has(normalized),
      }),
    }
  }

  if (isKnownBaseVerb(normalized)) {
    return {
      lemma: normalized,
      lemmaAlternates: [],
      provenance: KNOWN_BASE_VERBS.has(normalized) ? 'identity' : 'heuristic',
      confidence: KNOWN_BASE_VERBS.has(normalized) ? 'high' : 'low',
      isAmbiguous: false,
      ambiguityTags: [],
      isDictionaryWord: isKnownDictionaryWord(normalized),
      verb: buildVerbMorphology({
        isCandidate: true,
        form: 'base',
        base: normalized,
        candidates: [normalized],
        provenance: KNOWN_BASE_VERBS.has(normalized) ? 'identity' : 'heuristic',
        confidence: KNOWN_BASE_VERBS.has(normalized) ? 'high' : 'low',
        canBeBase: true,
        isLexicalized: PARTICIPIAL_ADJECTIVES.has(normalized),
      }),
    }
  }

  const regularPastAnalysis = createRegularVerbMorphology({
    normalized,
    form: 'past',
    candidates: getRegularPastCandidates(normalized),
  })

  if (regularPastAnalysis) {
    regularPastAnalysis.verb.canBePastParticiple = true

    return regularPastAnalysis
  }

  const regularIngAnalysis = createRegularVerbMorphology({
    normalized,
    form: 'present-participle',
    candidates: getRegularPresentParticipleCandidates(normalized),
  })

  if (regularIngAnalysis) {
    return regularIngAnalysis
  }

  const regularThirdPersonAnalysis = createRegularVerbMorphology({
    normalized,
    form: 'third-person-singular',
    candidates: getRegularThirdPersonCandidates(normalized),
    allowDictionarySupport: false,
  })

  if (regularThirdPersonAnalysis) {
    return regularThirdPersonAnalysis
  }

  return buildUnsupportedMorphology(normalized)
}

export function getPreferredLemma(normalized: string) {
  return analyzeTokenMorphology(normalized).lemma
}

export function getBaseVerbCandidate(
  token: Pick<Token, 'morphology' | 'normalized'>,
) {
  const { verb } = token.morphology

  if (
    !verb.isCandidate ||
    !verb.base ||
    !verb.isNonBaseForm ||
    verb.isAmbiguous ||
    verb.confidence === 'low'
  ) {
    return null
  }

  return verb.base === token.normalized ? null : verb.base
}

type ContextToken = Pick<Token, 'morphology' | 'normalized' | 'posHints'>

function hasVerbContextSignal(token: ContextToken) {
  return token.morphology.verb.isCandidate || token.posHints.includes('verb')
}

function isAuxiliaryContextLeader(token: ContextToken) {
  return (
    token.posHints.includes('auxiliary') ||
    token.posHints.includes('modal') ||
    [
      'can',
      'could',
      'may',
      'might',
      'must',
      'shall',
      'should',
      'will',
      'would',
    ].includes(token.normalized) ||
    ['did', 'do', 'does', 'had', 'has', 'have'].includes(token.normalized)
  )
}

export function isLikelyVerbInInfinitiveContext(options: {
  leader?: Pick<Token, 'normalized'> | null
  candidate?: ContextToken | null
}) {
  const { leader, candidate } = options

  if (!leader || !candidate || leader.normalized !== 'to') {
    return false
  }

  return (
    hasVerbContextSignal(candidate) &&
    !candidate.posHints.includes('preposition')
  )
}

export function isLikelyVerbInAuxiliaryContext(options: {
  leader?: ContextToken | null
  candidate?: ContextToken | null
}) {
  const { leader, candidate } = options

  if (!leader || !candidate || !isAuxiliaryContextLeader(leader)) {
    return false
  }

  return (
    hasVerbContextSignal(candidate) &&
    !candidate.posHints.includes('preposition')
  )
}

export function getBaseVerbCandidateInInfinitiveContext(options: {
  leader?: Pick<Token, 'normalized'> | null
  candidate?: ContextToken | null
}) {
  const { candidate } = options

  if (!candidate || !isLikelyVerbInInfinitiveContext(options)) {
    return null
  }

  return getBaseVerbCandidate(candidate)
}

export function getBaseVerbCandidateInAuxiliaryContext(options: {
  leader?: ContextToken | null
  candidate?: ContextToken | null
}) {
  const { candidate } = options

  if (!candidate || !isLikelyVerbInAuxiliaryContext(options)) {
    return null
  }

  return getBaseVerbCandidate(candidate)
}

export function getPastParticipleCandidate(
  token: Pick<Token, 'morphology' | 'normalized'>,
) {
  const { verb } = token.morphology

  if (
    !verb.isCandidate ||
    !verb.base ||
    verb.isAmbiguous ||
    !verb.canBePast ||
    verb.canBePastParticiple
  ) {
    return null
  }

  const spec = IRREGULAR_VERBS[verb.base]
  const preferred = spec?.pastParticiple?.[0]

  return preferred && preferred !== token.normalized ? preferred : null
}

export function getPastTenseCandidate(
  token: Pick<Token, 'morphology' | 'normalized'>,
) {
  const { verb } = token.morphology

  if (
    !verb.isCandidate ||
    !verb.base ||
    verb.isAmbiguous ||
    !verb.canBePastParticiple ||
    verb.canBePast
  ) {
    return null
  }

  const spec = IRREGULAR_VERBS[verb.base]
  const preferred = spec?.past?.[0]

  return preferred && preferred !== token.normalized ? preferred : null
}

export function getPastParticipleCandidateInPerfectContext(options: {
  leader?: ContextToken | null
  candidate?: ContextToken | null
}) {
  const { leader, candidate } = options

  if (
    !leader ||
    !candidate ||
    !['had', 'has', 'have'].includes(leader.normalized) ||
    !isLikelyVerbInAuxiliaryContext({ leader, candidate })
  ) {
    return null
  }

  return getPastParticipleCandidate(candidate)
}

export function isGerundLikeToken(token: Pick<Token, 'morphology'>) {
  return token.morphology.verb.canBePresentParticiple
}

export function isLikelyFiniteVerbMorphology(
  token: Pick<Token, 'normalized' | 'morphology'>,
) {
  const { verb } = token.morphology

  if (!verb.isCandidate) {
    return false
  }

  if (verb.canBeThirdPersonSingular || verb.canBePast) {
    return true
  }

  return (
    verb.canBeBase && !verb.canBePresentParticiple && !verb.canBePastParticiple
  )
}

export function isLikelyPastParticipleMorphology(
  token: Pick<Token, 'morphology'>,
) {
  return token.morphology.verb.canBePastParticiple
}

export function toPluralBaseVerb(value: string) {
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

export function toThirdPersonSingularVerb(value: string) {
  if (value.endsWith('y') && value.length > 1 && !/[aeiou]y$/u.test(value)) {
    return `${value.slice(0, -1)}ies`
  }

  if (/(?:ch|sh|s|x|z|o)$/u.test(value)) {
    return `${value}es`
  }

  return `${value}s`
}

export function toPresentParticiple(word: string) {
  if (word.endsWith('ie')) {
    return `${word.slice(0, -2)}ying`
  }

  if (word.endsWith('e') && !/(?:ee|oe|ye)$/u.test(word)) {
    return `${word.slice(0, -1)}ing`
  }

  if (
    word.length <= 5 &&
    CONSONANT_REGEX.test(word[word.length - 1] ?? '') &&
    !/[wxy]/u.test(word[word.length - 1] ?? '') &&
    VOWEL_REGEX.test(word[word.length - 2] ?? '') &&
    CONSONANT_REGEX.test(word[word.length - 3] ?? '')
  ) {
    return `${word}${word[word.length - 1]}ing`
  }

  return `${word}ing`
}
