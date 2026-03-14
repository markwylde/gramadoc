import { hasPosHint, isContentWord } from '../../../linguistics.js'
import { isLikelyPastParticipleMorphology } from '../../../morphology.js'
import { nounStackAllowedPhrases } from '../../../resources/noun-stacks.js'
import { technicalAllowlist } from '../../../resources/technical-allowlist.js'
import {
  houseStyleWordingPatterns,
  type PhraseRewritePattern,
  redundantPhrasePatterns,
  sentenceFinalReadabilityWords,
  sentenceInitialReadabilityWords,
  sentenceStartNumberReplacements,
  wordyPhraseReplacementPatterns,
  wordyPhraseSuggestionPatterns,
} from '../../../resources/wordiness.js'
import {
  findTokenPhraseMatches,
  getClausePredicateTokens,
  getPhraseHints,
  getPhraseHintTokens,
} from '../../../rule-helpers.js'
import type {
  AnnotationConfidence,
  GrammerRule,
  TextBlockRange,
  Token,
} from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const PASSIVE_AUXILIARIES = new Set([
  'am',
  'are',
  'be',
  'been',
  'being',
  'get',
  'gets',
  'got',
  'is',
  'was',
  'were',
])
const ADJECTIVAL_PARTICIPLES = new Set([
  'based',
  'focused',
  'interested',
  'located',
  'ready',
  'related',
  'tired',
  'used',
])
const OVERUSE_STOPWORDS = new Set([
  'also',
  'because',
  'guide',
  'just',
  'really',
  'that',
  'then',
  'this',
  'very',
  'with',
])
const NOUN_STACK_ALLOWED_PHRASES = new Set<string>(nounStackAllowedPhrases)
const NOUN_STACK_BLOCKED_WORDS = new Set([
  'and',
  'be',
  'but',
  'can',
  'cannot',
  'could',
  'had',
  'has',
  'have',
  'here',
  'if',
  'is',
  'keep',
  'late',
  'looked',
  'one',
  'ordinary',
  'or',
  'removed',
  'stay',
  'than',
  'then',
  'there',
  'three',
  'tonight',
  'two',
  'was',
  'were',
  'will',
  'would',
])
const NOMINALIZATION_SUFFIX =
  /(tion|sion|ment|ness|ity|ship|ance|ence|acy|ism)$/u
const SHORT_FRAGMENT_TOKEN_LIMIT = 3
const PASSIVE_STYLE_BE_WORDS = new Set([
  'am',
  'are',
  'be',
  'been',
  'being',
  'is',
  'was',
  'were',
])

function getTokenBlockKind(token: Token, blockRanges?: TextBlockRange[]) {
  return blockRanges?.find(
    (blockRange) => blockRange.index === token.blockIndex,
  )?.kind
}

function shouldSkipSentenceStyleRule(
  tokensInSentence: Token[],
  blockRanges?: TextBlockRange[],
) {
  const firstToken = tokensInSentence[0]

  if (!firstToken || tokensInSentence.length <= SHORT_FRAGMENT_TOKEN_LIMIT) {
    return true
  }

  const blockKind = getTokenBlockKind(firstToken, blockRanges)
  return blockKind === 'heading' || blockKind === 'list-item'
}

function isTechnicalToken(token: Token) {
  return technicalAllowlist.includes(
    token.normalized as (typeof technicalAllowlist)[number],
  )
}

function isNamedLikeToken(token: Token) {
  return token.isCapitalized || /^[A-Z0-9]{2,}$/u.test(token.value)
}

function isAdjectiveOnlyToken(token: Token) {
  return (
    hasPosHint(token, 'adjective') &&
    !hasPosHint(token, 'noun') &&
    !isTechnicalToken(token)
  )
}

function getNounReading(token: Token) {
  return token.posReadings?.find((reading) => reading.pos === 'noun') ?? null
}

function getNounEvidenceConfidence(token: Token) {
  const nounReading = getNounReading(token)

  if (!nounReading) {
    return null
  }

  if (isTechnicalToken(token) || NOMINALIZATION_SUFFIX.test(token.normalized)) {
    return 'high'
  }

  return nounReading.confidence
}

function hasNominalizationShape(token: Token) {
  return NOMINALIZATION_SUFFIX.test(token.normalized)
}

