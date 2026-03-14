import type { PatternMatch, PatternStep } from '../patterns.js'
import type { RuleCheckContext } from '../types.js'

export interface PrepositionCollocation {
  id: string
  name: string
  description: string
  message: string
  replacement: string
  pattern: PatternStep[]
  antiPatterns?: PatternStep[][]
  filter?: (match: PatternMatch, context: RuleCheckContext) => boolean
  reportWholeMatch?: boolean
}

function token(
  literal: string | string[],
  options?: {
    capture?: string
  },
) {
  return {
    literal,
    capture: options?.capture,
  } satisfies PatternStep
}

function gerund(options?: { capture?: string }) {
  return {
    regex: '^[a-z]+ing$',
    capture: options?.capture,
    test: (candidate) =>
      candidate.posHints.includes('verb') ||
      candidate.morphology.verb.canBePresentParticiple,
  } satisfies PatternStep
}

function pronounOrAnimateNoun() {
  return {
    literal: [
      'i',
      'you',
      'we',
      'they',
      'he',
      'she',
      'someone',
      'somebody',
      'anyone',
      'anybody',
      'everyone',
      'everybody',
      'nobody',
      'person',
      'people',
      'team',
      'teams',
      'user',
      'users',
      'writer',
      'writers',
      'reader',
      'readers',
      'developer',
      'developers',
      'manager',
      'managers',
      'customer',
      'customers',
    ],
  } satisfies PatternStep
}

function comparativeClauseFollowUpToken() {
  return {
    literal: [
      'am',
      'are',
      'did',
      'do',
      'does',
      'expected',
      'hoped',
      'is',
      'seemed',
      'was',
      'were',
      'would',
    ],
  } satisfies PatternStep
}

