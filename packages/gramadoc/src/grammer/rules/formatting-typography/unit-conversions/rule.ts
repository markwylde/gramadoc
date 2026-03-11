import type { Match } from '../../../../types.js'
import {
  baseUnitConversionProfile,
  commonMetricImperialPairs,
  type UnitConversionPair,
  type UnitConversionProfile,
  type UnitConversionUnit,
  variantUnitConversionProfiles,
} from '../../../resources/unit-conversions.js'
import type {
  GrammerOptionalRulePack,
  GrammerRule,
  RuleCheckContext,
} from '../../../types.js'
import { createMatch } from '../../../utils.js'

const BASE_UNIT_CONVERSIONS_PACK =
  'editorial/unit-conversions' satisfies GrammerOptionalRulePack
const IMPERIAL_UNIT_CONVERSIONS_PACK =
  'editorial/unit-conversions-imperial' satisfies GrammerOptionalRulePack
const US_UNIT_CONVERSIONS_PACK =
  'editorial/unit-conversions-us' satisfies GrammerOptionalRulePack

const APPROXIMATE_SYMBOL = '\u2248'
const PROSE_BLOCKING_PREFIX = /[\p{L}\p{N}_]/u
const NUMBER_REGEX = /(^|[^\p{L}\p{N}_])(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gu

type QuantityMatch = {
  numericValue: number
  numberText: string
  originalText: string
  unitText: string
  offset: number
  length: number
  pair: UnitConversionPair
}

function isRulePackEnabled(
  enabledRulePacks: readonly GrammerOptionalRulePack[],
  rulePack: GrammerOptionalRulePack,
) {
  return enabledRulePacks.includes(rulePack)
}

function getProfileById(id: UnitConversionProfile['id']) {
  return variantUnitConversionProfiles.find((profile) => profile.id === id)
}

function getEnabledConversionProfile(
  context: Pick<
    RuleCheckContext,
    'enabledRulePacks' | 'language' | 'measurementPreference'
  >,
) {
  if (
    isRulePackEnabled(context.enabledRulePacks, US_UNIT_CONVERSIONS_PACK) ||
    context.measurementPreference === 'imperial-us'
  ) {
    return getProfileById('us-customary')
  }

  if (
    isRulePackEnabled(
      context.enabledRulePacks,
      IMPERIAL_UNIT_CONVERSIONS_PACK,
    ) ||
    context.measurementPreference === 'imperial'
  ) {
    return getProfileById('general-imperial')
  }

  if (
    !isRulePackEnabled(context.enabledRulePacks, BASE_UNIT_CONVERSIONS_PACK)
  ) {
    return null
  }

  if (context.language.code === 'en-US') {
    return getProfileById('us-customary')
  }

  if (context.language.code === 'en-GB') {
    return getProfileById('general-imperial')
  }

  return baseUnitConversionProfile
}

function normalizeUnitText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/gu, ' ')
}

function getUnitTerms(unit: UnitConversionUnit) {
  return new Set(
    [unit.singular, unit.plural, ...unit.symbols].map(normalizeUnitText),
  )
}

function getSourceUnitCandidates(pairs: readonly UnitConversionPair[]) {
  return pairs
    .flatMap((pair) =>
      [...getUnitTerms(pair.source)].map((term) => ({ pair, term })),
    )
    .sort((left, right) => right.term.length - left.term.length)
}

function findPairForUnit(
  pairs: readonly UnitConversionPair[],
  unitText: string,
) {
  const normalizedUnit = normalizeUnitText(unitText)

  return pairs.find((pair) => getUnitTerms(pair.source).has(normalizedUnit))
}

function overlapsStructuredText(
  context: Pick<RuleCheckContext, 'structuredTextSpans'>,
  offset: number,
  length: number,
) {
  const end = offset + length

  return context.structuredTextSpans.some(
    (span) => offset < span.end && end > span.start,
  )
}