function isLikelyNounPhraseToken(token: Token) {
  if (
    token.isNumberLike ||
    !/^[A-Za-z][A-Za-z0-9-]*$/u.test(token.value) ||
    NOUN_STACK_BLOCKED_WORDS.has(token.normalized) ||
    isAdjectiveOnlyToken(token)
  ) {
    return false
  }

  if (
    hasPosHint(token, 'preposition') ||
    hasPosHint(token, 'pronoun') ||
    hasPosHint(token, 'modal') ||
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'adverb')
  ) {
    return false
  }

  if (isStrongNounStackToken(token) || hasPosHint(token, 'determiner')) {
    return true
  }

  return hasPosHint(token, 'noun') && !token.usedFallbackPosGuess
}

function isStrongNounStackToken(token: Token) {
  if (isTechnicalToken(token)) {
    return true
  }

  if (
    hasPosHint(token, 'noun') &&
    !hasPosHint(token, 'verb') &&
    !hasPosHint(token, 'adjective')
  ) {
    return true
  }

  return hasNominalizationShape(token) || token.isPluralLike
}

function getNounStackPhrase(tokens: Token[]) {
  return tokens.map((token) => token.normalized).join(' ')
}

function isAllowedNounStack(tokens: Token[]) {
  const phrase = getNounStackPhrase(tokens)
  const allContentTokensAreTechnical = tokens.every(
    (token) => hasPosHint(token, 'determiner') || isTechnicalToken(token),
  )

  return (
    NOUN_STACK_ALLOWED_PHRASES.has(phrase) ||
    allContentTokensAreTechnical ||
    tokens.some((token) => isNamedLikeToken(token))
  )
}

function getNounStackTail(tokens: Token[]) {
  const tail: Token[] = []

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index]

    if (!isLikelyNounPhraseToken(token) || hasPosHint(token, 'determiner')) {
      if (tail.length > 0) {
        break
      }

      continue
    }

    tail.unshift(token)
  }

  return tail
}

function getTokenGroupConfidence(tokens: Token[]) {
  if (tokens.some((token) => token.posHintConfidence === 'low')) {
    return 'low'
  }

  if (tokens.some((token) => token.posHintConfidence === 'medium')) {
    return 'medium'
  }

  return 'high'
}

function buildNounStackEvidence(tokens: Token[]) {
  const strongNounCount = tokens.filter(isStrongNounStackToken).length
  const fallbackOnlyCount = tokens.filter(
    (token) => getNounEvidenceConfidence(token) === 'low',
  ).length
  const technicalTokenCount = tokens.filter(isTechnicalToken).length
  const nominalizationCount = tokens.filter(hasNominalizationShape).length

  return {
    strongNounCount,
    fallbackOnlyCount,
    technicalTokenCount,
    nominalizationCount,
  }
}

interface QualifiedNounStackCandidate {
  phraseHint: ReturnType<typeof getPhraseHints>[number]
  tokens: Token[]
  tokenGroupConfidence: AnnotationConfidence
  evidence: ReturnType<typeof buildNounStackEvidence>
}

function getQualifiedNounStackCandidates(
  context: Parameters<GrammerRule['check']>[0],
): QualifiedNounStackCandidate[] {
  return getPhraseHints(context, { kind: 'noun-phrase' }).flatMap(
    (phraseHint) => {
      const tokens = getNounStackTail(getPhraseHintTokens(context, phraseHint))
      const tokenGroupConfidence = getTokenGroupConfidence(tokens)

      if (
        tokens.length < 3 ||
        tokenGroupConfidence === 'low' ||
        isAllowedNounStack(tokens)
      ) {
        return []
      }

      const evidence = buildNounStackEvidence(tokens)

      if (evidence.strongNounCount < 2 || evidence.fallbackOnlyCount > 0) {
        return []
      }

      return [
        {
          phraseHint,
          tokens,
          tokenGroupConfidence,
          evidence,
        },
      ]
    },
  )
}

function createNounStackMatch(options: {
  context: Parameters<GrammerRule['check']>[0]
  phraseKind: string
  tokens: Token[]
  tokenGroupConfidence: ReturnType<typeof getTokenGroupConfidence>
  rule: GrammerRule
  message: string
  notes: string[]
  evidenceLines: string[]
}) {
  const {
    context,
    phraseKind,
    tokens,
    tokenGroupConfidence,
    rule,
    message,
    notes,
    evidenceLines,
  } = options
  const firstToken = tokens[0]
  const lastToken = tokens.at(-1) ?? firstToken

  return createMatch({
    text: context.text,
    offset: firstToken.offset,
    length: lastToken.offset + lastToken.length - firstToken.offset,
    message,
    confidenceLabel: undefined,
    diagnostics: {
      riskTier: rule.riskTier,
      annotationConfidence: tokenGroupConfidence,
      evidence: [
        `Matched noun phrase "${tokens.map((token) => token.value).join(' ')}".`,
        ...evidenceLines,
      ],
      notes,
      triggerTokens: tokens.map((token) => token.value),
    },
    details: {
      phraseKind,
    },
    rule,
  })
}

