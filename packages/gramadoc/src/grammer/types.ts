import type { Match, RuleCategory } from '../types.js'
import type { HouseStyleTerm } from './resources/house-style.js'

export interface Token {
  value: string
  normalized: string
  lemma: string
  lemmaSource: LemmaSource
  lexicalPosHints: TokenPosHint[]
  morphologyPosHints: TokenPosHint[]
  fallbackPosHints: TokenPosHint[]
  contextualPosHints: TokenPosHint[]
  posReadings: TokenPosReading[]
  posHints: TokenPosHint[]
  posHintConfidence: AnnotationConfidence
  usedFallbackPosGuess: boolean
  isOpenClassUnknown: boolean
  isPosAmbiguous: boolean
  disambiguationProvenance: string[]
  offset: number
  length: number
  index: number
  sentenceIndex: number
  clauseIndex: number
  blockIndex: number | null
  leadingText: string
  trailingText: string
  isSentenceStart: boolean
  isSentenceEnd: boolean
  isCapitalized: boolean
  isPluralLike: boolean
  isNumberLike: boolean
  clausePart: ClausePart
}

export type AnnotationConfidence = 'high' | 'medium' | 'low'

export type LemmaSource = 'heuristic' | 'identity' | 'irregular'
export type RuleRiskTier = 'safe' | 'moderate' | 'risky'
export type TokenPosEvidenceSource =
  | 'closed-class-lexicon'
  | 'open-class-lexicon'
  | 'contextual-disambiguation'
  | 'morphology'
  | 'fallback'

export type TokenPosHint =
  | 'adjective'
  | 'adverb'
  | 'auxiliary'
  | 'determiner'
  | 'modal'
  | 'noun'
  | 'preposition'
  | 'pronoun'
  | 'verb'

export interface TokenPosReading {
  pos: TokenPosHint
  sources: TokenPosEvidenceSource[]
  confidence: AnnotationConfidence
}

export type StyleRepetitionPosBucket = 'adjective' | 'noun' | 'verb'

export type PhraseHintKind =
  | 'adverb-phrase'
  | 'multiword-expression'
  | 'noun-phrase'
  | 'prepositional-phrase'
  | 'verb-phrase'

export type TextBlockKind =
  | 'paragraph'
  | 'heading'
  | 'blockquote'
  | 'list-item'
  | 'other'

export interface TextBlockRange {
  index: number
  start: number
  end: number
  tagName: string
  kind: TextBlockKind
  text: string
}

export interface SentenceRange {
  index: number
  start: number
  end: number
  text: string
}

export interface ClauseRange {
  index: number
  sentenceIndex: number
  start: number
  end: number
  text: string
}

export type ClausePart = 'lead' | 'subject' | 'predicate'

export interface PhraseHint {
  kind: PhraseHintKind
  tokenIndexes: number[]
  sentenceIndex: number
  clauseIndex: number
  start: number
  end: number
  text: string
  confidence: AnnotationConfidence
  label?: string
  source?: 'heuristic' | 'lexicon'
}

export interface ParagraphRange {
  index: number
  start: number
  end: number
  text: string
}

export type StructuredTextKind = 'email' | 'identifier' | 'url'

export type StructuredTextSubtype =
  | 'absolute-url'
  | 'bare-www-url'
  | 'double-at-email'
  | 'email-candidate'
  | 'malformed-url-protocol'
  | 'repeated-identifier-separator'
  | 'split-identifier-number'
  | 'uuid-like'

export interface StructuredTextSpan {
  kind: StructuredTextKind
  subtype: StructuredTextSubtype
  start: number
  end: number
  text: string
  sentenceIndex: number | null
  blockIndex: number | null
  details?: Record<string, string>
}

export type GrammerLanguageCode = 'en' | 'en-US' | 'en-GB'

export type GrammerOptionalRulePack =
  | 'creative-writing/e-prime-strict'
  | 'creative-writing/e-prime-loose'
  | 'editorial/unit-conversions'
  | 'editorial/unit-conversions-imperial'
  | 'editorial/unit-conversions-us'
  | 'experimental/contextual-confusions'
  | `l2-false-friends/${string}`

export type NativeLanguageProfile = `l1/${string}`

