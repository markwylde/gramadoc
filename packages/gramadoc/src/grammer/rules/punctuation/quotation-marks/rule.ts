import type { Match } from '../../../../types.js'
import { analyzeQuotationMarks } from '../../../quotation.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

export const unmatchedQuotationMarkRule: GrammerRule = {
  id: 'UNMATCHED_QUOTATION_MARK',
  name: 'Unmatched Quotation Mark',
  description:
    'Flags opening and closing quotation marks that do not have a matching partner, including straight and curly quotes.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'QUOTATION_MARKS',
    name: 'Quotation Marks',
  },
  examples: {
    good: [
      { text: 'She said "hello" before leaving.' },
      { text: 'He wrote “Ship it” in the review.' },
    ],
    bad: [
      { text: 'She said "hello before leaving.' },
      { text: 'He wrote ”ship it” in the review.' },
    ],
  },
  check({ text }) {
    const matches: Match[] = []
    const { unmatchedOpenings, unmatchedClosings } = analyzeQuotationMarks(text)

    for (const unmatched of unmatchedOpenings) {
      matches.push(
        createMatch({
          text,
          offset: unmatched.offset,
          length: 1,
          message:
            'This quotation mark appears to be missing its closing pair.',
          replacements: [text[unmatched.offset] ?? '"'],
          rule: unmatchedQuotationMarkRule,
        }),
      )
    }

    for (const unmatched of unmatchedClosings) {
      matches.push(
        createMatch({
          text,
          offset: unmatched.offset,
          length: 1,
          message:
            'This closing quotation mark does not have a matching opener.',
          replacements: [text[unmatched.offset] ?? '"'],
          rule: unmatchedQuotationMarkRule,
        }),
      )
    }

    return matches
  },
}

export const spacingInsideQuotationMarksRule: GrammerRule = {
  id: 'SPACING_INSIDE_QUOTATION_MARKS',
  name: 'Spacing Inside Quotation Marks',
  description: 'Flags stray spaces immediately inside paired quotation marks.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'QUOTATION_MARKS',
    name: 'Quotation Marks',
  },
  examples: {
    good: [{ text: 'She said "hello" before leaving.' }],
    bad: [{ text: 'She said " hello " before leaving.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const { pairs } = analyzeQuotationMarks(text)

    for (const pair of pairs) {
      let openingSpaceEnd = pair.open + 1

      while (
        openingSpaceEnd < pair.close &&
        /\s/u.test(text[openingSpaceEnd] ?? '')
      ) {
        openingSpaceEnd += 1
      }

      if (openingSpaceEnd > pair.open + 1) {
        matches.push(
          createMatch({
            text,
            offset: pair.open,
            length: openingSpaceEnd - pair.open,
            message: 'Remove the space just inside the opening quotation mark.',
            replacements: [text[pair.open] ?? '"'],
            rule: spacingInsideQuotationMarksRule,
          }),
        )
      }

      let closingSpaceStart = pair.close - 1

      while (
        closingSpaceStart > pair.open &&
        /\s/u.test(text[closingSpaceStart] ?? '')
      ) {
        closingSpaceStart -= 1
      }

      if (closingSpaceStart < pair.close - 1) {
        matches.push(
          createMatch({
            text,
            offset: closingSpaceStart + 1,
            length: pair.close - closingSpaceStart,
            message: 'Remove the space just inside the closing quotation mark.',
            replacements: [text[pair.close] ?? '"'],
            rule: spacingInsideQuotationMarksRule,
          }),
        )
      }
    }

    return matches
  },
}

export const quotationMarksRules = [
  unmatchedQuotationMarkRule,
  spacingInsideQuotationMarksRule,
]

export const unmatchedDoubleQuotationMarkRule = unmatchedQuotationMarkRule
