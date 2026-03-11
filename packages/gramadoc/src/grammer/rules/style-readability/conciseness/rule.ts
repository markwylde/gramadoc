import {
  fillerLeadInPatterns,
  repeatedHedgePatterns,
} from '../../../resources/conciseness.js'
import { findTokenPhraseMatches } from '../../../rule-helpers.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

export const repeatedHedgeRule: GrammerRule = {
  id: 'REPEATED_HEDGE',
  name: 'Repeated Hedge',
  description:
    'Flags a small set of adjacent hedge pairs that can be reduced to one hedge word.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'CONCISENESS',
    name: 'Conciseness',
  },
  examples: {
    good: [{ text: 'Maybe we should leave now.' }],
    bad: [{ text: 'Maybe perhaps we should leave now.' }],
  },
  check(context) {
    return findTokenPhraseMatches(context, repeatedHedgePatterns).map(
      ({ entry, tokens }) => {
        const firstToken = tokens[0]
        const lastToken = tokens.at(-1) ?? firstToken

        return createMatch({
          text: context.text,
          offset: firstToken.offset,
          length: lastToken.offset + lastToken.length - firstToken.offset,
          message: entry.message,
          replacements: [preserveCase(firstToken.value, entry.replacement)],
          rule: repeatedHedgeRule,
        })
      },
    )
  },
}

export const fillerLeadInRule: GrammerRule = {
  id: 'FILLER_LEAD_IN',
  name: 'Filler Lead-In',
  description:
    'Flags a small set of filler lead-in phrases that can usually be removed without changing the meaning.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'CONCISENESS',
    name: 'Conciseness',
  },
  examples: {
    good: [{ text: 'The report is late.' }],
    bad: [{ text: 'It is important to note that the report is late.' }],
  },
  check(context) {
    return findTokenPhraseMatches(context, fillerLeadInPatterns).map(
      ({ entry, tokens }) => {
        const firstToken = tokens[0]
        const lastToken = tokens.at(-1) ?? firstToken

        return createMatch({
          text: context.text,
          offset: firstToken.offset,
          length: lastToken.offset + lastToken.length - firstToken.offset,
          message: entry.message,
          replacements:
            entry.replacement === ''
              ? []
              : [preserveCase(firstToken.value, entry.replacement)],
          rule: fillerLeadInRule,
        })
      },
    )
  },
}

export const concisenessRules = [repeatedHedgeRule, fillerLeadInRule]
