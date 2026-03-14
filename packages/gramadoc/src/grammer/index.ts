import { identifiersRules } from './rules/data-validation-structured-text/identifiers/rule.js'
import { urlsEmailsRules } from './rules/data-validation-structured-text/urls-emails/rule.js'
import { currencyUnitsRules } from './rules/formatting-typography/currency-units/rule.js'
import { datesTimesRules } from './rules/formatting-typography/dates-times/rule.js'
import { listsLayoutRules } from './rules/formatting-typography/lists-layout/rule.js'
import { numbersRules } from './rules/formatting-typography/numbers/rule.js'
import { spacingRules } from './rules/formatting-typography/spacing/rule.js'
import { unitConversionsRules } from './rules/formatting-typography/unit-conversions/rule.js'
import { agreementErrorsRules } from './rules/grammar/agreement-errors/rule.js'
import { articlesDeterminersRules } from './rules/grammar/articles-determiners/rule.js'
import { conjunctionsRules } from './rules/grammar/conjunctions/rule.js'
import { prepositionsRules } from './rules/grammar/prepositions/rule.js'
import { pronounsRules } from './rules/grammar/pronouns/rule.js'
import { verbUsageRules } from './rules/grammar/verb-usage/rule.js'
import { foreignTermsRules } from './rules/internationalization/foreign-terms/rule.js'
import { l2FalseFriendsRules } from './rules/internationalization/l2-false-friends/rule.js'
import { languageVariantsRules } from './rules/internationalization/language-variants/rule.js'
import { apostrophesRules } from './rules/punctuation/apostrophes/rule.js'
import { commasRules } from './rules/punctuation/commas/rule.js'
import { otherPunctuationRules } from './rules/punctuation/other-punctuation/rule.js'
import { periodsSentenceBoundariesRules } from './rules/punctuation/periods-sentence-boundaries/rule.js'
import { quotationMarksRules } from './rules/punctuation/quotation-marks/rule.js'
import { wordConfusionRules } from './rules/semantics-clarity/word-confusion/rule.js'
import { negationRules } from './rules/sentence-structure-syntax/negation/rule.js'
import { basicSpellingRules } from './rules/spelling-orthography/basic-spelling/rule.js'
import { capitalizationRules } from './rules/spelling-orthography/capitalization/rule.js'
import { compoundWordsRules } from './rules/spelling-orthography/compound-words/rule.js'
import { namesAcronymsSpecializedTermsRules } from './rules/spelling-orthography/names-acronyms-specialized-terms/rule.js'
import { concisenessRules } from './rules/style-readability/conciseness/rule.js'
import { ePrimeRules } from './rules/style-readability/e-prime/rule.js'
import { houseStyleRules } from './rules/style-readability/house-style/rule.js'
import { informalityToneRules } from './rules/style-readability/informality-tone/rule.js'
import { repetitionRules } from './rules/style-readability/repetition/rule.js'
import { wordChoiceRules } from './rules/style-readability/word-choice/rule.js'
import { wordinessRules } from './rules/style-readability/wordiness/rule.js'

export type {
  AnnotationConfidence,
  AnnotationMetrics,
  ClausePart,
  ClauseRange,
  DocumentLanguage,
  GrammerAnalysisOptions,
  GrammerLanguageCode,
  GrammerOptionalRulePack,
  GrammerRule,
  GrammerRuleExample,
  GrammerRuleExamples,
  MeasurementPreference,
  NativeLanguageProfile,
  ParagraphRange,
  PhraseHint,
  PhraseHintKind,
  RuleCheckContext,
  RuleMatchMetrics,
  RuleRiskTier,
  SentenceRange,
  StructuredTextKind,
  StructuredTextSpan,
  StructuredTextSubtype,
  Token,
  TokenPosHint,
  TokenPosReading,
} from './types.js'
export {
  analyzeHtml,
  analyzeText,
  buildRuleCheckContext,
  createBaseResponse,
  getRuleMatchMetrics,
  htmlToPlainText,
  tokenizeText,
} from './utils.js'

export const grammerRules = [
  ...basicSpellingRules,
  ...repetitionRules,
  ...concisenessRules,
  ...wordChoiceRules,
  ...wordinessRules,
  ...spacingRules,
  ...numbersRules,
  ...currencyUnitsRules,
  ...unitConversionsRules,
  ...listsLayoutRules,
  ...datesTimesRules,
  ...identifiersRules,
  ...urlsEmailsRules,
  ...agreementErrorsRules,
  ...articlesDeterminersRules,
  ...conjunctionsRules,
  ...prepositionsRules,
  ...pronounsRules,
  ...verbUsageRules,
  ...negationRules,
  ...wordConfusionRules,
  ...foreignTermsRules,
  ...l2FalseFriendsRules,
  ...languageVariantsRules,
  ...capitalizationRules,
  ...namesAcronymsSpecializedTermsRules,
  ...compoundWordsRules,
  ...apostrophesRules,
  ...commasRules,
  ...otherPunctuationRules,
  ...periodsSentenceBoundariesRules,
  ...quotationMarksRules,
  ...informalityToneRules,
  ...ePrimeRules,
  ...houseStyleRules,
]

export const sampleHtml = grammerRules
  .map((rule) => `<p>${rule.examples.bad[0]?.text ?? rule.name}</p>`)
  .join('')
