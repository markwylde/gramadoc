import type {
  AnalysisResponse,
  GrammerAnalysisDetails,
  Match,
  Rule,
} from '../types.js'
import {
  buildTextDocument,
  extractHtmlDocument,
  getDocumentLanguage,
  segmentSentences,
  tokenizeText,
} from './document.js'
import { grammerRules } from './index.js'
import type {
  AnnotationMetrics,
  DocumentLanguage,
  GrammerAnalysisOptions,
  GrammerLanguageCode,
  GrammerOptionalRulePack,
  GrammerOptionalRulePackOptions,
  GrammerRule,
  RuleCheckContext,
  RuleMatchMetrics,
  TextBlockRange,
} from './types.js'

const sentenceCache = new Map<string, ReturnType<typeof segmentSentences>>()

function getSentenceRanges(text: string) {
  const cached = sentenceCache.get(text)

  if (cached) {
    return cached
  }

  const ranges = segmentSentences(text)
  sentenceCache.set(text, ranges)
  return ranges
}

function findSentenceRangeForOffset(
  sentenceRanges: ReturnType<typeof segmentSentences>,
  offset: number,
) {
  let low = 0
  let high = sentenceRanges.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const sentenceRange = sentenceRanges[mid]

    if (offset < sentenceRange.start) {
      high = mid - 1
      continue
    }

    if (offset >= sentenceRange.end) {
      low = mid + 1
      continue
    }

    return sentenceRange
  }

  return sentenceRanges[0]
}

export function htmlToPlainText(html: string): string {
  return extractHtmlDocument(html).plainText
}

export { tokenizeText }

