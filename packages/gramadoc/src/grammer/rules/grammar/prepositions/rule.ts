import { findPatternMatches, type PatternMatch } from '../../../patterns.js'
import { prepositionCollocations } from '../../../resources/preposition-collocations.js'
import type { GrammerRule, RuleCheckContext } from '../../../types.js'
import { createMatch } from '../../../utils.js'

function getCollocationMatches(
  context: RuleCheckContext,
  collocation: (typeof prepositionCollocations)[number],
) {
  return findPatternMatches(context, collocation.pattern)
    .filter((match) =>
      match.tokens.every(
        (token, index) =>
          index === match.tokens.length - 1 ||
          /^\s+$/u.test(token.trailingText),
      ),
    )
    .filter((match) =>
      (collocation.antiPatterns ?? []).every((antiPattern) =>
        findPatternMatches(context, antiPattern).every(
          (antiPatternMatch) =>
            antiPatternMatch.startIndex !== match.startIndex ||
            antiPatternMatch.endIndex !== match.endIndex,
        ),
      ),
    )
    .filter((match) => collocation.filter?.(match, context) ?? true)
}

export const incorrectPrepositionsRule: GrammerRule = {
  id: 'INCORRECT_PREPOSITIONS',
  name: 'Incorrect Prepositions',
  description: 'Flags resource-backed fixed-expression preposition mistakes.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'PREPOSITIONS',
    name: 'Prepositions',
  },
  examples: {
    good: [
      { text: 'We arrived at the station on time.' },
      { text: 'She is interested in design.' },
    ],
    bad: [
      { text: 'We arrived to the station on time.' },
      { text: 'She is interested on design.' },
    ],
  },
  check(context) {
    return prepositionCollocations
      .flatMap((collocation) =>
        getCollocationMatches(context, collocation).map(
          (match: PatternMatch) => {
            const reportTokens = collocation.reportWholeMatch
              ? match.tokens
              : (match.captures.focus ?? [
                  match.tokens.at(-1) ?? match.tokens[0],
                ])
            const firstToken = reportTokens[0]
            const lastToken = reportTokens.at(-1) ?? firstToken

            return createMatch({
              text: context.text,
              offset: firstToken.offset,
              length: lastToken.offset + lastToken.length - firstToken.offset,
              message: collocation.message,
              replacements:
                collocation.replacement === '' ? [] : [collocation.replacement],
              rule: incorrectPrepositionsRule,
            })
          },
        ),
      )
      .sort((left, right) => left.offset - right.offset)
  },
}

export const prepositionsRules = [incorrectPrepositionsRule]
