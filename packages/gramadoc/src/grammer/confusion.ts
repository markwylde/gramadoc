import {
  getPosReading,
  hasFallbackOnlyPosHint,
  hasPosHint,
} from './linguistics.js'
import type {
  ContextualConfusionCandidate,
  ContextualConfusionCue,
  ContextualConfusionNgram,
  ContextualConfusionSet,
  ContextualConfusionSurfaceCue,
} from './resources/confusion-sets.js'
import { variantPairs } from './resources/variant-mappings.js'
import type { RuleCheckContext, Token } from './types.js'

export interface ConfusionScoreEvidence {
  score: number
  candidate: string
  source:
    | 'case'
    | 'clause'
    | 'collocation'
    | 'language'
    | 'lemma'
    | 'ngram'
    | 'pos-contextual'
    | 'pos-fallback'
    | 'pos-lexical'
    | 'pos-morphology'
    | 'token'
    | 'variant'
  relativeTokenIndex?: -2 | -1 | 1 | 2
}

export interface RankedConfusionCandidate {
  candidate: ContextualConfusionCandidate
  score: number
  evidence: ConfusionScoreEvidence[]
}

type DocumentVariantPreference = 'uk' | 'us'

const US_TO_UK = new Map(variantPairs.map((pair) => [pair.us, pair.uk]))
const UK_TO_US = new Map(variantPairs.map((pair) => [pair.uk, pair.us]))
const documentVariantPreferenceCache = new WeakMap<
  RuleCheckContext,
  DocumentVariantPreference | null
>()

function getRelativeToken(
  tokens: Token[],
  index: number,
  relativeTokenIndex: -2 | -1 | 1 | 2,
) {
  return tokens[index + relativeTokenIndex]
}

function getCueSource(
  cue: ContextualConfusionCue,
): ConfusionScoreEvidence['source'] {
  if (cue.clauseParts?.length) {
    return 'clause'
  }

  if (cue.lemmas?.length) {
    return 'lemma'
  }

  return 'token'
}

function getTokenSurfaceCase(token: Token): 'all-caps' | 'title-case' | null {
  const letters = token.value.replace(/[^A-Za-z]/g, '')

  if (letters.length < 2) {
    return null
  }

  if (letters === letters.toUpperCase()) {
    return 'all-caps'
  }

  if (
    !token.isSentenceStart &&
    token.isCapitalized &&
    letters.slice(1) === letters.slice(1).toLowerCase()
  ) {
    return 'title-case'
  }

  return null
}

function getDocumentVariantPreference(
  context: RuleCheckContext,
): DocumentVariantPreference | null {
  const cached = documentVariantPreferenceCache.get(context)

  if (cached !== undefined) {
    return cached
  }

  if (context.language.code === 'en-US') {
    documentVariantPreferenceCache.set(context, 'us')
    return 'us'
  }

  if (context.language.code === 'en-GB') {
    documentVariantPreferenceCache.set(context, 'uk')
    return 'uk'
  }

  let usCount = 0
  let ukCount = 0

  for (const token of context.tokens) {
    if (US_TO_UK.has(token.normalized)) {
      usCount += 1
      continue
    }

    if (UK_TO_US.has(token.normalized)) {
      ukCount += 1
    }
  }

  const preference =
    usCount === ukCount || (usCount === 0 && ukCount === 0)
      ? null
      : usCount > ukCount
        ? 'us'
        : 'uk'

  documentVariantPreferenceCache.set(context, preference)
  return preference
}

function getCandidateLanguageScore(
  candidate: ContextualConfusionCandidate,
  context: RuleCheckContext,
  documentVariantPreference: DocumentVariantPreference | null,
) {
  let score = candidate.languageBias?.[context.language.code] ?? 0
  const evidence: ConfusionScoreEvidence[] = []

  if (score > 0) {
    evidence.push({
      candidate: candidate.value,
      score,
      source: 'language',
    })
  }

  if (context.language.code === 'en' && documentVariantPreference) {
    const variantLanguageCode =
      documentVariantPreference === 'us' ? 'en-US' : 'en-GB'
    const variantScore = candidate.languageBias?.[variantLanguageCode] ?? 0

    if (variantScore > 0) {
      score += variantScore
      evidence.push({
        candidate: candidate.value,
        score: variantScore,
        source: 'variant',
      })
    }
  }

  return { score, evidence }
}