function isInsideInlineCode(text: string, offset: number) {
  const before = text.slice(0, offset)
  const after = text.slice(offset)
  const backticksBefore = (before.match(/`/g) ?? []).length

  return backticksBefore % 2 === 1 && after.includes('`')
}

function isInsidePreformattedBlock(
  context: Pick<RuleCheckContext, 'blockRanges'>,
  offset: number,
  length: number,
) {
  if (!context.blockRanges?.length) {
    return false
  }

  const end = offset + Math.max(length, 1)

  return context.blockRanges.some(
    (blockRange) =>
      blockRange.tagName === 'pre' &&
      offset < blockRange.end &&
      end > blockRange.start,
  )
}

function alreadyHasTargetConversion(text: string, match: QuantityMatch) {
  const lookahead = text.slice(
    match.offset + match.length,
    match.offset + match.length + 36,
  )
  const targetTerms = [...getUnitTerms(match.pair.target)]

  return targetTerms.some((targetTerm) =>
    new RegExp(
      `\\(\\s*${APPROXIMATE_SYMBOL}?\\s*[-\\d.,]+\\s*${targetTerm}\\b`,
      'iu',
    ).test(lookahead),
  )
}

function getConvertedValue(pair: UnitConversionPair, value: number) {
  const factor = pair.approximateFactor ?? 1
  const offset = pair.approximateOffset ?? 0

  return value * factor + offset
}

function formatConvertedValue(
  value: number,
  quantity: UnitConversionPair['quantity'],
) {
  if (quantity === 'temperature') {
    return `${Math.round(value)}`
  }

  const absoluteValue = Math.abs(value)
  const decimals = absoluteValue < 10 ? 1 : 0
  const rounded = Number(value.toFixed(decimals))

  if (Number.isInteger(rounded)) {
    return `${rounded}`
  }

  return rounded.toFixed(decimals).replace(/\.0$/u, '')
}

function getTargetDisplayUnit(
  pair: UnitConversionPair,
  convertedValueText: string,
) {
  if (pair.quantity === 'temperature') {
    return pair.target.symbols[0]?.toUpperCase() ?? pair.target.plural
  }

  if (pair.quantity === 'volume') {
    return Math.abs(Number(convertedValueText)) === 1
      ? pair.target.singular
      : pair.target.plural
  }

  return pair.target.symbols[0] ?? pair.target.plural
}

function getConversionSuggestion(match: QuantityMatch) {
  const convertedValue = getConvertedValue(match.pair, match.numericValue)
  const convertedValueText = formatConvertedValue(
    convertedValue,
    match.pair.quantity,
  )
  const targetUnit = getTargetDisplayUnit(match.pair, convertedValueText)

  return `${match.originalText} (${APPROXIMATE_SYMBOL} ${convertedValueText} ${targetUnit})`
}

function detectQuantities(
  context: Pick<
    RuleCheckContext,
    'text' | 'structuredTextSpans' | 'blockRanges'
  >,
  pairs: readonly UnitConversionPair[],
) {
  const matches: QuantityMatch[] = []
  const sourceUnitCandidates = getSourceUnitCandidates(pairs)

  for (const match of context.text.matchAll(NUMBER_REGEX)) {
    const leading = match[1] ?? ''
    const numberText = match[2]

    if (match.index === undefined || !numberText) {
      continue
    }

    if (leading && PROSE_BLOCKING_PREFIX.test(leading)) {
      continue
    }

    const offset = match.index + leading.length
    const afterNumberOffset = offset + numberText.length
    const spacing =
      context.text.slice(afterNumberOffset).match(/^\s*/u)?.[0] ?? ''
    const unitOffset = afterNumberOffset + spacing.length
    const candidateText = context.text.slice(unitOffset)
    const matchedCandidate = sourceUnitCandidates.find(({ term }) => {
      if (!candidateText.toLowerCase().startsWith(term)) {
        return false
      }

      const boundaryCharacter = candidateText[term.length]

      return (
        boundaryCharacter === undefined || !/[a-z]/iu.test(boundaryCharacter)
      )
    })

    if (!matchedCandidate) {
      continue
    }

    const unitText = context.text.slice(
      unitOffset,
      unitOffset + matchedCandidate.term.length,
    )
    const pair = findPairForUnit(pairs, unitText)

    if (!pair) {
      continue
    }

    const length = numberText.length + spacing.length + unitText.length
    const trailingCharacter = context.text[offset + length]

    if (trailingCharacter === '/' || trailingCharacter === '_') {
      continue
    }

    if (
      overlapsStructuredText(context, offset, length) ||
      isInsideInlineCode(context.text, offset) ||
      isInsidePreformattedBlock(context, offset, length)
    ) {
      continue
    }

    const numericValue = Number(numberText.replaceAll(',', ''))

    if (Number.isNaN(numericValue)) {
      continue
    }

    const quantityMatch = {
      numericValue,
      numberText,
      originalText: context.text.slice(offset, offset + length),
      unitText,
      offset,
      length,
      pair,
    }

    if (alreadyHasTargetConversion(context.text, quantityMatch)) {
      continue
    }

    matches.push(quantityMatch)
  }

  return matches
}

export const unitConversionSuggestionRule: GrammerRule = {
  id: 'UNIT_CONVERSION_SUGGESTION',
  name: 'Unit Conversion Suggestion',
  description:
    'Optional editorial rule that suggests approximate imperial or US customary conversions for metric quantities in prose and tables.',
  shortMessage: 'Editorial',
  issueType: 'style',
  category: {
    id: 'UNIT_CONVERSIONS',
    name: 'Unit Conversions',
  },
  examples: {
    good: [
      { text: 'The route covers 5 km (≈ 3.1 mi).' },
      { text: 'The package weighs 10 kg.' },
    ],
    bad: [{ text: 'The route covers 5 km for US readers.' }],
  },
  check(context) {
    const profile = getEnabledConversionProfile(context)

    if (!profile) {
      return []
    }

    const pairs =
      profile === baseUnitConversionProfile
        ? baseUnitConversionProfile.pairs
        : profile.pairs
    const quantityMatches = detectQuantities(context, pairs)

    return quantityMatches.map(
      (match): Match =>
        createMatch({
          text: context.text,
          offset: match.offset,
          length: match.length,
          message: `Consider adding an approximate ${match.pair.target.plural} conversion for readers who use ${profile.preferredSystems[0]} units.`,
          replacements: [getConversionSuggestion(match)],
          rule: unitConversionSuggestionRule,
        }),
    )
  },
}

export const unitConversionsRules = [unitConversionSuggestionRule]

export const unitConversionEditorialPacks = {
  base: BASE_UNIT_CONVERSIONS_PACK,
  imperial: IMPERIAL_UNIT_CONVERSIONS_PACK,
  us: US_UNIT_CONVERSIONS_PACK,
} as const

export const unitConversionPairs = commonMetricImperialPairs
