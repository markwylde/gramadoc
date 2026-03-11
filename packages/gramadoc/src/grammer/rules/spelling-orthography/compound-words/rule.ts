import type { Match } from '../../../../types.js'
import { hasPosHint } from '../../../linguistics.js'
import {
  contextualModifierHyphenPatterns,
  hyphenatedCompoundPatterns,
  missingHyphenPatterns,
  unnecessaryHyphenPatterns,
} from '../../../resources/compounds.js'
import { closedOpenCompoundPatterns } from '../../../resources/multiwords.js'
import { findTokenPhraseMatches } from '../../../rule-helpers.js'
import type { GrammerRule, RuleCheckContext, Token } from '../../../types.js'
import { createMatch } from '../../../utils.js'

function createCompoundRule(options: {
  id: string
  name: string
  description: string
  examples: GrammerRule['examples']
  patterns:
    | typeof hyphenatedCompoundPatterns
    | typeof missingHyphenPatterns
    | typeof unnecessaryHyphenPatterns
    | typeof closedOpenCompoundPatterns
}) {
  const { id, name, description, examples, patterns } = options

  const rule: GrammerRule = {
    id,
    name,
    description,
    shortMessage: 'Spelling',
    issueType: 'misspelling',
    category: {
      id: 'COMPOUND_WORDS',
      name: 'Compound Words',
    },
    examples,
    check(context) {
      const matches: Match[] = []

      for (const { entry, tokens } of findTokenPhraseMatches(
        context,
        patterns,
      )) {
        const firstToken = tokens[0]
        const lastToken = tokens.at(-1) ?? firstToken

        matches.push(
          createMatch({
            text: context.text,
            offset: firstToken.offset,
            length: lastToken.offset + lastToken.length - firstToken.offset,
            message: entry.message,
            replacements: [entry.replacement],
            rule,
          }),
        )
      }

      return matches
    },
  }

  return rule
}

function isLikelyFollowingHeadWord(token: Token | undefined) {
  if (!token) {
    return false
  }

  if (hasPosHint(token, 'noun')) {
    return true
  }

  return !(
    hasPosHint(token, 'adjective') ||
    hasPosHint(token, 'adverb') ||
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'determiner') ||
    hasPosHint(token, 'modal') ||
    hasPosHint(token, 'preposition') ||
    hasPosHint(token, 'pronoun')
  )
}

function getContextualModifierMatches(context: RuleCheckContext) {
  return findTokenPhraseMatches(
    context,
    contextualModifierHyphenPatterns,
  ).flatMap(({ entry, tokens }) => {
    const lastToken = tokens.at(-1)

    if (!lastToken) {
      return []
    }

    const nextToken = context.tokens[lastToken.index + 1]

    if (
      !nextToken ||
      nextToken.sentenceIndex !== lastToken.sentenceIndex ||
      !/^\s+$/u.test(nextToken.leadingText)
    ) {
      return []
    }

    const explicitlyAllowed =
      entry.allowedFollowingWords?.includes(nextToken.normalized) ?? false

    if (!explicitlyAllowed && !isLikelyFollowingHeadWord(nextToken)) {
      return []
    }

    return [
      {
        entry,
        tokens: [...tokens, nextToken],
      },
    ]
  })
}

export const hyphenatedCompoundErrorsRule = createCompoundRule({
  id: 'HYPHENATED_COMPOUND_ERRORS',
  name: 'Hyphenated Compound Errors',
  description:
    'Flags a small set of compound modifiers that should use hyphenation.',
  examples: {
    good: [{ text: 'The decision-making process was clear.' }],
    bad: [{ text: 'The decision making process was clear.' }],
  },
  patterns: hyphenatedCompoundPatterns,
})

export const missingHyphenRule = createCompoundRule({
  id: 'MISSING_HYPHEN',
  name: 'Missing Hyphen',
  description: 'Flags known multi-word modifiers that should be hyphenated.',
  examples: {
    good: [{ text: 'She is a well-known author.' }],
    bad: [{ text: 'She is a well known author.' }],
  },
  patterns: missingHyphenPatterns,
})

export const unnecessaryHyphenRule = createCompoundRule({
  id: 'UNNECESSARY_HYPHEN',
  name: 'Unnecessary Hyphen',
  description:
    'Flags known compounds that are typically written as closed words.',
  examples: {
    good: [{ text: 'Please send an email to your coworker.' }],
    bad: [{ text: 'Please send an e-mail to your co-worker.' }],
  },
  patterns: unnecessaryHyphenPatterns,
})

export const contextualModifierHyphenRule: GrammerRule = {
  id: 'CONTEXTUAL_MODIFIER_HYPHEN',
  name: 'Contextual Modifier Hyphen',
  description:
    'Flags selected open compounds when they act as modifiers directly before a noun.',
  shortMessage: 'Spelling',
  issueType: 'misspelling',
  category: {
    id: 'COMPOUND_WORDS',
    name: 'Compound Words',
  },
  examples: {
    good: [
      { text: 'We shipped real-time updates and an end-to-end workflow.' },
    ],
    bad: [{ text: 'We shipped real time updates and an end to end workflow.' }],
  },
  check(context) {
    return getContextualModifierMatches(context).map(({ entry, tokens }) => {
      const firstToken = tokens[0]
      const lastToken = tokens.at(-1) ?? firstToken

      return createMatch({
        text: context.text,
        offset: firstToken.offset,
        length: lastToken.offset + lastToken.length - firstToken.offset,
        message: entry.message,
        replacements: [
          entry.replacement + lastToken.leadingText + lastToken.value,
        ],
        rule: contextualModifierHyphenRule,
      })
    })
  },
}

export const closedVsOpenCompoundsRule = createCompoundRule({
  id: 'CLOSED_VS_OPEN_COMPOUNDS',
  name: 'Closed vs Open Compounds',
  description:
    'Flags a small set of compounds when they are split into separate words.',
  examples: {
    good: [{ text: 'The website linked to the database.' }],
    bad: [{ text: 'The web site linked to the data base.' }],
  },
  patterns: closedOpenCompoundPatterns,
})

export const compoundWordsRules = [
  hyphenatedCompoundErrorsRule,
  missingHyphenRule,
  unnecessaryHyphenRule,
  contextualModifierHyphenRule,
  closedVsOpenCompoundsRule,
]