function doesCueMatch(
  cue: ContextualConfusionCue,
  context: RuleCheckContext,
  tokens: Token[],
  index: number,
) {
  if (cue.languages?.length && !cue.languages.includes(context.language.code)) {
    return false
  }

  const token = getRelativeToken(tokens, index, cue.relativeTokenIndex)

  if (!token) {
    return false
  }

  if (cue.values?.length && !cue.values.includes(token.normalized)) {
    return false
  }

  if (cue.lemmas?.length && !cue.lemmas.includes(token.morphology.lemma)) {
    return false
  }

  if (cue.clauseParts?.length && !cue.clauseParts.includes(token.clausePart)) {
    return false
  }

  return true
}

function getPosCueEvidence(
  token: Token,
  cue: ContextualConfusionCue,
  confusionSet: ContextualConfusionSet,
): ConfusionScoreEvidence | null {
  if (!cue.posHints?.length) {
    return null
  }

  for (const hint of cue.posHints) {
    const reading = getPosReading(token, hint)

    if (!reading) {
      continue
    }

    if (token.contextualPosHints.includes(hint)) {
      return {
        candidate: '',
        score: cue.score,
        source: 'pos-contextual',
        relativeTokenIndex: cue.relativeTokenIndex,
      }
    }

    if (token.lexicalPosHints.includes(hint)) {
      return {
        candidate: '',
        score: cue.score,
        source: 'pos-lexical',
        relativeTokenIndex: cue.relativeTokenIndex,
      }
    }

    if (token.morphologyPosHints.includes(hint)) {
      return {
        candidate: '',
        score: Math.max(1, cue.score - 1),
        source: 'pos-morphology',
        relativeTokenIndex: cue.relativeTokenIndex,
      }
    }

    if (token.fallbackPosHints.includes(hint)) {
      if (confusionSet.ignoreFallbackOnlyPosHints) {
        return null
      }

      return {
        candidate: '',
        score: hasFallbackOnlyPosHint(token, hint)
          ? 1
          : Math.max(1, cue.score - 2),
        source: 'pos-fallback',
        relativeTokenIndex: cue.relativeTokenIndex,
      }
    }

    if (reading.sources.includes('contextual-disambiguation')) {
      return {
        candidate: '',
        score: cue.score,
        source: 'pos-contextual',
        relativeTokenIndex: cue.relativeTokenIndex,
      }
    }
  }

  return null
}

function doesStatisticalContextMatch(
  statisticalContext: ContextualConfusionNgram,
  tokens: Token[],
  index: number,
) {
  let matchedCondition = false

  if (
    statisticalContext.previousValues?.length ||
    statisticalContext.previousPosHints?.length
  ) {
    const previousToken = getRelativeToken(
      tokens,
      index,
      statisticalContext.previousRelativeTokenIndex ?? -1,
    )

    if (!previousToken) {
      return false
    }

    matchedCondition = true

    if (
      statisticalContext.previousValues?.length &&
      !statisticalContext.previousValues.includes(previousToken.normalized)
    ) {
      return false
    }

    if (
      statisticalContext.previousPosHints?.length &&
      !statisticalContext.previousPosHints.some((hint) =>
        hasPosHint(previousToken, hint),
      )
    ) {
      return false
    }
  }

  if (
    statisticalContext.nextValues?.length ||
    statisticalContext.nextPosHints?.length
  ) {
    const nextToken = getRelativeToken(
      tokens,
      index,
      statisticalContext.nextRelativeTokenIndex ?? 1,
    )

    if (!nextToken) {
      return false
    }

    matchedCondition = true

    if (
      statisticalContext.nextValues?.length &&
      !statisticalContext.nextValues.includes(nextToken.normalized)
    ) {
      return false
    }

    if (
      statisticalContext.nextPosHints?.length &&
      !statisticalContext.nextPosHints.some((hint) =>
        hasPosHint(nextToken, hint),
      )
    ) {
      return false
    }
  }

  return matchedCondition
}

