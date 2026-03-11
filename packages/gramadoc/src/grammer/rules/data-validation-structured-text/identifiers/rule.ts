import type { Match } from '../../../../types.js'
import { getStructuredTextSpans } from '../../../rule-helpers.js'
import { isValidUuid } from '../../../structured-text.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

export const malformedUuidRule: GrammerRule = {
  id: 'MALFORMED_UUID',
  name: 'Malformed UUID',
  description:
    'Flags UUID-like identifiers that use the five-group UUID shape but have invalid group lengths.',
  shortMessage: 'Validation',
  issueType: 'misspelling',
  category: {
    id: 'IDENTIFIERS',
    name: 'Identifiers',
  },
  examples: {
    good: [
      { text: 'Use 123e4567-e89b-12d3-a456-426614174000 in the example.' },
    ],
    bad: [{ text: 'Use 123e4567-e89b-12d3-a456-42661417400 in the example.' }],
  },
  check(context) {
    const { text } = context
    const matches: Match[] = []
    const uuidCandidates = getStructuredTextSpans(context, {
      kind: 'identifier',
      subtype: 'uuid-like',
    })

    for (const span of uuidCandidates) {
      if (isValidUuid(span.text)) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: span.start,
          length: span.text.length,
          message: 'This UUID looks malformed.',
          replacements: [],
          rule: malformedUuidRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedIdentifierSeparatorRule: GrammerRule = {
  id: 'REPEATED_IDENTIFIER_SEPARATOR',
  name: 'Repeated Identifier Separator',
  description:
    'Flags identifiers that repeat separators, such as "ABC--123" or "TASK__45".',
  shortMessage: 'Validation',
  issueType: 'typographical',
  category: {
    id: 'IDENTIFIERS',
    name: 'Identifiers',
  },
  examples: {
    good: [{ text: 'Use ABC-123 and TASK_45 in the examples.' }],
    bad: [{ text: 'Use ABC--123 and TASK__45 in the examples.' }],
  },
  check(context) {
    const { text } = context
    const matches: Match[] = []
    const repeatedSeparators = getStructuredTextSpans(context, {
      kind: 'identifier',
      subtype: 'repeated-identifier-separator',
    })

    for (const span of repeatedSeparators) {
      const replacement = span.details?.replacement

      matches.push(
        createMatch({
          text,
          offset: span.start,
          length: span.end - span.start,
          message: 'Use a single separator in this identifier.',
          replacements: replacement ? [replacement] : [],
          rule: repeatedIdentifierSeparatorRule,
        }),
      )
    }

    return matches
  },
}

export const splitIdentifierNumberRule: GrammerRule = {
  id: 'SPLIT_IDENTIFIER_NUMBER',
  name: 'Split Identifier Number',
  description:
    'Flags simple ticket-like identifiers where a separator is followed by stray whitespace before the number.',
  shortMessage: 'Validation',
  issueType: 'typographical',
  category: {
    id: 'IDENTIFIERS',
    name: 'Identifiers',
  },
  examples: {
    good: [{ text: 'Use ABC-123 and TASK_45 in the examples.' }],
    bad: [{ text: 'Use ABC- 123 and TASK_ 45 in the examples.' }],
  },
  check(context) {
    const { text } = context
    const matches: Match[] = []
    const splitIdentifiers = getStructuredTextSpans(context, {
      kind: 'identifier',
      subtype: 'split-identifier-number',
    })

    for (const span of splitIdentifiers) {
      const replacement = span.details?.replacement ?? ''

      matches.push(
        createMatch({
          text,
          offset: span.start,
          length: span.end - span.start,
          message: 'Remove the space inside this identifier.',
          replacements: [replacement],
          rule: splitIdentifierNumberRule,
        }),
      )
    }

    return matches
  },
}

export const identifiersRules = [
  malformedUuidRule,
  repeatedIdentifierSeparatorRule,
  splitIdentifierNumberRule,
]