function isQuotedPhraseMention(firstToken: Token, lastToken: Token) {
  return (
    /["'`“”‘’]/u.test(firstToken.leadingText) ||
    /["'`“”‘’]/u.test(lastToken.trailingText)
  )
}

function shouldSkipPhraseRewriteMatch(
  text: string,
  firstToken: Token,
  lastToken: Token,
  entry: PhraseRewritePattern,
) {
  if (isQuotedPhraseMention(firstToken, lastToken)) {
    return true
  }

  const phraseStart = firstToken.offset
  const phraseEnd = lastToken.offset + lastToken.length
  const precedingText = text
    .slice(Math.max(0, phraseStart - 64), phraseStart)
    .toLowerCase()
  const followingText = text.slice(
    phraseEnd,
    Math.min(text.length, phraseEnd + 32),
  )

  return (
    entry.antiPatterns?.some((antiPattern) => {
      if (antiPattern.precedingTextPattern?.test(precedingText)) {
        return true
      }

      if (antiPattern.followingTextPattern?.test(followingText)) {
        return true
      }

      return false
    }) ?? false
  )
}

function createPhraseRule(options: {
  id: string
  name: string
  description: string
  phrases: PhraseRewritePattern[]
}) {
  const { id, name, description, phrases } = options

  const rule: GrammerRule = {
    id,
    name,
    description,
    shortMessage: 'Style',
    issueType: 'style',
    category: {
      id: 'WORDINESS',
      name: 'Wordiness',
    },
    examples: {
      good: [],
      bad: [],
    },
    check(context) {
      return findTokenPhraseMatches(context, phrases).flatMap(
        ({ entry, tokens }) => {
          const firstToken = tokens[0]
          const lastToken = tokens.at(-1) ?? firstToken

          if (
            shouldSkipPhraseRewriteMatch(
              context.text,
              firstToken,
              lastToken,
              entry,
            )
          ) {
            return []
          }

          return createMatch({
            text: context.text,
            offset: firstToken.offset,
            length: lastToken.offset + lastToken.length - firstToken.offset,
            message: entry.message,
            replacements: (entry.replacements ?? []).map((replacement) =>
              preserveCase(firstToken.value, replacement),
            ),
            rule,
          })
        },
      )
    },
  }

  return rule
}

export const redundantPhraseRule = createPhraseRule({
  id: 'REDUNDANT_PHRASE',
  name: 'Redundant Phrase',
  description:
    'Flags a curated pack of phrases that repeat the same idea unnecessarily.',
  phrases: redundantPhrasePatterns,
})

export const wordyPhraseRule = createPhraseRule({
  id: 'WORDY_PHRASE',
  name: 'Wordy Phrase',
  description:
    'Flags a curated pack of longer phrases with predictable plain-English rewrites.',
  phrases: wordyPhraseReplacementPatterns,
})

export const wordyPhraseSuggestionRule = createPhraseRule({
  id: 'WORDY_PHRASE_SUGGESTION',
  name: 'Wordy Phrase Suggestion',
  description:
    'Flags curated plain-English opportunities where the best rewrite depends on tone and context.',
  phrases: wordyPhraseSuggestionPatterns,
})

export const houseStyleWordingRule = createPhraseRule({
  id: 'HOUSE_STYLE_WORDING',
  name: 'House-Style Wording',
  description:
    'Flags an editorial pack of deictic CTA phrases that should name the destination instead.',
  phrases: houseStyleWordingPatterns,
})

export const longSentenceRule: GrammerRule = {
  id: 'LONG_SENTENCE',
  name: 'Long Sentence',
  description:
    'Flags sentences that are long enough to become hard to scan in technical prose.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [{ text: 'Keep each sentence focused on one idea.' }],
    bad: [
      {
        text: 'This sentence keeps layering clause after clause until the reader has to hold too many ideas in working memory before the point becomes clear and actionable.',
      },
    ],
  },
  check({ text, sentenceRanges, sentenceTokens }) {
    return sentenceRanges.flatMap((sentenceRange, sentenceIndex) => {
      const tokensInSentence = sentenceTokens[sentenceIndex] ?? []

      if (tokensInSentence.length <= 35) {
        return []
      }

      return [
        createMatch({
          text,
          offset: sentenceRange.start,
          length: sentenceRange.end - sentenceRange.start,
          message:
            'This sentence is long. Consider splitting it into shorter sentences.',
          rule: longSentenceRule,
        }),
      ]
    })
  },
}

export const longParagraphRule: GrammerRule = {
  id: 'LONG_PARAGRAPH',
  name: 'Long Paragraph',
  description:
    'Flags paragraphs that are unusually dense for documentation-style writing.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [{ text: 'Short paragraph.\n\nAnother short paragraph.' }],
    bad: [
      {
        text: 'This paragraph keeps expanding with sentence after sentence until it becomes a dense wall of text that makes the structure of the explanation harder to scan, especially in documentation where readers are often trying to extract one concrete action quickly.\n\nShort follow-up paragraph.',
      },
    ],
  },
  check({ text, paragraphRanges, paragraphTokens }) {
    return paragraphRanges.flatMap((paragraphRange, paragraphIndex) => {
      const tokensInParagraph = paragraphTokens[paragraphIndex] ?? []

      if (tokensInParagraph.length <= 60) {
        return []
      }

      return [
        createMatch({
          text,
          offset: paragraphRange.start,
          length: paragraphRange.end - paragraphRange.start,
          message:
            'This paragraph is long. Consider splitting it into shorter paragraphs.',
          rule: longParagraphRule,
        }),
      ]
    })
  },
}

