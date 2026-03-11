import type { Match } from '../../../../types.js'
import { rankConfusionCandidates } from '../../../confusion.js'
import { createPatternRule, type PatternStep } from '../../../patterns.js'
import {
  type ContextualConfusionSet,
  contextualConfusionSets,
  fixedPhraseConfusions,
  homophoneConfusionSets,
} from '../../../resources/confusion-sets.js'
import type { GrammerRule, Token } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const EXPERIMENTAL_CONTEXTUAL_CONFUSIONS_PACK =
  'experimental/contextual-confusions' as const

function buildFixedPattern(
  literals: Array<string | string[]>,
  focusIndex: number,
) {
  return literals.map((literal, index) => ({
    literal,
    capture: index === focusIndex ? 'focus' : undefined,
  })) satisfies PatternStep[]
}

function matchesConfusionAntiPattern(
  confusionSet: ContextualConfusionSet,
  tokens: Token[],
  index: number,
) {
  return (confusionSet.antiPatterns ?? []).some((antiPattern) =>
    antiPattern.literals.every((literal, literalIndex) => {
      const relativeIndex = literalIndex - antiPattern.focusIndex
      const token = tokens[index + relativeIndex]

      if (!token) {
        return false
      }

      const acceptedValues = Array.isArray(literal) ? literal : [literal]
      return acceptedValues.includes(token.normalized)
    }),
  )
}

function isWeakEvidenceOnly(
  match: ReturnType<typeof rankConfusionCandidates>[number],
) {
  return match.evidence.every((evidence) => evidence.source === 'pos-fallback')
}

function shouldSkipContextualConfusion(
  confusionSet: ContextualConfusionSet,
  token: Token,
  previousTwo?: Token,
  previous?: Token,
  next?: Token,
) {
  return (
    (confusionSet.id === 'AFFECT_EFFECT' &&
      token.normalized === 'affect' &&
      ['have', 'has', 'had', 'take', 'takes', 'took'].includes(
        previousTwo?.normalized ?? '',
      ) &&
      previous?.normalized === 'an' &&
      next?.normalized === 'on') ||
    (confusionSet.id === 'SEE_SEA' &&
      token.isCapitalized &&
      (previous?.isCapitalized ||
        next?.isCapitalized ||
        !token.isSentenceStart))
  )
}

function createContextualConfusionRule(confusionSet: ContextualConfusionSet) {
  const implementationModes =
    confusionSet.implementationModes ??
    (confusionSet.candidates.some(
      (candidate) => candidate.statisticalContexts?.length,
    )
      ? (['hybrid'] as const)
      : (['deterministic-local-context'] as const))
  const family = confusionSet.family ?? 'semantics-clarity/contextual-errors'
  const explicitImplementationModes = confusionSet.implementationModes ?? []
  const isScoredRule =
    explicitImplementationModes.includes('hybrid') ||
    explicitImplementationModes.includes('heuristic-collocation') ||
    explicitImplementationModes.includes('scored-collocation')
  const rule: GrammerRule = {
    id: confusionSet.id,
    name: confusionSet.name,
    description: `${confusionSet.description} Family: ${family}. Modes: ${implementationModes.join(', ')}.`,
    shortMessage: 'Context',
    issueType: 'grammar',
    category: {
      id: 'CONTEXTUAL_ERRORS',
      name: 'Contextual Errors',
    },
    examples: confusionSet.examples,
    check(context) {
      if (
        isScoredRule &&
        !context.enabledRulePacks.includes(
          EXPERIMENTAL_CONTEXTUAL_CONFUSIONS_PACK,
        )
      ) {
        return []
      }

      const matches: Match[] = []

      for (let index = 0; index < context.tokens.length; index += 1) {
        const token = context.tokens[index]

        if (!confusionSet.forms.includes(token.normalized)) {
          continue
        }

        if (matchesConfusionAntiPattern(confusionSet, context.tokens, index)) {
          continue
        }

        if (
          shouldSkipContextualConfusion(
            confusionSet,
            token,
            context.tokens[index - 2],
            context.tokens[index - 1],
            context.tokens[index + 1],
          )
        ) {
          continue
        }

        const rankedCandidates = rankConfusionCandidates(
          confusionSet,
          context,
          index,
        ).filter((entry) => entry.score > 0)
        const bestCandidate = rankedCandidates[0]?.candidate
        const bestScore = rankedCandidates[0]?.score ?? 0
        const currentScore =
          rankedCandidates.find(
            (entry) => entry.candidate.value === token.normalized,
          )?.score ?? 0

        if (!bestCandidate || bestCandidate.value === token.normalized) {
          continue
        }

        if (bestScore < (confusionSet.minimumScore ?? 1)) {
          continue
        }

        if (bestScore - currentScore < (confusionSet.minimumAdvantage ?? 2)) {
          continue
        }

        const currentEntry = rankedCandidates.find(
          (entry) => entry.candidate.value === token.normalized,
        )

        if (
          rankedCandidates[0] &&
          currentEntry &&
          isWeakEvidenceOnly(rankedCandidates[0]) &&
          isWeakEvidenceOnly(currentEntry)
        ) {
          continue
        }

        const bestEvidenceCount = rankedCandidates[0]?.evidence.length ?? 0
        const confidenceLabel =
          isScoredRule &&
          (bestScore <= (confusionSet.minimumScore ?? 1) + 1 ||
            bestScore - currentScore <=
              (confusionSet.minimumAdvantage ?? 2) + 1 ||
            bestEvidenceCount <= (confusionSet.minimumEvidenceCount ?? 1) + 1)
            ? 'low'
            : undefined

        matches.push(
          createMatch({
            text: context.text,
            offset: token.offset,
            length: token.length,
            message: confusionSet.message,
            replacements: rankedCandidates.map((entry) =>
              preserveCase(token.value, entry.candidate.value),
            ),
            confidenceLabel,
            diagnostics: {
              evidence: rankedCandidates[0]?.evidence.map(
                (evidence) =>
                  `${evidence.source}:${evidence.score}@${evidence.relativeTokenIndex ?? 0}`,
              ),
            },
            details: {
              confusionFamily: confusionSet.confusionFamily ?? confusionSet.id,
              currentCandidate: token.normalized,
              winningCandidate: bestCandidate.value,
              winningEvidence:
                rankedCandidates[0]?.evidence
                  .map(
                    (evidence) =>
                      `${evidence.source}:${evidence.score}@${evidence.relativeTokenIndex ?? 0}`,
                  )
                  .join(', ') ?? '',
            },
            rule,
          }),
        )
      }

      return matches
    },
  }

  return rule
}

