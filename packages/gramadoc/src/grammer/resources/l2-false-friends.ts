import type { PatternMatch, PatternStep } from '../patterns.js'
import type {
  GrammerOptionalRulePack,
  NativeLanguageProfile,
  RuleCheckContext,
} from '../types.js'
import { preserveCase } from '../utils.js'

export type LearnerRuleKind = 'false-friend' | 'grammar-transfer'

export type LearnerRuleTopic =
  | 'adjective-preposition'
  | 'noun-choice'
  | 'verb-choice'
  | 'verb-preposition'

export interface LearnerProfileDefinition {
  nativeLanguageProfile: NativeLanguageProfile
  label: string
  description: string
  transferFocus: readonly LearnerRuleTopic[]
}

export interface L2FalseFriendPackEntry {
  id: string
  kind: LearnerRuleKind
  topic: LearnerRuleTopic
  explanation: string
  pattern: PatternStep[] | PatternStep[][]
  reportCapture?: string
  message: string | ((match: PatternMatch, context: RuleCheckContext) => string)
  replacements:
    | string[]
    | ((match: PatternMatch, context: RuleCheckContext) => string[])
  filter?: (match: PatternMatch, context: RuleCheckContext) => boolean
}

export interface L2FalseFriendPack {
  packId: GrammerOptionalRulePack
  profile: LearnerProfileDefinition
  defaultEnabled: false
  entries: readonly L2FalseFriendPackEntry[]
}

const ATTEND_REPLACEMENTS = {
  assist: 'attend',
  assisted: 'attended',
  assisting: 'attending',
  assists: 'attends',
} as const

const ASK_REPLACEMENTS = {
  demand: 'ask',
  demanded: 'asked',
  demanding: 'asking',
  demands: 'asks',
} as const

const EVENT_NOUNS = [
  'call',
  'class',
  'conference',
  'course',
  'demo',
  'event',
  'interview',
  'lecture',
  'meeting',
  'presentation',
  'seminar',
  'session',
  'training',
  'webinar',
  'workshop',
] as const

const DETERMINERS = [
  'a',
  'an',
  'each',
  'every',
  'that',
  'the',
  'their',
  'this',
  'those',
  'these',
] as const
const CURRENT_NOUNS = [
  'approach',
  'build',
  'policy',
  'release',
  'roadmap',
  'situation',
  'status',
  'version',
] as const

const DEPEND_VERBS = ['depend', 'depends', 'depended', 'depending'] as const
const DISCUSS_VERBS = [
  'discuss',
  'discusses',
  'discussed',
  'discussing',
] as const

function inflectReplacement(
  match: PatternMatch,
  capture: string,
  replacements: Record<string, string>,
) {
  const token = match.captures[capture]?.[0]

  if (!token) {
    return ''
  }

  const replacement = replacements[token.normalized]

  return replacement ? preserveCase(token.value, replacement) : ''
}

export const l2FalseFriendPacksByNativeLanguageProfile: Partial<
  Record<NativeLanguageProfile, L2FalseFriendPack>