export const passiveVoiceRule: GrammerRule = {
  id: 'PASSIVE_VOICE',
  name: 'Passive Voice',
  description:
    'Flags likely passive constructions built from a be/get auxiliary and a past participle.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [{ text: 'The team shipped the release yesterday.' }],
    bad: [{ text: 'The release was shipped yesterday.' }],
  },
  check({ text, clauseTokens }) {
    return clauseTokens.flatMap((tokensInClause) => {
      const predicateTokens = getClausePredicateTokens(tokensInClause)

      for (let index = 0; index < predicateTokens.length - 1; index += 1) {
        const auxiliary = predicateTokens[index]
        const participle = predicateTokens[index + 1]

        if (
          !PASSIVE_AUXILIARIES.has(auxiliary.normalized) ||
          !isLikelyPastParticipleMorphology(participle) ||
          ADJECTIVAL_PARTICIPLES.has(participle.normalized) ||
          !/^\s+$/u.test(auxiliary.trailingText)
        ) {
          continue
        }

        return [
          createMatch({
            text,
            offset: auxiliary.offset,
            length: participle.offset + participle.length - auxiliary.offset,
            message:
              'This looks like passive voice. Consider naming the actor directly if clarity matters.',
            rule: passiveVoiceRule,
          }),
        ]
      }

      return []
    })
  },
}

export const sentenceStartNumberRule: GrammerRule = {
  id: 'SENTENCE_START_NUMBER',
  name: 'Sentence-Start Number',
  description:
    'Flags small digits at the start of running sentences, where spelling them out is usually clearer.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [
      { text: 'Three steps remain before launch.' },
      { text: 'The report lists 3 remaining tasks.' },
    ],
    bad: [{ text: '3 steps remain before launch.' }],
  },
  check({ text, sentenceRanges, sentenceTokens, blockRanges }) {
    return sentenceRanges.flatMap((sentenceRange, sentenceIndex) => {
      const tokensInSentence = sentenceTokens[sentenceIndex] ?? []

      if (shouldSkipSentenceStyleRule(tokensInSentence, blockRanges)) {
        return []
      }

      const match = /^\s*(\d{1,2})\b/u.exec(sentenceRange.text)

      if (!match) {
        return []
      }

      const replacement = sentenceStartNumberReplacements[match[1]]

      if (!replacement) {
        return []
      }

      const numberOffset =
        sentenceRange.start + (match.index ?? 0) + match[0].indexOf(match[1])

      return [
        createMatch({
          text,
          offset: numberOffset,
          length: match[1].length,
          message: `Spell out "${match[1]}" at the start of this sentence.`,
          replacements: [replacement],
          rule: sentenceStartNumberRule,
        }),
      ]
    })
  },
}

