import type { Match } from '../../../../types.js'
import { lexicalConsistencyGroups } from '../../../resources/lexical-consistency.js'
import { variantPairs } from '../../../resources/variant-mappings.js'
import { findTokenPhraseMatches } from '../../../rule-helpers.js'
import type { GrammerRule, Token } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const US_TO_UK = new Map(variantPairs.map((pair) => [pair.us, pair.uk]))
const UK_TO_US = new Map(variantPairs.map((pair) => [pair.uk, pair.us]))

function isQuotedLiteralToken(token: Token) {
  return (
    /["'`“‘]/u.test(token.leadingText) || /["'`”’]/u.test(token.trailingText)
  )
}

function getPreferredVariant(
  languageCode: 'en' | 'en-US' | 'en-GB',
  variantTokens: Token[],
) {
  if (languageCode === 'en-US') {
    return 'us'
  }

  if (languageCode === 'en-GB') {
    return 'uk'
  }

  return US_TO_UK.has(variantTokens[0]?.normalized ?? '') ? 'us' : 'uk'
}

function createVariantMatch(
  text: string,
  token: Token,
  replacement: string,
  message: string,
  rule: GrammerRule,
) {
  return createMatch({
    text,
    offset: token.offset,
    length: token.length,
    message,
    replacements: [preserveCase(token.value, replacement)],
    rule,
  })
}

export const mixedLanguageVariantsRule: GrammerRule = {
  id: 'MIXED_LANGUAGE_VARIANTS',
  name: 'Mixed Language Variants',
  description:
    'Flags curated US/UK spelling pairs when both variants appear within the same sentence or conflict with the selected document mode.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'LANGUAGE_VARIANTS',
    name: 'Language Variants',
  },
  examples: {
    good: [
      { text: 'The color palette helped us organize the center display.' },
      { text: 'The colour palette helped us organise the centre display.' },
    ],
    bad: [{ text: 'The color palette helped us organise the centre display.' }],
  },
  check({ text, sentenceTokens, language }) {
    const matches: Match[] = []

    for (const tokensInSentence of sentenceTokens) {
      const variantTokens = tokensInSentence.filter(
        (token) =>
          !isQuotedLiteralToken(token) &&
          (US_TO_UK.has(token.normalized) || UK_TO_US.has(token.normalized)),
      )

      if (variantTokens.length === 0) {
        continue
      }

      const preferredVariant = getPreferredVariant(language.code, variantTokens)
      const hasUs = variantTokens.some((token) =>
        US_TO_UK.has(token.normalized),
      )
      const hasUk = variantTokens.some((token) =>
        UK_TO_US.has(token.normalized),
      )
      const shouldCheckSentenceMix =
        language.code === 'en' ? hasUs && hasUk : true

      if (!shouldCheckSentenceMix) {
        continue
      }

      for (const token of variantTokens) {
        if (preferredVariant === 'us' && UK_TO_US.has(token.normalized)) {
          matches.push(
            createVariantMatch(
              text,
              token,
              UK_TO_US.get(token.normalized) ?? token.value,
              language.code === 'en'
                ? 'Use one spelling variant consistently within this sentence.'
                : 'Use US spellings consistently for an `en-US` document.',
              mixedLanguageVariantsRule,
            ),
          )
        }

        if (preferredVariant === 'uk' && US_TO_UK.has(token.normalized)) {
          matches.push(
            createVariantMatch(
              text,
              token,
              US_TO_UK.get(token.normalized) ?? token.value,
              language.code === 'en'
                ? 'Use one spelling variant consistently within this sentence.'
                : 'Use UK spellings consistently for an `en-GB` document.',
              mixedLanguageVariantsRule,
            ),
          )
        }
      }
    }

    return matches
  },
}

export const documentVariantConsistencyRule: GrammerRule = {
  id: 'DOCUMENT_VARIANT_CONSISTENCY',
  name: 'Document Variant Consistency',
  description:
    'Flags document-level mixing between US and UK spelling variants.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'LANGUAGE_VARIANTS',
    name: 'Language Variants',
  },
  examples: {
    good: [
      { text: 'The color palette helped us organize the center display.' },
    ],
    bad: [{ text: 'The color palette helped us organise the center display.' }],
  },
  check({ text, tokens, language }) {
    const variantTokens = tokens.filter(
      (token) =>
        !isQuotedLiteralToken(token) &&
        (US_TO_UK.has(token.normalized) || UK_TO_US.has(token.normalized)),
    )

    if (variantTokens.length < 2) {
      return []
    }

    const usCount = variantTokens.filter((token) =>
      US_TO_UK.has(token.normalized),
    ).length
    const ukCount = variantTokens.length - usCount
    const preferredVariant =
      language.code === 'en-US'
        ? 'us'
        : language.code === 'en-GB'
          ? 'uk'
          : usCount >= ukCount
            ? 'us'
            : 'uk'

    return variantTokens.flatMap((token) => {
      if (preferredVariant === 'us' && UK_TO_US.has(token.normalized)) {
        return [
          createVariantMatch(
            text,
            token,
            UK_TO_US.get(token.normalized) ?? token.value,
            'Use one spelling variant consistently across the document.',
            documentVariantConsistencyRule,
          ),
        ]
      }

      if (preferredVariant === 'uk' && US_TO_UK.has(token.normalized)) {
        return [
          createVariantMatch(
            text,
            token,
            US_TO_UK.get(token.normalized) ?? token.value,
            'Use one spelling variant consistently across the document.',
            documentVariantConsistencyRule,
          ),
        ]
      }

      return []
    })
  },
}

export const lexicalConsistencyRule: GrammerRule = {
  id: 'LEXICAL_CONSISTENCY',
  name: 'Lexical Consistency',
  description:
    'Flags documents that mix multiple house-style variants for the same lexical choice.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'LANGUAGE_VARIANTS',
    name: 'Language Variants',
  },
  examples: {
    good: [{ text: 'Send an email from the website to your coworker.' }],
    bad: [{ text: 'Send an email from the web site to your co-worker.' }],
  },
  check(context) {
    const matches: Match[] = []

    for (const group of lexicalConsistencyGroups) {
      const usedVariants = group.variants
        .map((variant) => ({
          variant,
          matches: findTokenPhraseMatches(context, [{ phrase: variant }]),
        }))
        .filter((entry) => entry.matches.length > 0)

      if (usedVariants.length === 0) {
        continue
      }

      for (const entry of usedVariants) {
        if (entry.variant === group.preferred) {
          continue
        }

        for (const matchedPhrase of entry.matches) {
          const firstToken = matchedPhrase.tokens[0]
          const lastToken = matchedPhrase.tokens.at(-1) ?? firstToken
          const groupLabel = group.name.replace(/\s+style$/iu, '').toLowerCase()
          matches.push(
            createMatch({
              text: context.text,
              offset: firstToken.offset,
              length: lastToken.offset + lastToken.length - firstToken.offset,
              message: `Use "${group.preferred}" consistently instead of mixing ${groupLabel} variants.`,
              replacements: [group.preferred],
              rule: lexicalConsistencyRule,
            }),
          )
        }
      }
    }

    return matches
  },
}

export const languageVariantsRules = [
  mixedLanguageVariantsRule,
  documentVariantConsistencyRule,
  lexicalConsistencyRule,
]