> = {
  'l1/fr': {
    packId: 'l2-false-friends/fr',
    profile: {
      nativeLanguageProfile: 'l1/fr',
      label: 'French',
      description:
        'Targets a small starter pack of high-confidence French-to-English transfer patterns.',
      transferFocus: ['verb-choice'],
    },
    defaultEnabled: false,
    entries: [
      {
        id: 'FR_ASSIST_TO_EVENT',
        kind: 'false-friend',
        topic: 'verb-choice',
        explanation:
          'French learners may map "assister a" directly onto English "assist to", but English uses "attend" for events.',
        pattern: [
          [
            {
              literal: Object.keys(ATTEND_REPLACEMENTS),
              capture: 'verb',
            },
            { literal: 'to' },
            {
              literal: [...EVENT_NOUNS],
              capture: 'event',
            },
          ],
          [
            {
              literal: Object.keys(ATTEND_REPLACEMENTS),
              capture: 'verb',
            },
            { literal: 'to' },
            { literal: [...DETERMINERS] },
            {
              literal: [...EVENT_NOUNS],
              capture: 'event',
            },
          ],
        ],
        reportCapture: 'verb',
        message:
          'In English, "assist" usually means "help"; use "attend" for meetings, classes, or events.',
        replacements: (match) => {
          const verb = inflectReplacement(match, 'verb', ATTEND_REPLACEMENTS)
          const tail = match.tokens
            .slice(2)
            .map((token) => token.value)
            .join(' ')

          return verb && tail ? [`${verb} ${tail}`] : []
        },
      },
      {
        id: 'FR_DEMAND_OBJECT_TO_VERB',
        kind: 'false-friend',
        topic: 'verb-choice',
        explanation:
          'French "demander" often maps to English "ask", not the stronger verb "demand", in request contexts.',
        pattern: [
          {
            literal: Object.keys(ASK_REPLACEMENTS),
            capture: 'verb',
          },
          {
            literal: ['me', 'us', 'him', 'her', 'them'],
            capture: 'object',
          },
          { literal: 'to' },
          {
            regex: '^[a-z]+$',
            capture: 'action',
          },
        ],
        message:
          'In English, "demand" is usually too strong here; "ask ... to" is the more natural rewrite.',
        replacements: (match) => {
          const verb = inflectReplacement(match, 'verb', ASK_REPLACEMENTS)
          const objectToken = match.captures.object?.[0]
          const actionToken = match.captures.action?.[0]

          if (!verb || !objectToken || !actionToken) {
            return []
          }

          return [`${verb} ${objectToken.value} to ${actionToken.value}`]
        },
      },
    ],
  },
  'l1/es': {
    packId: 'l2-false-friends/es',
    profile: {
      nativeLanguageProfile: 'l1/es',
      label: 'Spanish',
      description:
        'Targets common Spanish-to-English transfer patterns across false friends and verb-preposition choices.',
      transferFocus: ['noun-choice', 'verb-preposition'],
    },
    defaultEnabled: false,
    entries: [
      {
        id: 'ES_ACTUAL_CURRENT',
        kind: 'false-friend',
        topic: 'noun-choice',
        explanation:
          'Spanish "actual" usually means "current", so direct transfer often sounds misleading in English product or status wording.',
        pattern: [
          [
            { literal: 'actual', capture: 'word' },
            {
              literal: [...CURRENT_NOUNS],
              capture: 'noun',
            },
          ],
          [
            { literal: 'actual', capture: 'word' },
            { literal: [...DETERMINERS] },
            {
              literal: [...CURRENT_NOUNS],
              capture: 'noun',
            },
          ],
        ],
        reportCapture: 'word',
        message:
          'In English, "actual" usually means "real"; for a present-day version or status, "current" is the clearer word.',
        replacements: (match) => {
          const wordToken = match.captures.word?.[0]

          return wordToken ? [preserveCase(wordToken.value, 'current')] : []
        },
      },
      {
        id: 'ES_DEPEND_OF',
        kind: 'grammar-transfer',
        topic: 'verb-preposition',
        explanation:
          'Spanish "depender de" often leads to "depend of", but English uses "depend on".',
        pattern: [
          { literal: [...DEPEND_VERBS], capture: 'verb' },
          { literal: 'of', capture: 'preposition' },
        ],
        reportCapture: 'preposition',
        message: 'Use "depend on" in English after this verb.',
        replacements: ['on'],
      },
      {
        id: 'ES_DISCUSS_ABOUT',
        kind: 'grammar-transfer',
        topic: 'verb-preposition',
        explanation:
          'Spanish learners often add an extra preposition after "discuss", but standard English uses "discuss" directly with its object.',
        pattern: [
          { literal: [...DISCUSS_VERBS], capture: 'verb' },
          { literal: 'about', capture: 'preposition' },
          { regex: '^[A-Za-z][A-Za-z-]*$', capture: 'topic' },
        ],
        reportCapture: 'preposition',
        message:
          'Use "discuss" directly with the topic instead of "discuss about".',
        replacements: [''],
      },
    ],
  },
}

export function getL2FalseFriendPackForProfile(
  nativeLanguageProfile?: NativeLanguageProfile,
) {
  if (!nativeLanguageProfile) {
    return undefined
  }

  return l2FalseFriendPacksByNativeLanguageProfile[nativeLanguageProfile]
}
