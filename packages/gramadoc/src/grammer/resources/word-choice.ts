import {
  safeAutofixPhraseSimpleReplacePatterns,
  safeAutofixSingleWordSimpleReplacePatterns,
  suggestionOnlyPhraseSimpleReplacePatterns,
  suggestionOnlySingleWordSimpleReplacePatterns,
} from './simple-replace.js'

export const phraseWordChoicePatterns = [
  ...safeAutofixPhraseSimpleReplacePatterns,
  ...suggestionOnlyPhraseSimpleReplacePatterns,
]

export const singleWordChoicePatterns = [
  ...safeAutofixSingleWordSimpleReplacePatterns,
  ...suggestionOnlySingleWordSimpleReplacePatterns,
]

export {
  safeAutofixPhraseSimpleReplacePatterns,
  safeAutofixSingleWordSimpleReplacePatterns,
  suggestionOnlyPhraseSimpleReplacePatterns,
  suggestionOnlySingleWordSimpleReplacePatterns,
}
