import { rankConfusionCandidates } from '../../../confusion.js'
import { homophoneConfusionSets } from '../../../resources/confusion-sets.js'
import { isOffsetInsideStructuredText } from '../../../rule-helpers.js'
import type { GrammerRule, RuleCheckContext, Token } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'
import {
  classifyUnknownWord,
  hasSupportedWordCasing,
  shouldAnalyzeSpellingWord,
  type UnknownWordKind,
} from './helpers.js'

function isInsideHeadingBlock(
  offset: number,
  blockRanges?: { start: number; end: number; kind: string }[],
) {
  if (!blockRanges?.length) {
    return false
  }

  return blockRanges.some(
    (blockRange) =>
      blockRange.kind === 'heading' &&
      offset >= blockRange.start &&
      offset < blockRange.end,
  )
}

interface SpellingFinding {
  token: Token
  kind: UnknownWordKind
  suggestions: string[]
}

function isHyphenBoundToken(token: Token) {
  return token.leadingText.includes('-') || token.trailingText.includes('-')
}

const spellingFindingsCache = new WeakMap<RuleCheckContext, SpellingFinding[]>()

function getSpellingFindings(context: RuleCheckContext) {
  const cached = spellingFindingsCache.get(context)

  if (cached) {
    return cached
  }

  const findings = context.tokens.flatMap((token) => {
    const isLowercaseWord = token.value === token.normalized
    const isHeadingWord = isInsideHeadingBlock(
      token.offset,
      context.blockRanges,
    )

    if (
      !shouldAnalyzeSpellingWord(token.normalized) ||
      !hasSupportedWordCasing(token.value) ||
      token.value === token.value.toUpperCase() ||
      (!isLowercaseWord && !isHeadingWord) ||
      isOffsetInsideStructuredText(context, token.offset, [
        'email',
        'identifier',
        'url',
      ])
    ) {
      return []
    }

    const classification = classifyUnknownWord(token.value)

    if (!classification) {
      return []
    }

    return [
      {
        token,
        kind: classification.kind,
        suggestions: classification.suggestions,
      } satisfies SpellingFinding,
    ]
  })

  spellingFindingsCache.set(context, findings)
  return findings
}

function createSpellingRule(options: {
  id: string
  name: string
  description: string
  message: (word: string) => string
  kind:
    | 'TYPOGRAPHICAL_ERRORS'
    | 'TRANSPOSED_LETTERS'
    | 'MISSING_LETTERS'
    | 'EXTRA_LETTERS'
    | 'MISSPELLED_WORDS'
    | 'NON_DICTIONARY_WORDS'
}) {
  const { id, name, description, message, kind } = options

  const rule: GrammerRule = {
    id,
    name,
    description,
    shortMessage: 'Spelling',
    issueType: 'misspelling',
    category: {
      id: 'BASIC_SPELLING',
      name: 'Basic Spelling',
    },
    examples: {
      good: [],
      bad: [],
    },
    check(context) {
      return getSpellingFindings(context)
        .filter((finding) => finding.kind === kind)
        .map((finding) =>
          createMatch({
            text: context.text,
            offset: finding.token.offset,
            length: finding.token.length,
            message: message(finding.token.value),
            replacements: finding.suggestions.map((suggestion) =>
              preserveCase(finding.token.value, suggestion),
            ),
            rule,
          }),
        )
    },
  }

  return rule
}

export const typographicalErrorsRule = createSpellingRule({
  id: 'TYPOGRAPHICAL_ERRORS',
  name: 'Typographical Errors',
  description:
    'Flags words with a likely single-letter typing substitution and suggests a correction.',
  message: (word) => `"${word}" looks like a typographical error.`,
  kind: 'TYPOGRAPHICAL_ERRORS',
})

export const misspelledWordsRule = createSpellingRule({
  id: 'MISSPELLED_WORDS',
  name: 'Misspelled Words',
  description:
    'Flags words that are close to a known dictionary word but still spelled incorrectly.',
  message: (word) => `"${word}" appears to be misspelled.`,
  kind: 'MISSPELLED_WORDS',
})

export const transposedLettersRule = createSpellingRule({
  id: 'TRANSPOSED_LETTERS',
  name: 'Transposed Letters',
  description:
    'Flags words that look like a known word with two adjacent letters swapped.',
  message: (word) => `"${word}" looks like it contains transposed letters.`,
  kind: 'TRANSPOSED_LETTERS',
})

export const missingLettersRule = createSpellingRule({
  id: 'MISSING_LETTERS',
  name: 'Missing Letters',
  description:
    'Flags words that appear to be missing a single letter from a known word.',
  message: (word) => `"${word}" appears to be missing a letter.`,
  kind: 'MISSING_LETTERS',
})