export function buildContext(text: string, offset: number, length: number) {
  const sentenceRanges = getSentenceRanges(text)
  const containingSentence = findSentenceRangeForOffset(sentenceRanges, offset)

  if (!containingSentence) {
    return {
      sentence: text,
      context: {
        text,
        offset,
        length,
      },
    }
  }

  const sentence = containingSentence.text.replace(/[.!?]+["'”’)\]}]*$/u, '')

  return {
    sentence,
    context: {
      text: sentence,
      offset: Math.max(0, offset - containingSentence.start),
      length,
    },
  }
}

function toEditorRule(rule: GrammerRule): Rule {
  return {
    id: rule.id,
    description: rule.description,
    issueType: rule.issueType,
    category: rule.category,
    riskTier: rule.riskTier,
  }
}

export function preserveCase(source: string, replacement: string) {
  if (source === source.toUpperCase()) {
    return replacement.toUpperCase()
  }

  if (source[0] && source[0] === source[0].toUpperCase()) {
    return `${replacement[0]?.toUpperCase() ?? ''}${replacement.slice(1)}`
  }

  return replacement
}

function buildSuggestionSetId(ruleId: string, replacements: string[]) {
  if (replacements.length === 0) {
    return undefined
  }

  const normalizedReplacements = replacements.map((replacement) =>
    replacement.trim().toLocaleLowerCase(),
  )

  return `${ruleId}::${normalizedReplacements.join('|')}`
}

function isMatchAllowedInScope(
  match: Match,
  rule: GrammerRule,
  blockRanges?: TextBlockRange[],
) {
  const allowedBlockKinds = rule.scope?.blockKinds

  if (!allowedBlockKinds?.length || !blockRanges?.length) {
    return true
  }

  const matchStart = match.offset
  const matchEnd = match.offset + Math.max(match.length, 1)
  const overlappingBlocks = blockRanges.filter(
    (blockRange) => matchStart < blockRange.end && matchEnd > blockRange.start,
  )

  if (overlappingBlocks.length === 0) {
    return true
  }

  return overlappingBlocks.every((blockRange) =>
    allowedBlockKinds.includes(blockRange.kind),
  )
}

export function createMatch(options: {
  text: string
  offset: number
  length: number
  message: string
  replacements?: string[]
  confidenceLabel?: RuleCheckContext['tokens'][number]['posHintConfidence']
  diagnostics?: Match['diagnostics']
  details?: Match['details']
  rule: GrammerRule
}): Match {
  const {
    text,
    offset,
    length,
    message,
    replacements = [],
    confidenceLabel,
    diagnostics,
    details,
    rule,
  } = options
  const { sentence, context } = buildContext(text, offset, length)
  const suggestionSetId = buildSuggestionSetId(rule.id, replacements)

  return {
    message,
    shortMessage: rule.shortMessage,
    offset,
    length,
    replacements: replacements.map((value) => ({ value })),
    suggestionSetId,
    confidenceLabel,
    diagnostics,
    details,
    context,
    sentence,
    rule: toEditorRule(rule),
  }
}

function getLanguageName(language: DocumentLanguage) {
  switch (language.code) {
    case 'en-US':
      return 'English (US)'
    case 'en-GB':
      return 'English (GB)'
    default:
      return 'English'
  }
}

export function createBaseResponse(
  languageCode: GrammerLanguageCode = 'en',
): Omit<AnalysisResponse, 'matches'> {
  const language = getDocumentLanguage(languageCode)

  return {
    software: {
      name: 'Grammar Worker',
      version: '2.0',
      buildDate: '2026-03-11',
      apiVersion: 1,
      status: 'OK',
      premium: false,
    },
    language: {
      name: getLanguageName(language),
      code: language.code,
      detectedLanguage: {
        name: `${getLanguageName(language)} (Worker)`,
        code: language.code,
      },
    },
  }
}

function getLanguageProfileCode(profile: string) {
  return profile.startsWith('l1/') ? profile.slice(3) : profile
}

export function resolveOptionalRulePacks(
  options?: GrammerOptionalRulePackOptions,
): GrammerOptionalRulePack[] {
  const enabledRulePacks = new Set<GrammerOptionalRulePack>()

  switch (options?.creativeWriting?.ePrime) {
    case 'strict':
      enabledRulePacks.add('creative-writing/e-prime-strict')
      break
    case 'loose':
      enabledRulePacks.add('creative-writing/e-prime-loose')
      break
    case 'all':
      enabledRulePacks.add('creative-writing/e-prime-strict')
      enabledRulePacks.add('creative-writing/e-prime-loose')
      break
  }

  const unitConversions = options?.editorial?.unitConversions

  if (unitConversions) {
    enabledRulePacks.add('editorial/unit-conversions')

    if (unitConversions === 'imperial') {
      enabledRulePacks.add('editorial/unit-conversions-imperial')
    }

    if (unitConversions === 'imperial-us') {
      enabledRulePacks.add('editorial/unit-conversions-us')
    }
  }

  if (options?.profiles?.falseFriends && options.profiles.nativeLanguage) {
    enabledRulePacks.add(
      `l2-false-friends/${getLanguageProfileCode(options.profiles.nativeLanguage)}`,
    )
  }

  if (options?.experimental?.contextualConfusions) {
    enabledRulePacks.add('experimental/contextual-confusions')
  }

  return [...enabledRulePacks]
}

export function resolveAnalysisOptions(options?: GrammerAnalysisOptions) {
  const enabledRulePacks = new Set<GrammerOptionalRulePack>(
    options?.enabledRulePacks ?? [],
  )
  const optionalPackConfig = options?.optionalRulePacks

  for (const pack of resolveOptionalRulePacks(optionalPackConfig)) {
    enabledRulePacks.add(pack)
  }

  return {
    ...options,
    enabledRulePacks: [...enabledRulePacks],
    nativeLanguageProfile:
      options?.nativeLanguageProfile ??
      optionalPackConfig?.profiles?.nativeLanguage,
    measurementPreference:
      options?.measurementPreference ??
      (typeof optionalPackConfig?.editorial?.unitConversions === 'string'
        ? optionalPackConfig.editorial.unitConversions
        : undefined),
  }
}

export function buildRuleCheckContext(
  text: string,
  options?: GrammerAnalysisOptions,
) {
  const resolvedOptions = resolveAnalysisOptions(options)
  const document = buildTextDocument(text, {
    blockRanges: resolvedOptions.blockRanges,
    paragraphRanges: resolvedOptions.paragraphRanges,
    language: getDocumentLanguage(resolvedOptions.languageCode ?? 'en'),
  })

  return {
    ...document,
    enabledRulePacks: resolvedOptions.enabledRulePacks ?? [],
    nativeLanguageProfile: resolvedOptions.nativeLanguageProfile,
    measurementPreference: resolvedOptions.measurementPreference,
    houseStyleTerms: resolvedOptions.houseStyleTerms ?? [],
  }
}

export function analyzeText(
  text: string,
  options?: GrammerAnalysisOptions,
): GrammerAnalysisDetails {
  const context = buildRuleCheckContext(text, options)
  const matches = grammerRules
    .flatMap((rule) => {
      const ruleMatches = rule.check(context)

      return ruleMatches.filter((match) =>
        isMatchAllowedInScope(match, rule, context.blockRanges),
      )
    })
    .sort((left, right) => {
      if (left.offset !== right.offset) {
        return left.offset - right.offset
      }

      if (left.length !== right.length) {
        return left.length - right.length
      }

      return left.rule.id.localeCompare(right.rule.id)
    })
  const metrics = getRuleMatchMetrics(matches, context)

  return {
    plainText: text,
    wordCounts: context.wordCounts,
    warnings: {
      ...createBaseResponse(context.language.code),
      matches,
    },
    metrics,
  }
}

export function analyzeHtml(
  html: string,
  options?: GrammerAnalysisOptions,
): GrammerAnalysisDetails {
  const { plainText, blockRanges, paragraphRanges } = extractHtmlDocument(html)
  const resolvedOptions = resolveAnalysisOptions(options)
  const analysis = analyzeText(plainText, {
    blockRanges,
    paragraphRanges,
    languageCode: resolvedOptions.languageCode,
    optionalRulePacks: resolvedOptions.optionalRulePacks,
    enabledRulePacks: resolvedOptions.enabledRulePacks,
    nativeLanguageProfile: resolvedOptions.nativeLanguageProfile,
    measurementPreference: resolvedOptions.measurementPreference,
  })

  return {
    ...analysis,
    plainText,
  }
}

function getAnnotationMetrics(
  context?: Pick<RuleCheckContext, 'tokens'>,
): AnnotationMetrics {
  if (!context) {
    return {
      highConfidenceTokenCount: 0,
      mediumConfidenceTokenCount: 0,
      lowConfidenceTokenCount: 0,
      ambiguousTokenCount: 0,
      fallbackGuessTokenCount: 0,
      openClassUnknownTokenCount: 0,
      disambiguatedTokenCount: 0,
    }
  }

  return context.tokens.reduce<AnnotationMetrics>(
    (metrics, token) => {
      if (token.posHintConfidence === 'high') {
        metrics.highConfidenceTokenCount += 1
      } else if (token.posHintConfidence === 'medium') {
        metrics.mediumConfidenceTokenCount += 1
      } else {
        metrics.lowConfidenceTokenCount += 1
      }

      if (token.isPosAmbiguous) {
        metrics.ambiguousTokenCount += 1
      }

      if (token.usedFallbackPosGuess) {
        metrics.fallbackGuessTokenCount += 1
      }

      if (token.isOpenClassUnknown) {
        metrics.openClassUnknownTokenCount += 1
      }

      if (token.disambiguationProvenance.length > 0) {
        metrics.disambiguatedTokenCount += 1
      }

      return metrics
    },
    {
      highConfidenceTokenCount: 0,
      mediumConfidenceTokenCount: 0,
      lowConfidenceTokenCount: 0,
      ambiguousTokenCount: 0,
      fallbackGuessTokenCount: 0,
      openClassUnknownTokenCount: 0,
      disambiguatedTokenCount: 0,
    },
  )
}

export function getRuleMatchMetrics(
  matches: Match[],
  context?: Pick<RuleCheckContext, 'tokens'>,
): RuleMatchMetrics {
  const ruleMatchCounts = matches.reduce<Record<string, number>>(
    (counts, match) => {
      counts[match.rule.id] = (counts[match.rule.id] ?? 0) + 1
      return counts
    },
    {},
  )
  const replacementSuggestionSetMap = new Map<
    string,
    {
      suggestionSetId: string
      ruleId: string
      occurrenceCount: number
      suggestionCount: number
      replacementValues: string[]
    }
  >()
  const topFiringRuleIds = Object.entries(ruleMatchCounts)
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 5)
    .map(([ruleId]) => ruleId)
  const overlapMap = new Map<string, Set<string>>()

  for (let index = 0; index < matches.length; index += 1) {
    const left = matches[index]
    const leftEnd = left.offset + Math.max(left.length, 1)

    if (left.suggestionSetId && left.replacements.length > 0) {
      const existingSuggestionSet = replacementSuggestionSetMap.get(
        left.suggestionSetId,
      )

      if (existingSuggestionSet) {
        existingSuggestionSet.occurrenceCount += 1
      } else {
        replacementSuggestionSetMap.set(left.suggestionSetId, {
          suggestionSetId: left.suggestionSetId,
          ruleId: left.rule.id,
          occurrenceCount: 1,
          suggestionCount: left.replacements.length,
          replacementValues: left.replacements.map(
            (replacement) => replacement.value,
          ),
        })
      }
    }

    for (let cursor = index + 1; cursor < matches.length; cursor += 1) {
      const right = matches[cursor]

      if (right.offset >= leftEnd) {
        break
      }

      const rightEnd = right.offset + Math.max(right.length, 1)

      if (left.offset < rightEnd && right.offset < leftEnd) {
        const offset = Math.min(left.offset, right.offset)
        const end = Math.max(leftEnd, rightEnd)
        const key = `${offset}:${end - offset}`
        const ruleIds = overlapMap.get(key) ?? new Set<string>()
        ruleIds.add(left.rule.id)
        ruleIds.add(right.rule.id)
        overlapMap.set(key, ruleIds)
      }
    }
  }

  return {
    annotation: getAnnotationMetrics(context),
    ruleMatchCounts,
    topFiringRuleIds,
    replacementSuggestionSets: [...replacementSuggestionSetMap.values()].sort(
      (left, right) =>
        right.occurrenceCount - left.occurrenceCount ||
        left.suggestionSetId.localeCompare(right.suggestionSetId),
    ),
    overlappingMatchGroups: [...overlapMap.entries()].map(([key, ruleIds]) => {
      const [offset, length] = key.split(':').map(Number)
      return {
        offset,
        length,
        ruleIds: [...ruleIds].sort(),
      }
    }),
  }
}