export const sentenceInitialReadabilityRule: GrammerRule = {
  id: 'SENTENCE_INITIAL_READABILITY',
  name: 'Sentence-Initial Readability',
  description:
    'Flags a small set of sentence-opening adverbs that often read more clearly when rewritten directly.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [{ text: 'I hope the rollout lands today.' }],
    bad: [{ text: 'Hopefully, the rollout lands today.' }],
  },
  check({ text, sentenceTokens, blockRanges }) {
    return sentenceTokens.flatMap((tokensInSentence) => {
      const firstToken = tokensInSentence[0]

      if (
        !firstToken ||
        !firstToken.isSentenceStart ||
        shouldSkipSentenceStyleRule(tokensInSentence, blockRanges)
      ) {
        return []
      }

      const matchEntry = sentenceInitialReadabilityWords.find(
        (entry) => entry.word === firstToken.normalized,
      )

      if (!matchEntry) {
        return []
      }

      return [
        createMatch({
          text,
          offset: firstToken.offset,
          length: firstToken.length,
          message: matchEntry.message,
          rule: sentenceInitialReadabilityRule,
        }),
      ]
    })
  },
}

export const sentenceFinalReadabilityRule: GrammerRule = {
  id: 'SENTENCE_FINAL_READABILITY',
  name: 'Sentence-Final Readability',
  description:
    'Flags a small set of sentence-final adverbs that usually read more smoothly earlier in the sentence.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [{ text: 'We also updated the onboarding guide.' }],
    bad: [{ text: 'We updated the onboarding guide also.' }],
  },
  check({ text, sentenceTokens, blockRanges }) {
    return sentenceTokens.flatMap((tokensInSentence) => {
      const lastToken = tokensInSentence.at(-1)

      if (
        !lastToken ||
        !lastToken.isSentenceEnd ||
        shouldSkipSentenceStyleRule(tokensInSentence, blockRanges)
      ) {
        return []
      }

      const matchEntry = sentenceFinalReadabilityWords.find(
        (entry) => entry.word === lastToken.normalized,
      )

      if (!matchEntry) {
        return []
      }

      return [
        createMatch({
          text,
          offset: lastToken.offset,
          length: lastToken.length,
          message: matchEntry.message,
          rule: sentenceFinalReadabilityRule,
        }),
      ]
    })
  },
}

export const ableToBeRule: GrammerRule = {
  id: 'ABLE_TO_BE',
  name: 'Able To Be',
  description:
    'Flags awkward "be able to be ..." phrasing that usually reads better when rewritten with a direct active verb.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [{ text: 'Admins can configure the feature.' }],
    bad: [{ text: 'The feature is able to be configured by admins.' }],
  },
  check({ text, clauseTokens, blockRanges }) {
    return clauseTokens.flatMap((tokensInClause) => {
      if (shouldSkipSentenceStyleRule(tokensInClause, blockRanges)) {
        return []
      }

      for (let index = 0; index < tokensInClause.length - 4; index += 1) {
        const firstBeToken = tokensInClause[index]
        const ableToken = tokensInClause[index + 1]
        const toToken = tokensInClause[index + 2]
        const secondBeToken = tokensInClause[index + 3]
        const participleToken = tokensInClause[index + 4]

        if (
          !PASSIVE_STYLE_BE_WORDS.has(firstBeToken.normalized) ||
          ableToken.normalized !== 'able' ||
          toToken.normalized !== 'to' ||
          secondBeToken.normalized !== 'be' ||
          !/^(?:\w+ed|\w+en|built|done|found|given|known|left|made|run|seen|shown|taken|written)$/u.test(
            participleToken.normalized,
          )
        ) {
          continue
        }

        return [
          createMatch({
            text,
            offset: firstBeToken.offset,
            length:
              participleToken.offset +
              participleToken.length -
              firstBeToken.offset,
            message:
              'This "able to be" phrasing is hard to scan. Rewrite it with a more direct active verb if possible.',
            rule: ableToBeRule,
          }),
        ]
      }

      return []
    })
  },
}

