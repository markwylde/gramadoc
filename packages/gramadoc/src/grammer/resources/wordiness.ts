export interface PhraseRewriteAntiPattern {
  precedingTextPattern?: RegExp
  followingTextPattern?: RegExp
}

export interface PhraseRewritePattern {
  phrase: string
  message: string
  replacements?: readonly string[]
  bucket:
    | 'replacement'
    | 'redundancy'
    | 'plain-english-simplification'
    | 'house-style-wording'
  antiPatterns?: readonly PhraseRewriteAntiPattern[]
}

const literalMentionAntiPatterns = [
  {
    precedingTextPattern:
      /\b(?:example|expression|idiom|label|message|phrase|string|term|text|wording)\s*(?:called|like|named)?\s*$/iu,
  },
  {
    precedingTextPattern:
      /\b(?:quote|quoted|quotes|quoting|mentions|mentioned|uses|used)\s*$/iu,
  },
] as const satisfies readonly PhraseRewriteAntiPattern[]

const editorialGuidanceAntiPatterns = [
  ...literalMentionAntiPatterns,
  {
    precedingTextPattern:
      /\b(?:avoid|call|called|calls|label|labeled|labels|rewrite|replace|prefer|say|says|said|use|using)\s*$/iu,
  },
  {
    precedingTextPattern:
      /\b(?:button|copy|cta|heading|headline|link|screen|tooltip)\s+$/iu,
  },
] as const satisfies readonly PhraseRewriteAntiPattern[]