export const prepositionCollocations: PrepositionCollocation[] = [
  {
    id: 'ARRIVE_AT',
    name: 'Arrive At',
    description:
      'Flags "arrive to" when "arrive at" is the usual collocation for places and destinations.',
    message: 'Use "arrived at" for destinations or places.',
    replacement: 'at',
    pattern: [
      token(['arrive', 'arrived', 'arrives', 'arriving']),
      token('to', { capture: 'focus' }),
    ],
  },
  {
    id: 'DEPEND_ON',
    name: 'Depend On',
    description: 'Flags "depend of" when "depend on" is expected.',
    message: 'Use "depend on" here.',
    replacement: 'on',
    pattern: [
      token(['depend', 'depends', 'depended', 'depending']),
      token('of', { capture: 'focus' }),
    ],
  },
  {
    id: 'INTERESTED_IN',
    name: 'Interested In',
    description: 'Flags "interested on" when "interested in" is expected.',
    message: 'Use "interested in" here.',
    replacement: 'in',
    pattern: [token('interested'), token('on', { capture: 'focus' })],
  },
  {
    id: 'MARRIED_TO',
    name: 'Married To',
    description: 'Flags "married with" when "married to" is expected.',
    message: 'Use "married to" here.',
    replacement: 'to',
    pattern: [token('married'), token('with', { capture: 'focus' })],
  },
  {
    id: 'RESPONSIBLE_FOR',
    name: 'Responsible For',
    description: 'Flags "responsible of" when "responsible for" is expected.',
    message: 'Use "responsible for" here.',
    replacement: 'for',
    pattern: [token('responsible'), token('of', { capture: 'focus' })],
  },
  {
    id: 'CAPABLE_OF',
    name: 'Capable Of',
    description: 'Flags "capable to" when "capable of" is expected.',
    message: 'Use "capable of" here.',
    replacement: 'of',
    pattern: [token('capable'), token('to', { capture: 'focus' })],
  },
  {
    id: 'FOCUS_ON',
    name: 'Focus On',
    description: 'Flags "focus in" when "focus on" is expected.',
    message: 'Use "focus on" here.',
    replacement: 'on',
    pattern: [
      token(['focus', 'focused', 'focusing', 'focuses']),
      token('in', { capture: 'focus' }),
    ],
  },
  {
    id: 'SIMILAR_TO',
    name: 'Similar To',
    description: 'Flags "similar with" when "similar to" is expected.',
    message: 'Use "similar to" here.',
    replacement: 'to',
    pattern: [token('similar'), token('with', { capture: 'focus' })],
  },
  {
    id: 'RELATED_TO',
    name: 'Related To',
    description: 'Flags "related with" when "related to" is expected.',
    message: 'Use "related to" here.',
    replacement: 'to',
    pattern: [token('related'), token('with', { capture: 'focus' })],
  },
  {
    id: 'ASSOCIATED_WITH',
    name: 'Associated With',
    description: 'Flags "associated to" when "associated with" is expected.',
    message: 'Use "associated with" here.',
    replacement: 'with',
    pattern: [token('associated'), token('to', { capture: 'focus' })],
  },
  {
    id: 'COMFORTABLE_WITH_GERUND',
    name: 'Comfortable With Gerund',
    description:
      'Flags "comfortable to/in" before a gerund, where "comfortable with" is the usual complement.',
    message: 'Use "comfortable with" before a gerund.',
    replacement: 'with',
    pattern: [
      token('comfortable'),
      token(['in', 'to'], { capture: 'focus' }),
      gerund(),
    ],
  },
  {
    id: 'PREVENT_FROM_GERUND',
    name: 'Prevent From Gerund',
    description:
      'Flags "prevent ... to" before a gerund, where "from" is the expected complement.',
    message: 'Use "prevent ... from" before a gerund.',
    replacement: 'from',
    pattern: [
      token(['prevent', 'prevents', 'prevented', 'preventing']),
      { type: 'skip', max: 1 },
      token('to', { capture: 'focus' }),
      gerund(),
    ],
  },
  {
    id: 'USED_TO_GERUND',
    name: 'Used To Gerund',
    description:
      'Flags pronoun-led "be used for + -ing" when "used to + -ing" is more likely.',
    message: 'Use "used to" before a gerund when you mean accustomed to it.',
    replacement: 'to',
    pattern: [
      pronounOrAnimateNoun(),
      token(['am', 'are', 'is', 'was', 'were', 'be', 'been', 'being']),
      token('used'),
      token('for', { capture: 'focus' }),
      gerund(),
    ],
  },
  {
    id: 'OUTSIDE_OF',
    name: 'Outside Of',
    description:
      'Flags "outside of" in running prose when plain "outside" is the tighter option.',
    message: 'In most prose, "outside" is tighter than "outside of".',
    replacement: '',
    pattern: [token('outside'), token('of', { capture: 'focus' })],
    filter: (match, context) => {
      const firstToken = match.tokens[0]
      const lastToken = match.tokens.at(-1) ?? firstToken
      const nextToken = context.tokens[match.endIndex + 1]

      if (
        /["'`“”‘’]/u.test(firstToken.leadingText) &&
        /["'`“”‘’]/u.test(lastToken.trailingText)
      ) {
        return true
      }

      if (!nextToken) {
        return false
      }

      return (
        nextToken.posHints.includes('determiner') ||
        nextToken.posHints.includes('noun') ||
        nextToken.normalized === 'work'
      )
    },
  },
  {
    id: 'DIFFERENT_FROM',
    name: 'Different From',
    description:
      'Flags "different than" before a noun phrase while allowing clause-style continuations.',
    message: 'Use "different from" before a noun phrase.',
    replacement: 'from',
    pattern: [token('different'), token('than', { capture: 'focus' })],
    filter: (match, context) => {
      const nextToken = context.tokens[match.endIndex + 1]

      if (!nextToken) {
        return false
      }

      if (
        matchesContextStep(
          nextToken,
          comparativeClauseFollowUpToken(),
          context,
        ) ||
        nextToken.posHints.includes('verb')
      ) {
        return false
      }

      return (
        nextToken.posHints.includes('determiner') ||
        nextToken.posHints.includes('adjective') ||
        nextToken.posHints.includes('noun')
      )
    },
  },
  {
    id: 'THAN_ME',
    name: 'Than Me',
    description:
      'Flags "than I" when there is no following verb to complete the comparative clause.',
    message: 'Use "than me" unless a following verb makes the clause explicit.',
    replacement: 'me',
    pattern: [token('than'), token('i', { capture: 'focus' })],
    filter: (match, context) => {
      const nextToken = context.tokens[match.endIndex + 1]

      return !(
        nextToken &&
        matchesContextStep(nextToken, comparativeClauseFollowUpToken(), context)
      )
    },
  },
] as const

function matchesContextStep(
  token: RuleCheckContext['tokens'][number],
  step: PatternStep,
  context: RuleCheckContext,
) {
  if ('type' in step && step.type === 'skip') {
    return false
  }

  if (step.literal) {
    const literals = Array.isArray(step.literal) ? step.literal : [step.literal]

    if (!literals.includes(token.normalized)) {
      return false
    }
  }

  if (step.regex) {
    const regex = new RegExp(step.regex, step.flags)

    if (!regex.test(token.normalized)) {
      return false
    }
  }

  if (step.test && !step.test(token, context)) {
    return false
  }

  return true
}