export type MeasurementPreference = 'metric' | 'imperial' | 'imperial-us'

export interface CreativeWritingOptionalRulePackOptions {
  ePrime?: 'strict' | 'loose' | 'all'
}

export interface EditorialOptionalRulePackOptions {
  unitConversions?: boolean | MeasurementPreference
}

export interface ProfileBasedOptionalRulePackOptions {
  nativeLanguage?: NativeLanguageProfile
  falseFriends?: boolean
}

export interface ExperimentalOptionalRulePackOptions {
  contextualConfusions?: boolean
}

export interface GrammerOptionalRulePackOptions {
  creativeWriting?: CreativeWritingOptionalRulePackOptions
  editorial?: EditorialOptionalRulePackOptions
  profiles?: ProfileBasedOptionalRulePackOptions
  experimental?: ExperimentalOptionalRulePackOptions
}

export interface GrammerAnalysisOptions {
  blockRanges?: TextBlockRange[]
  paragraphRanges?: ParagraphRange[]
  languageCode?: GrammerLanguageCode
  optionalRulePacks?: GrammerOptionalRulePackOptions
  enabledRulePacks?: readonly GrammerOptionalRulePack[]
  nativeLanguageProfile?: NativeLanguageProfile
  measurementPreference?: MeasurementPreference
  houseStyleTerms?: readonly HouseStyleTerm[]
}

export interface DocumentLanguage {
  code: GrammerLanguageCode
  baseCode: 'en'
}

export interface DocumentStats {
  blockCount: number
  paragraphCount: number
  sentenceCount: number
  tokenCount: number
  wordCount: number
}

export type LexicalRuleSeverity = 'suggestion' | 'warning' | 'error'

export interface LexicalRuleExampleCoverage {
  good: string[]
  bad: string[]
}

export interface LexicalRuleMetadata {
  category: string
  severity: LexicalRuleSeverity
  suggestionText?: string
  allowlist?: string[]
  antiPatterns?: string[]
  variantRestrictions?: GrammerLanguageCode[]
  exampleCoverage?: LexicalRuleExampleCoverage
}

export interface RuleScope {
  blockKinds?: TextBlockKind[]
}

export interface GrammerRuleExample {
  text: string
  note?: string
}

export interface GrammerRuleExamples {
  good: GrammerRuleExample[]
  bad: GrammerRuleExample[]
}

export interface RuleCheckContext {
  text: string
  tokens: Token[]
  sentenceTokens: Token[][]
  clauseTokens: Token[][]
  paragraphTokens: Token[][]
  phraseHints: PhraseHint[]
  wordCounts: Record<string, number>
  structuredTextSpans: StructuredTextSpan[]
  blockRanges?: TextBlockRange[]
  sentenceRanges: SentenceRange[]
  clauseRanges: ClauseRange[]
  paragraphRanges: ParagraphRange[]
  language: DocumentLanguage
  documentStats: DocumentStats
  enabledRulePacks: readonly GrammerOptionalRulePack[]
  nativeLanguageProfile?: NativeLanguageProfile
  measurementPreference?: MeasurementPreference
  houseStyleTerms: readonly HouseStyleTerm[]
}

export interface RuleMatchMetrics {
  ruleMatchCounts: Record<string, number>
  topFiringRuleIds: string[]
  replacementSuggestionSets: Array<{
    suggestionSetId: string
    ruleId: string
    occurrenceCount: number
    suggestionCount: number
    replacementValues: string[]
  }>
  annotation: AnnotationMetrics
  overlappingMatchGroups: Array<{
    offset: number
    length: number
    ruleIds: string[]
  }>
}

export interface AnnotationMetrics {
  highConfidenceTokenCount: number
  mediumConfidenceTokenCount: number
  lowConfidenceTokenCount: number
  ambiguousTokenCount: number
  fallbackGuessTokenCount: number
  openClassUnknownTokenCount: number
  disambiguatedTokenCount: number
}

export interface GrammerRule {
  id: string
  name: string
  description: string
  shortMessage: string
  issueType: string
  category: RuleCategory
  examples: GrammerRuleExamples
  riskTier?: RuleRiskTier
  scope?: RuleScope
  check: (context: RuleCheckContext) => Match[]
}
