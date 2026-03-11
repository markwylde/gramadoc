import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const FOREIGN_TERM_REPLACEMENTS: Record<string, string> = {
  adhoc: 'ad hoc',
  bonafide: 'bona fide',
  perse: 'per se',
}

export const foreignTermSpellingRule: GrammerRule = {
  id: 'FOREIGN_TERM_SPELLING',
  name: 'Foreign Term Spelling',
  description:
    'Flags a short curated set of borrowed terms that are commonly collapsed into one nonstandard word.',
  shortMessage: 'Spelling',
  issueType: 'misspelling',
  category: {
    id: 'FOREIGN_TERMS',
    name: 'Foreign Terms',
  },
  examples: {
    good: [{ text: 'We adopted an ad hoc process.' }],
    bad: [{ text: 'We adopted an adhoc process.' }],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (const token of tokens) {
      const replacement = FOREIGN_TERM_REPLACEMENTS[token.normalized]

      if (!replacement) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use "${replacement}" for this borrowed term.`,
          replacements: [preserveCase(token.value, replacement)],
          rule: foreignTermSpellingRule,
        }),
      )
    }

    return matches
  },
}

export const foreignTermsRules = [foreignTermSpellingRule]