export const overusedWordRule: GrammerRule = {
  id: 'OVERUSED_WORD',
  name: 'Overused Word',
  description:
    'Flags content words that dominate the document and may benefit from pruning or variation.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  examples: {
    good: [{ text: 'The guide is concise and the explanation stays varied.' }],
    bad: [
      {
        text: 'This process improves the process because the process keeps the process stable.',
      },
    ],
  },
  check({ text, tokens, wordCounts, documentStats }) {
    return Object.entries(wordCounts).flatMap(([word, count]) => {
      if (
        count < 4 ||
        count / Math.max(documentStats.wordCount, 1) < 0.08 ||
        technicalAllowlist.includes(
          word as (typeof technicalAllowlist)[number],
        ) ||
        OVERUSE_STOPWORDS.has(word)
      ) {
        return []
      }

      const firstToken = tokens.find(
        (token) => token.normalized === word && isContentWord(token),
      )

      if (!firstToken || word.length < 4) {
        return []
      }

      return [
        createMatch({
          text,
          offset: firstToken.offset,
          length: firstToken.length,
          message: `The word "${firstToken.value}" appears ${count} times. Consider trimming repetition or varying the wording.`,
          rule: overusedWordRule,
        }),
      ]
    })
  },
}

export const technicalNounClusterRule: GrammerRule = {
  id: 'TECHNICAL_NOUN_CLUSTER',
  name: 'Technical Noun Cluster',
  description:
    'Flags dense technical noun clusters where several content nouns are packed together without clear connectors.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  riskTier: 'risky',
  examples: {
    good: [
      { text: 'Update the API response body before shipping the guide.' },
      { text: 'Keep the customer support team informed.' },
    ],
    bad: [
      {
        text: 'Open the deployment configuration validation settings for triage.',
      },
    ],
  },
  check(context) {
    return getQualifiedNounStackCandidates(context).flatMap(
      ({ phraseHint, tokens, tokenGroupConfidence, evidence }) => {
        if (
          tokens.length < 4 ||
          evidence.technicalTokenCount + evidence.nominalizationCount < 2
        ) {
          return []
        }

        return [
          createNounStackMatch({
            context,
            phraseKind: phraseHint.kind,
            tokens,
            tokenGroupConfidence,
            rule: technicalNounClusterRule,
            message:
              'This dense technical noun cluster is hard to parse. Consider adding a preposition, hyphen, or shorter rewrite.',
            evidenceLines: [
              `Strong noun evidence on ${evidence.strongNounCount} of ${tokens.length} tokens.`,
              `Technical or nominalized tokens: ${evidence.technicalTokenCount + evidence.nominalizationCount}.`,
            ],
            notes: [
              'Fallback-only noun guesses were ignored for this style warning.',
              'This narrower rule focuses on dense technical compounds rather than any generic noun sequence.',
            ],
          }),
        ]
      },
    )
  },
}

export const nominalizationPileupRule: GrammerRule = {
  id: 'NOMINALIZATION_PILEUP',
  name: 'Nominalization Pileup',
  description:
    'Flags shorter noun-heavy phrases driven by stacked nominalizations, which often read more clearly as verbs or with a preposition.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORDINESS',
    name: 'Wordiness',
  },
  riskTier: 'risky',
  examples: {
    good: [
      { text: 'Review the approval notes before launch.' },
      { text: 'The team validated the configuration before deployment.' },
    ],
    bad: [{ text: 'Review the documentation management notes before launch.' }],
  },
  check(context) {
    return getQualifiedNounStackCandidates(context).flatMap(
      ({ phraseHint, tokens, tokenGroupConfidence, evidence }) => {
        if (
          tokens.length !== 3 ||
          evidence.nominalizationCount < 2 ||
          evidence.technicalTokenCount > 0
        ) {
          return []
        }

        return [
          createNounStackMatch({
            context,
            phraseKind: phraseHint.kind,
            tokens,
            tokenGroupConfidence,
            rule: nominalizationPileupRule,
            message:
              'This nominalization-heavy phrase may be hard to scan. Consider rewriting it with a verb or preposition.',
            evidenceLines: [
              `Strong noun evidence on ${evidence.strongNounCount} of ${tokens.length} tokens.`,
              `Nominalized tokens: ${evidence.nominalizationCount}.`,
            ],
            notes: [
              'Fallback-only noun guesses were ignored for this style warning.',
              'This narrower rule targets nominalization pileups instead of all noun phrases.',
            ],
          }),
        ]
      },
    )
  },
}

export const nounStackRule = nominalizationPileupRule

export const wordinessRules = [
  redundantPhraseRule,
  wordyPhraseRule,
  wordyPhraseSuggestionRule,
  houseStyleWordingRule,
  longSentenceRule,
  longParagraphRule,
  passiveVoiceRule,
  sentenceStartNumberRule,
  sentenceInitialReadabilityRule,
  sentenceFinalReadabilityRule,
  ableToBeRule,
  nominalizationPileupRule,
  technicalNounClusterRule,
  overusedWordRule,
]
