export interface Replacement {
  value: string
}

export interface Context {
  text: string
  offset: number
  length: number
}

export interface RuleUrl {
  value: string
}

export interface RuleCategory {
  id: string
  name: string
}

export interface Rule {
  id: string
  subId?: string
  description: string
  urls?: RuleUrl[]
  issueType: string
  category: RuleCategory
  riskTier?: import('./grammer/types.js').RuleRiskTier
}

export interface MatchDiagnostics {
  riskTier?: import('./grammer/types.js').RuleRiskTier
  evidence?: string[]
  triggerTokens?: string[]
  annotationConfidence?: import('./grammer/types.js').AnnotationConfidence
  notes?: string[]
}

export interface GrammerRuleMatch {
  message: string
  shortMessage: string
  offset: number
  length: number
  replacements: Replacement[]
  suggestionSetId?: string
  confidenceLabel?: import('./grammer/types.js').AnnotationConfidence
  diagnostics?: MatchDiagnostics
  details?: Record<string, string>
  context: Context
  sentence: string
  rule: Rule
}

export type Match = GrammerRuleMatch

export interface DetectedLanguage {
  name: string
  code: string
}

export interface Language {
  name: string
  code: string
  detectedLanguage: DetectedLanguage
}

export interface Software {
  name: string
  version: string
  buildDate: string
  apiVersion: number
  status: string
  premium: boolean
}

export interface AnalysisResponse {
  software: Software
  language: Language
  matches: GrammerRuleMatch[]
}

export interface GrammerAnalysisDetails {
  plainText: string
  wordCounts: Record<string, number>
  warnings: AnalysisResponse
  metrics?: import('./grammer/types.js').RuleMatchMetrics
}

export type {
  GrammerAnalysisOptions,
  GrammerOptionalRulePack,
  GrammerOptionalRulePackOptions,
  MeasurementPreference,
  NativeLanguageProfile,
} from './grammer/types.js'
