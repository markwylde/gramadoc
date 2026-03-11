import { createSingleWordPatternRule } from '../../../patterns.js'
import {
  phraseWordChoicePatterns,
  singleWordChoicePatterns,
} from '../../../resources/word-choice.js'
import { findTokenPhraseMatches } from '../../../rule-helpers.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

export const phraseWordChoiceRule: GrammerRule = {
  id: 'PHRASE_WORD_CHOICE',
  name: 'Phrase Word Choice',
  description:
    'Flags a small set of fixed phrases that are commonly written in a nonstandard form.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORD_CHOICE',
    name: 'Word Choice',
  },
  examples: {
    good: [{ text: 'I couldn’t care less.' }],
    bad: [{ text: 'I could care less.' }],
  },
  check(context) {
    return findTokenPhraseMatches(context, phraseWordChoicePatterns).map(
      ({ entry, tokens }) => {
        const firstToken = tokens[0]
        const lastToken = tokens.at(-1) ?? firstToken

        return createMatch({
          text: context.text,
          offset: firstToken.offset,
          length: lastToken.offset + lastToken.length - firstToken.offset,
          message: entry.message,
          replacements: [preserveCase(firstToken.value, entry.replacement)],
          rule: phraseWordChoiceRule,
        })
      },
    )
  },
}

export const singleWordChoiceRule = createSingleWordPatternRule({
  id: 'SINGLE_WORD_CHOICE',
  name: 'Single Word Choice',
  description:
    'Flags a small set of commonly confused single-word choices with standard replacements.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'WORD_CHOICE',
    name: 'Word Choice',
  },
  examples: {
    good: [{ text: 'We had a lot of time.' }],
    bad: [{ text: 'We had alot of time.' }],
  },
  patterns: singleWordChoicePatterns,
  message: (pattern) => pattern.message,
  replacements: (pattern, token) => [
    preserveCase(token.value, pattern.replacement),
  ],
})

export const wordChoiceRules = [phraseWordChoiceRule, singleWordChoiceRule]
