import { createSingleWordPatternRule } from '../../../patterns.js'
import {
  chatShorthandPatterns,
  informalContractionPatterns,
  mildProfanityPatterns,
  offensiveLanguagePatterns,
  type ProfanityTonePattern,
} from '../../../resources/informality-tone.js'
import type { RuleCheckContext } from '../../../types.js'
import { preserveCase } from '../../../utils.js'

function isLowercaseWord(value: string) {
  return value === value.toLowerCase()
}

function isQuotedExample(token: { leadingText: string; trailingText: string }) {
  return (
    /["'`“”‘’]/u.test(token.leadingText) ||
    /["'`“”‘’]/u.test(token.trailingText)
  )
}

const POLICY_CONTEXT_WORDS = new Set([
  'allow',
  'allowed',
  'ban',
  'banned',
  'block',
  'blocked',
  'content',
  'docs',
  'documentation',
  'example',
  'examples',
  'filter',
  'filters',
  'flag',
  'flagged',
  'moderation',
  'policy',
  'policies',
  'profanity',
  'quote',
  'quoted',
  'slur',
  'slurs',
  'term',
  'terms',
  'word',
  'words',
])

function isSentencePolicyContext(
  context: RuleCheckContext,
  sentenceIndex: number,
) {
  const sentenceTokens = context.sentenceTokens[sentenceIndex] ?? []

  return sentenceTokens.some((candidate) =>
    POLICY_CONTEXT_WORDS.has(candidate.normalized),
  )
}

function shouldSuppressProfanityMatch(
  pattern: ProfanityTonePattern,
  token: {
    leadingText: string
    trailingText: string
    sentenceIndex: number
  },
  context: RuleCheckContext,
) {
  if (isQuotedExample(token)) {
    return true
  }

  if (isSentencePolicyContext(context, token.sentenceIndex)) {
    return pattern.allowInPolicyContext !== true
  }

  return false
}

export const chatShorthandRule = createSingleWordPatternRule({
  id: 'CHAT_SHORTHAND',
  name: 'Chat Shorthand',
  description:
    'Flags a curated set of chat-style abbreviations that are usually too informal for general prose.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'INFORMALITY_TONE',
    name: 'Informality & Tone',
  },
  examples: {
    good: [{ text: 'Please review the draft and let me know what you think.' }],
    bad: [{ text: 'Pls review the draft, btw I am still editing it.' }],
  },
  patterns: chatShorthandPatterns,
  message: (pattern) => pattern.message,
  replacements: (pattern, token) => [
    preserveCase(token.value, pattern.replacement),
  ],
  filter: (pattern, token) =>
    !isQuotedExample(token) &&
    (!pattern.requireLowercaseSurface || isLowercaseWord(token.value)),
})

export const informalContractionRule = createSingleWordPatternRule({
  id: 'INFORMAL_CONTRACTION',
  name: 'Informal Contraction',
  description:
    'Flags a curated set of informal spoken contractions that are often too casual for neutral prose.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'INFORMALITY_TONE',
    name: 'Informality & Tone',
  },
  examples: {
    good: [{ text: 'We are going to finish this today.' }],
    bad: [{ text: 'We are gonna finish this today.' }],
  },
  patterns: informalContractionPatterns,
  message: (pattern) => pattern.message,
  replacements: (pattern, token) => [
    preserveCase(token.value, pattern.replacement),
  ],
  filter: (_pattern, token) => !isQuotedExample(token),
})

export const mildProfanityRule = createSingleWordPatternRule({
  id: 'MILD_PROFANITY',
  name: 'Mild Profanity',
  description:
    'Flags milder profanity in neutral prose and suggests more editorial alternatives.',
  shortMessage: 'Tone',
  issueType: 'style',
  category: {
    id: 'INFORMALITY_TONE',
    name: 'Informality & Tone',
  },
  examples: {
    good: [{ text: 'The release hit a problem, but we fixed it.' }],
    bad: [{ text: 'The release hit a shit problem, but we fixed it.' }],
  },
  patterns: mildProfanityPatterns,
  message: (pattern) => pattern.message,
  replacements: (pattern, token) => [
    preserveCase(token.value, pattern.replacement),
  ],
  filter: (pattern, token, context) =>
    !shouldSuppressProfanityMatch(pattern, token, context),
})

export const offensiveLanguageRule = createSingleWordPatternRule({
  id: 'OFFENSIVE_LANGUAGE',
  name: 'Offensive Language',
  description:
    'Flags offensive or potentially harmful wording and suggests safer alternatives for general prose.',
  shortMessage: 'Tone',
  issueType: 'style',
  category: {
    id: 'INFORMALITY_TONE',
    name: 'Informality & Tone',
  },
  examples: {
    good: [{ text: 'The fallback is broken, so we should rewrite it.' }],
    bad: [{ text: 'The fallback is retarded, so we should rewrite it.' }],
  },
  patterns: offensiveLanguagePatterns,
  message: (pattern) => pattern.message,
  replacements: (pattern, token) => [
    preserveCase(token.value, pattern.replacement),
  ],
  filter: (pattern, token, context) =>
    !shouldSuppressProfanityMatch(pattern, token, context),
})

export const informalityToneRules = [
  chatShorthandRule,
  informalContractionRule,
  mildProfanityRule,
  offensiveLanguageRule,
]
