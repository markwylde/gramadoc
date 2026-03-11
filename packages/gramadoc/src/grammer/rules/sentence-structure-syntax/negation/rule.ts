import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

export const doubleNegativeRule: GrammerRule = {
  id: 'DOUBLE_NEGATIVE',
  name: 'Double Negative',
  description:
    'Flags a small set of double-negative patterns like "do not need no" or "did not say nothing".',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'NEGATION',
    name: 'Negation',
  },
  examples: {
    good: [{ text: 'We do not need any backup plan.' }],
    bad: [{ text: 'We do not need no backup plan.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex =
      /\b(?:don't|doesn't|didn't|can't|couldn't|won't|wouldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|ain't)\s+(?:\w+\s+)?(no|nothing|nobody|never|nowhere)\b/gi

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const negator = match[1]
      const offset =
        match.index + match[0].toLowerCase().lastIndexOf(negator.toLowerCase())

      matches.push(
        createMatch({
          text,
          offset,
          length: negator.length,
          message:
            'This appears to use two negatives where one would usually do.',
          replacements: [],
          rule: doubleNegativeRule,
        }),
      )
    }

    return matches
  },
}

const AUXILIARY_REPLACEMENTS: Record<string, string> = {
  are: 'are not',
  can: 'cannot',
  could: 'could not',
  did: 'did not',
  do: 'do not',
  does: 'does not',
  had: 'had not',
  has: 'has not',
  have: 'have not',
  is: 'is not',
  should: 'should not',
  was: 'was not',
  were: 'were not',
  will: 'will not',
  would: 'would not',
}

export const misplacedNotRule: GrammerRule = {
  id: 'MISPLACED_NOT',
  name: 'Misplaced Not',
  description:
    'Flags simple sequences like "not can" or "not will" where "not" usually belongs after the auxiliary.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'NEGATION',
    name: 'Negation',
  },
  examples: {
    good: [
      { text: 'We cannot stay late.' },
      { text: 'We will not stay late.' },
    ],
    bad: [{ text: 'We not can stay late.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex =
      /\bnot\s+(are|can|could|did|do|does|had|has|have|is|should|was|were|will|would)\b/gi

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const auxiliary = match[1].toLowerCase()
      const replacement = AUXILIARY_REPLACEMENTS[auxiliary]

      if (!replacement) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Place "not" after the auxiliary verb in this phrase.',
          replacements: [replacement],
          rule: misplacedNotRule,
        }),
      )
    }

    return matches
  },
}

export const negationRules = [doubleNegativeRule, misplacedNotRule]