export const extraLettersRule = createSpellingRule({
  id: 'EXTRA_LETTERS',
  name: 'Extra Letters',
  description:
    'Flags words that appear to contain one extra letter compared with a known word.',
  message: (word) => `"${word}" appears to contain an extra letter.`,
  kind: 'EXTRA_LETTERS',
})

export const nonDictionaryWordsRule = createSpellingRule({
  id: 'NON_DICTIONARY_WORDS',
  name: 'Non-Dictionary Words',
  description:
    'Flags lowercase words that are not recognized and do not closely match the English dictionary.',
  message: (word) => `"${word}" is not in the English dictionary.`,
  kind: 'NON_DICTIONARY_WORDS',
})

const DIACRITIC_REPLACEMENTS: Record<string, string> = {
  fiance: 'fiancé',
  jalapeno: 'jalapeño',
  naive: 'naïve',
  senor: 'señor',
}

export const homophoneSpellingMistakesRule: GrammerRule = {
  id: 'HOMOPHONE_SPELLING_MISTAKES',
  name: 'Homophone Spelling Mistakes',
  description:
    'Flags common homophone confusions when nearby words make the intended meaning clear.',
  shortMessage: 'Spelling',
  issueType: 'misspelling',
  category: {
    id: 'BASIC_SPELLING',
    name: 'Basic Spelling',
  },
  examples: {
    good: [
      { text: "You're welcome to join us." },
      { text: 'Their team arrived early.' },
    ],
    bad: [
      { text: 'Your welcome to join us.' },
      { text: 'There team arrived early.' },
    ],
  },
  check(context) {
    return context.tokens.flatMap((token, index) => {
      if (isHyphenBoundToken(token)) {
        return []
      }

      const confusionSet = homophoneConfusionSets.find((set) =>
        set.forms.includes(token.normalized),
      )

      if (!confusionSet) {
        return []
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
        return []
      }

      if (bestScore < (confusionSet.minimumScore ?? 1)) {
        return []
      }

      if (bestScore - currentScore < (confusionSet.minimumAdvantage ?? 2)) {
        return []
      }

      return [
        createMatch({
          text: context.text,
          offset: token.offset,
          length: token.length,
          message: confusionSet.message,
          replacements: [preserveCase(token.value, bestCandidate.value)],
          rule: homophoneSpellingMistakesRule,
        }),
      ]
    })
  },
}

export const incorrectDiacriticsRule: GrammerRule = {
  id: 'INCORRECT_DIACRITICS',
  name: 'Incorrect Diacritics',
  description:
    'Flags a small set of borrowed words that are commonly written without their expected diacritics.',
  shortMessage: 'Spelling',
  issueType: 'misspelling',
  category: {
    id: 'BASIC_SPELLING',
    name: 'Basic Spelling',
  },
  examples: {
    good: [
      { text: 'The jalapeño was surprisingly mild.' },
      { text: 'He described the idea as naïve.' },
    ],
    bad: [
      { text: 'The jalapeno was surprisingly mild.' },
      { text: 'He described the idea as naive.' },
    ],
  },
  check({ text, tokens }) {
    return tokens.flatMap((token) => {
      const replacement = DIACRITIC_REPLACEMENTS[token.normalized]

      if (!replacement) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use "${replacement}" for this borrowed word.`,
          replacements: [preserveCase(token.value, replacement)],
          rule: incorrectDiacriticsRule,
        }),
      ]
    })
  },
}

misspelledWordsRule.examples = {
  good: [
    { text: 'This sentence has a spelled word.' },
    { text: 'I ate lunch before the trip.' },
  ],
  bad: [
    { text: 'This sentence has a misspelled grahmar.' },
    { text: 'I ate coffea before the trip.' },
  ],
}

typographicalErrorsRule.examples = {
  good: [{ text: 'The report was very clear.' }],
  bad: [{ text: 'The report was very clebr.' }],
}

transposedLettersRule.examples = {
  good: [{ text: 'This sentence uses the word correctly.' }],
  bad: [{ text: 'This sentence uses teh word incorrectly.' }],
}

missingLettersRule.examples = {
  good: [{ text: 'The writer sent a simple message.' }],
  bad: [{ text: 'The writer sent a simpl message.' }],
}

extraLettersRule.examples = {
  good: [{ text: 'The editor fixed the paragraph.' }],
  bad: [{ text: 'The editor fixed the paragraphh.' }],
}

nonDictionaryWordsRule.examples = {
  good: [{ text: 'The message is clear.' }],
  bad: [{ text: 'The message contains zqxv.' }],
}

export const spellingRule = misspelledWordsRule

export const basicSpellingRules = [
  typographicalErrorsRule,
  misspelledWordsRule,
  transposedLettersRule,
  missingLettersRule,
  extraLettersRule,
  incorrectDiacriticsRule,
  nonDictionaryWordsRule,
]