export const redundancyPhrasePatterns: PhraseRewritePattern[] = [
  {
    phrase: 'basic fundamentals',
    message: 'The phrase "basic fundamentals" is redundant.',
    replacements: ['fundamentals'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'future plans',
    message: 'The phrase "future plans" is usually redundant.',
    replacements: ['plans'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'past history',
    message: 'The phrase "past history" is usually redundant.',
    replacements: ['history'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'each and every',
    message: 'The phrase "each and every" is wordier than necessary here.',
    replacements: ['each'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'sufficient enough',
    message: 'The phrase "sufficient enough" is redundant here.',
    replacements: ['enough'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'ask the question',
    message: 'Use "ask" instead of "ask the question" here.',
    replacements: ['ask'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'as of yet',
    message: 'Use "yet" instead of "as of yet" here.',
    replacements: ['yet'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'repeat again',
    message: 'Use "repeat" instead of "repeat again" here.',
    replacements: ['repeat'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'free gift',
    message: 'The phrase "free gift" is often redundant.',
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'very unique',
    message: 'The phrase "very unique" is often redundant.',
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'end result',
    message: 'The phrase "end result" is usually redundant.',
    replacements: ['result'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'merge together',
    message: 'Use "merge" instead of "merge together" here.',
    replacements: ['merge'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'close proximity',
    message: 'The phrase "close proximity" is often redundant.',
    replacements: ['proximity'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'advance planning',
    message: 'The phrase "advance planning" is usually redundant.',
    replacements: ['planning'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'final outcome',
    message: 'The phrase "final outcome" is usually redundant.',
    replacements: ['outcome'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'final conclusion',
    message: 'The phrase "final conclusion" is usually redundant.',
    replacements: ['conclusion'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'return back',
    message: 'Use "return" instead of "return back" here.',
    replacements: ['return'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'combine together',
    message: 'Use "combine" instead of "combine together" here.',
    replacements: ['combine'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'collaborate together',
    message: 'Use "collaborate" instead of "collaborate together" here.',
    replacements: ['collaborate'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'personal opinion',
    message: 'The phrase "personal opinion" is often redundant.',
    replacements: ['opinion'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'true facts',
    message: 'The phrase "true facts" is often redundant.',
    replacements: ['facts'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'added bonus',
    message: 'The phrase "added bonus" is often redundant.',
    replacements: ['bonus'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'still remains',
    message: 'Use "remains" instead of "still remains" here.',
    replacements: ['remains'],
    bucket: 'redundancy',
    antiPatterns: literalMentionAntiPatterns,
  },
]

export const replacementPhrasePatterns: PhraseRewritePattern[] = [
  {
    phrase: 'for the purpose of',
    message: 'Use "to" instead of "for the purpose of" here.',
    replacements: ['to'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'in the event that',
    message: 'Use "if" instead of "in the event that" here.',
    replacements: ['if'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'in order to',
    message: 'Use "to" instead of "in order to" here.',
    replacements: ['to'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'due to the fact that',
    message: 'Use "because" instead of "due to the fact that" here.',
    replacements: ['because'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'at this point in time',
    message: 'Use "now" instead of "at this point in time" here.',
    replacements: ['now'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'make use of',
    message: 'Use "use" instead of "make use of" here.',
    replacements: ['use'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'prior to',
    message: 'Use "before" instead of "prior to" here.',
    replacements: ['before'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'has the ability to',
    message: 'Use "can" instead of "has the ability to" here.',
    replacements: ['can'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'for the reason that',
    message: 'Use "because" instead of "for the reason that" here.',
    replacements: ['because'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'for the most part',
    message: 'Use "mostly" instead of "for the most part" here.',
    replacements: ['mostly'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'in spite of the fact that',
    message: 'Use "although" instead of "in spite of the fact that" here.',
    replacements: ['although'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'on a daily basis',
    message: 'Use "daily" instead of "on a daily basis" here.',
    replacements: ['daily'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'until such time as',
    message: 'Use "until" instead of "until such time as" here.',
    replacements: ['until'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'with the exception of',
    message: 'Use "except for" instead of "with the exception of" here.',
    replacements: ['except for'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'for the duration of',
    message: 'Use "during" instead of "for the duration of" here.',
    replacements: ['during'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
  {
    phrase: 'in the near future',
    message: 'Use "soon" instead of "in the near future" here.',
    replacements: ['soon'],
    bucket: 'replacement',
    antiPatterns: literalMentionAntiPatterns,
  },
]

export const plainEnglishSuggestionPatterns: PhraseRewritePattern[] = [
  {
    phrase: 'at your earliest convenience',
    message:
      'This phrase sounds formal and indirect. Consider a plainer rewrite if the tone allows it.',
    replacements: ['soon', 'when you can'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'in terms of',
    message:
      'This phrase can often be rewritten more directly. Consider a plainer alternative that fits the sentence.',
    replacements: ['for', 'about'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'please be advised',
    message:
      'This phrase sounds stiff. Consider a plainer rewrite if the tone allows it.',
    replacements: ['please note', 'note that'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'for your information',
    message:
      'This phrase can sound bureaucratic. Consider a plainer rewrite if the tone allows it.',
    replacements: ['for reference', 'note that'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'please do not hesitate to',
    message:
      'This phrase is formal and indirect. Consider a shorter rewrite if the tone allows it.',
    replacements: ['please', 'feel free to'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'with respect to',
    message:
      'This phrase can often be rewritten more directly. Consider a plainer alternative that fits the sentence.',
    replacements: ['for', 'about'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'in connection with',
    message:
      'This phrase can often be rewritten more directly. Consider a plainer alternative that fits the sentence.',
    replacements: ['for', 'about'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'going forward',
    message:
      'This phrase can sound vague. Consider naming the timeframe more directly if the tone allows it.',
    replacements: ['from now on', 'in future'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'at this time',
    message:
      'This phrase often reads more clearly as a simpler time reference.',
    replacements: ['now', 'currently'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'in order for',
    message:
      'This phrase is often longer than necessary. Consider a shorter rewrite that fits the sentence.',
    replacements: ['for'],
    bucket: 'plain-english-simplification',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
]

export const houseStyleWordingPatterns: PhraseRewritePattern[] = [
  {
    phrase: 'click here',
    message:
      'Avoid "click here" wording in product copy. Name the link or destination instead.',
    bucket: 'house-style-wording',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'tap here',
    message:
      'Avoid "tap here" wording in product copy. Name the control or destination instead.',
    bucket: 'house-style-wording',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'click this link',
    message:
      'Avoid "click this link" wording in product copy. Name the link destination instead.',
    bucket: 'house-style-wording',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'tap this link',
    message:
      'Avoid "tap this link" wording in product copy. Name the destination instead.',
    bucket: 'house-style-wording',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'learn more here',
    message:
      'Avoid deictic CTA wording like "learn more here". Name the topic or destination instead.',
    bucket: 'house-style-wording',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'read more here',
    message:
      'Avoid deictic CTA wording like "read more here". Name the topic or destination instead.',
    bucket: 'house-style-wording',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
  {
    phrase: 'see more here',
    message:
      'Avoid deictic CTA wording like "see more here". Name the content or destination instead.',
    bucket: 'house-style-wording',
    antiPatterns: editorialGuidanceAntiPatterns,
  },
]

export const redundantPhrasePatterns = redundancyPhrasePatterns
export const wordyPhraseReplacementPatterns = replacementPhrasePatterns
export const wordyPhraseSuggestionPatterns = plainEnglishSuggestionPatterns

export const nounStackAllowlist = [
  'application programming interface',
  'command line interface',
  'continuous integration pipeline',
  'error message copy',
  'release notes page',
  'software development kit',
  'user interface design',
] as const

export const sentenceStartNumberReplacements: Record<string, string> = {
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  '11': 'Eleven',
  '12': 'Twelve',
}

export const sentenceInitialReadabilityWords = [
  {
    word: 'hopefully',
    message:
      'Sentence-start "hopefully" can feel vague. Consider naming who hopes or rewriting the sentence.',
  },
] as const

export const sentenceFinalReadabilityWords = [
  {
    word: 'also',
    message: 'Move "also" earlier in the sentence for a smoother read.',
  },
] as const
