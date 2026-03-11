import type {
  PhraseReplacementPattern,
  SingleWordReplacementPattern,
} from './phrase-patterns.js'

export interface SimpleReplacePhrasePattern extends PhraseReplacementPattern {
  replacementKind: 'safe-autofix' | 'suggestion-only'
}

export interface SimpleReplaceSingleWordPattern
  extends SingleWordReplacementPattern {
  replacementKind: 'safe-autofix' | 'suggestion-only'
}

export const safeAutofixPhraseSimpleReplacePatterns: SimpleReplacePhrasePattern[] =
  [
    {
      phrase: 'could of',
      replacement: 'could have',
      message: 'Use "could have" here.',
      replacementKind: 'safe-autofix',
    },
    {
      phrase: 'might of',
      replacement: 'might have',
      message: 'Use "might have" here.',
      replacementKind: 'safe-autofix',
    },
    {
      phrase: 'must of',
      replacement: 'must have',
      message: 'Use "must have" here.',
      replacementKind: 'safe-autofix',
    },
    {
      phrase: 'my be',
      replacement: 'maybe',
      message: 'Use "maybe" here.',
      replacementKind: 'safe-autofix',
    },
    {
      phrase: 'should of',
      replacement: 'should have',
      message: 'Use "should have" here.',
      replacementKind: 'safe-autofix',
    },
    {
      phrase: 'there fore',
      replacement: 'therefore',
      message: 'Use "therefore" as one word here.',
      replacementKind: 'safe-autofix',
    },
    {
      phrase: 'would of',
      replacement: 'would have',
      message: 'Use "would have" here.',
      replacementKind: 'safe-autofix',
    },
    {
      phrase: 'your should',
      replacement: 'you should',
      message: 'Use "you should" here.',
      replacementKind: 'safe-autofix',
    },
  ]

export const suggestionOnlyPhraseSimpleReplacePatterns: SimpleReplacePhrasePattern[] =
  [
    {
      phrase: 'could care less',
      replacement: 'couldn’t care less',
      message: 'Use "couldn’t care less" for this meaning.',
      replacementKind: 'suggestion-only',
    },
    {
      phrase: 'one in the same',
      replacement: 'one and the same',
      message: 'Use "one and the same" here.',
      replacementKind: 'suggestion-only',
    },
  ]

export const safeAutofixSingleWordSimpleReplacePatterns: SimpleReplaceSingleWordPattern[] =
  [
    {
      word: 'alot',
      replacement: 'a lot',
      message: 'Use "a lot" instead of "alot".',
      replacementKind: 'safe-autofix',
    },
    {
      word: 'aswell',
      replacement: 'as well',
      message: 'Use "as well" as two words.',
      replacementKind: 'safe-autofix',
    },
    {
      word: 'atleast',
      replacement: 'at least',
      message: 'Use "at least" as two words.',
      replacementKind: 'safe-autofix',
    },
    {
      word: 'incase',
      replacement: 'in case',
      message: 'Use "in case" as two words.',
      replacementKind: 'safe-autofix',
    },
    {
      word: 'infact',
      replacement: 'in fact',
      message: 'Use "in fact" as two words.',
      replacementKind: 'safe-autofix',
    },
  ]

export const suggestionOnlySingleWordSimpleReplacePatterns: SimpleReplaceSingleWordPattern[] =
  [
    {
      word: 'irregardless',
      replacement: 'regardless',
      message: 'Use "regardless" instead of "irregardless".',
      replacementKind: 'suggestion-only',
    },
  ]