const fixedPhraseRules = fixedPhraseConfusions.map((phrase) =>
  createPatternRule({
    id: phrase.id,
    name: phrase.name,
    description: phrase.description,
    shortMessage: 'Meaning',
    issueType: 'grammar',
    category: {
      id: 'WORD_CONFUSION',
      name: 'Word Confusion',
    },
    examples:
      phrase.id === 'HAVE_AN_AFFECT_ON'
        ? {
            good: [{ text: 'The delay had an effect on the launch.' }],
            bad: [{ text: 'The delay had an affect on the launch.' }],
          }
        : {
            good: [{ text: 'The policy will take effect tomorrow.' }],
            bad: [{ text: 'The policy will take affect tomorrow.' }],
          },
    pattern: buildFixedPattern(
      phrase.pattern.literals,
      phrase.pattern.focusIndex,
    ),
    reportCapture: 'focus',
    filter: (match) =>
      match.tokens.every(
        (token, index) =>
          index === match.tokens.length - 1 ||
          /^\s+$/u.test(token.trailingText),
      ),
    message: phrase.message,
    replacements: phrase.replacements,
  }),
)

const deterministicContextualRules = [
  ...contextualConfusionSets.filter(
    (confusionSet) =>
      !(confusionSet.implementationModes ?? []).includes('hybrid') &&
      !(confusionSet.implementationModes ?? []).includes(
        'scored-collocation',
      ) &&
      !confusionSet.candidates.some(
        (candidate) => candidate.statisticalContexts,
      ),
  ),
  ...homophoneConfusionSets.filter(
    (confusionSet) =>
      !(confusionSet.implementationModes ?? []).includes('hybrid') &&
      !(confusionSet.implementationModes ?? []).includes(
        'scored-collocation',
      ) &&
      !confusionSet.candidates.some(
        (candidate) => candidate.statisticalContexts,
      ),
  ),
].map((confusionSet) => createContextualConfusionRule(confusionSet))

const scoredContextualRules = [
  ...contextualConfusionSets.filter(
    (confusionSet) =>
      (confusionSet.implementationModes ?? []).includes('hybrid') ||
      (confusionSet.implementationModes ?? []).includes('scored-collocation') ||
      confusionSet.candidates.some(
        (candidate) => candidate.statisticalContexts,
      ),
  ),
  ...homophoneConfusionSets.filter(
    (confusionSet) =>
      (confusionSet.implementationModes ?? []).includes('hybrid') ||
      (confusionSet.implementationModes ?? []).includes('scored-collocation') ||
      confusionSet.candidates.some(
        (candidate) => candidate.statisticalContexts,
      ),
  ),
].map((confusionSet) => createContextualConfusionRule(confusionSet))

const contextualRules = [
  ...deterministicContextualRules,
  ...scoredContextualRules,
]

function getContextualRules(id: string) {
  return contextualRules.find((candidate) => candidate.id === id)
}

export const deterministicContextualConfusionRules =
  deterministicContextualRules
export const scoredContextualConfusionRules = scoredContextualRules

function getContextualRule(id: string) {
  const rule = getContextualRules(id)

  if (!rule) {
    throw new Error(`Missing contextual confusion rule: ${id}`)
  }

  return rule
}

export const thanThenConfusionRule = getContextualRule('THAN_THEN')
export const affectEffectConfusionRule = getContextualRule('AFFECT_EFFECT')
export const practicePractiseConfusionRule =
  getContextualRule('PRACTICE_PRACTISE')
export const licenceLicenseConfusionRule = getContextualRule('LICENCE_LICENSE')
export const adviceAdviseConfusionRule = getContextualRule('ADVICE_ADVISE')
export const weatherWhetherConfusionRule = getContextualRule('WEATHER_WHETHER')
export const seeSeaConfusionRule = getContextualRule('SEE_SEA')
export const loseLooseConfusionRule = getContextualRule('LOSE_LOOSE')
export const quietQuiteConfusionRule = getContextualRule('QUIET_QUITE')
export const breathBreatheConfusionRule = getContextualRule('BREATH_BREATHE')
export const acceptExceptConfusionRule = getContextualRule('ACCEPT_EXCEPT')
export const principalPrincipleConfusionRule = getContextualRule(
  'PRINCIPAL_PRINCIPLE',
)
export const yourYoureConfusionRule = getContextualRule('YOUR_YOURE')
export const itsContractionConfusionRule = getContextualRule(
  'ITS_ITS_CONTRACTION',
)
export const theirThereTheyreConfusionRule =
  getContextualRule('THEIR_THERE_THEYRE')
export const toTooTwoConfusionRule = getContextualRule('TO_TOO_TWO')

export const [haveAnAffectOnRule, takeAffectRule] = fixedPhraseRules as [
  GrammerRule,
  GrammerRule,
]

export const wordConfusionRules = [...fixedPhraseRules, ...contextualRules]
