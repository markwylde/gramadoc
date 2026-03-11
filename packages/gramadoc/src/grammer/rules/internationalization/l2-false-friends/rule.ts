import {
  findPatternMatches,
  type PatternMatch,
  type PatternStep,
} from '../../../patterns.js'
import {
  getL2FalseFriendPackForProfile,
  type L2FalseFriendPackEntry,
} from '../../../resources/l2-false-friends.js'
import type { GrammerRule, RuleCheckContext } from '../../../types.js'
import { createMatch } from '../../../utils.js'

function normalizePatterns(pattern: PatternStep[] | PatternStep[][]) {
  if (pattern.length === 0) {
    return []
  }

  return Array.isArray(pattern[0])
    ? (pattern as PatternStep[][])
    : [pattern as PatternStep[]]
}

function renderMessage(
  entry: L2FalseFriendPackEntry,
  match: PatternMatch,
  context: RuleCheckContext,
) {
  return typeof entry.message === 'function'
    ? entry.message(match, context)
    : entry.message
}

function renderReplacements(
  entry: L2FalseFriendPackEntry,
  match: PatternMatch,
  context: RuleCheckContext,
) {
  return typeof entry.replacements === 'function'
    ? entry.replacements(match, context)
    : entry.replacements
}

function isQuotedLiteral(text: string, start: number, end: number) {
  const leading = text.slice(Math.max(0, start - 1), start)
  const trailing = text.slice(end, Math.min(text.length, end + 1))

  return /["'`“‘]$/u.test(leading) && /^[ "'`”’]/u.test(trailing)
}

export const l2FalseFriendsRule: GrammerRule = {
  id: 'L2_FALSE_FRIENDS',
  name: 'L2 Learner Pack',
  description:
    'Flags optional native-language-specific learner patterns, including false friends and grammar-transfer cues, only when the matching pack is enabled.',
  shortMessage: 'Usage',
  issueType: 'misspelling',
  category: {
    id: 'INTERNATIONALIZATION',
    name: 'Internationalization',
  },
  examples: {
    good: [
      { text: 'We attended the meeting and asked them to update the draft.' },
    ],
    bad: [
      {
        text: 'We assisted to the meeting and demanded them to update the draft.',
      },
    ],
  },
  check(context) {
    const pack = getL2FalseFriendPackForProfile(context.nativeLanguageProfile)

    if (!pack || !context.enabledRulePacks.includes(pack.packId)) {
      return []
    }

    return pack.entries
      .flatMap((entry: L2FalseFriendPackEntry) =>
        normalizePatterns(entry.pattern)
          .flatMap((pattern) => findPatternMatches(context, pattern))
          .filter((match) => entry.filter?.(match, context) ?? true)
          .map((match) => {
            const reportTokens =
              entry.reportCapture === undefined
                ? match.tokens
                : (match.captures[entry.reportCapture] ?? match.tokens)
            const firstToken = reportTokens[0]
            const lastToken = reportTokens.at(-1) ?? firstToken
            const offset = firstToken.offset
            const length =
              lastToken.offset + lastToken.length - firstToken.offset
            const fullMatchStart = match.tokens[0]?.offset ?? offset
            const fullMatchEndToken = match.tokens.at(-1) ?? lastToken
            const fullMatchEnd =
              fullMatchEndToken.offset + fullMatchEndToken.length

            if (
              isQuotedLiteral(context.text, offset, offset + length) ||
              isQuotedLiteral(context.text, fullMatchStart, fullMatchEnd)
            ) {
              return undefined
            }

            return createMatch({
              text: context.text,
              offset,
              length,
              message: renderMessage(entry, match, context),
              replacements: renderReplacements(entry, match, context),
              rule: l2FalseFriendsRule,
            })
          }),
      )
      .filter((match) => match !== undefined)
      .sort((left, right) => left.offset - right.offset)
  },
}

export const l2FalseFriendRule = l2FalseFriendsRule

export const l2FalseFriendsRules = [l2FalseFriendsRule]