function doesSurfaceCueMatch(
  cue: ContextualConfusionSurfaceCue,
  tokens: Token[],
  index: number,
) {
  const token = getRelativeToken(tokens, index, cue.relativeTokenIndex)

  if (!token) {
    return false
  }

  if (cue.values?.length && !cue.values.includes(token.normalized)) {
    return false
  }

  if (
    cue.capitalized !== undefined &&
    cue.capitalized !== token.isCapitalized
  ) {
    return false
  }

  if (
    cue.allCaps !== undefined &&
    cue.allCaps !== (getTokenSurfaceCase(token) === 'all-caps')
  ) {
    return false
  }

  return true
}

function getSurfacePlausibilityScore(
  confusionSet: ContextualConfusionSet,
  context: RuleCheckContext,
  index: number,
) {
  const token = context.tokens[index]
  const surfaceCase = token ? getTokenSurfaceCase(token) : null

  if (!token || !surfaceCase || !confusionSet.surfacePlausibility?.length) {
    return { score: 0, evidence: [] as ConfusionScoreEvidence[] }
  }

  const evidence: ConfusionScoreEvidence[] = []
  let score = 0

  for (const profile of confusionSet.surfacePlausibility) {
    if (!profile.cases.includes(surfaceCase)) {
      continue
    }

    const profileScore = profile.cues
      .filter((cue) => doesSurfaceCueMatch(cue, context.tokens, index))
      .reduce((total, cue) => total + cue.score, 0)

    if (profileScore < (profile.minimumScore ?? 1)) {
      continue
    }

    score += profileScore
    evidence.push({
      candidate: token.normalized,
      score: profileScore,
      source: 'case',
    })
  }

  return { score, evidence }
}

export function rankConfusionCandidates(
  confusionSet: ContextualConfusionSet,
  context: RuleCheckContext,
  index: number,
) {
  const token = context.tokens[index]

  if (!token || !confusionSet.forms.includes(token.normalized)) {
    return []
  }

  if (
    confusionSet.enabledInLanguages?.length &&
    !confusionSet.enabledInLanguages.includes(context.language.code)
  ) {
    return []
  }

  const documentVariantPreference = getDocumentVariantPreference(context)

  if (confusionSet.requiresVariantPreference && !documentVariantPreference) {
    return []
  }

  return confusionSet.candidates
    .map((candidate) => {
      const { score: languageScore, evidence } = getCandidateLanguageScore(
        candidate,
        context,
        documentVariantPreference,
      )
      let score = (candidate.baseScore ?? 0) + languageScore

      for (const statisticalContext of candidate.statisticalContexts ?? []) {
        if (
          !doesStatisticalContextMatch(
            statisticalContext,
            context.tokens,
            index,
          )
        ) {
          continue
        }

        score += statisticalContext.score
        evidence.push({
          candidate: candidate.value,
          score: statisticalContext.score,
          source:
            statisticalContext.kind === 'collocation-frequency'
              ? 'collocation'
              : 'ngram',
        })
      }

      for (const cue of candidate.cues ?? []) {
        if (!doesCueMatch(cue, context, context.tokens, index)) {
          continue
        }

        const token = getRelativeToken(
          context.tokens,
          index,
          cue.relativeTokenIndex,
        )

        if (!token) {
          continue
        }

        const posCueEvidence = getPosCueEvidence(token, cue, confusionSet)

        if (cue.posHints?.length && !posCueEvidence) {
          continue
        }

        const cueScore = posCueEvidence?.score ?? cue.score
        score += cueScore
        evidence.push({
          candidate: candidate.value,
          score: cueScore,
          source: posCueEvidence?.source ?? getCueSource(cue),
          relativeTokenIndex: cue.relativeTokenIndex,
        })
      }

      if (candidate.value === token.normalized) {
        const surfacePlausibility = getSurfacePlausibilityScore(
          confusionSet,
          context,
          index,
        )

        score += surfacePlausibility.score
        evidence.push(...surfacePlausibility.evidence)
      }

      return {
        candidate,
        score,
        evidence,
      } satisfies RankedConfusionCandidate
    })
    .filter(
      (entry) =>
        entry.evidence.length >= (confusionSet.minimumEvidenceCount ?? 1),
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      if (left.evidence.length !== right.evidence.length) {
        return right.evidence.length - left.evidence.length
      }

      return left.candidate.value.localeCompare(right.candidate.value)
    })
}
