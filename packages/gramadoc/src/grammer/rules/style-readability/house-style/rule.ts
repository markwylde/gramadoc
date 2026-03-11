import type { Match } from '../../../../types.js'
import {
  type HouseStyleTerm,
  houseStyleTerms,
} from '../../../resources/house-style.js'
import { findTokenPhraseMatches } from '../../../rule-helpers.js'
import type { GrammerLanguageCode, GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

function isQuotedLiteral(text: string, start: number, end: number) {
  const leading = text.slice(Math.max(0, start - 1), start)
  const trailing = text.slice(end, Math.min(text.length, end + 1))

  return /["'`“‘]$/u.test(leading) && /^[ "'`”’]/u.test(trailing)
}

function getEffectiveHouseStyleTerms(
  customTerms: readonly HouseStyleTerm[],
  languageCode: GrammerLanguageCode,
) {
  const mergedTerms = [...customTerms, ...houseStyleTerms]
  const dedupedTerms = new Map<string, HouseStyleTerm>()

  for (const term of mergedTerms) {
    if (
      term.languageCodes?.length &&
      !term.languageCodes.includes(languageCode)
    ) {
      continue
    }

    const key = term.phrase.toLocaleLowerCase('en')

    if (!dedupedTerms.has(key)) {
      dedupedTerms.set(key, term)
    }
  }

  return [...dedupedTerms.values()].sort(
    (left, right) =>
      right.phrase.split(/\s+/u).length - left.phrase.split(/\s+/u).length ||
      right.phrase.length - left.phrase.length,
  )
}

export const houseStyleTermsRule: GrammerRule = {
  id: 'HOUSE_STYLE_TERMS',
  name: 'House-Style Terms',
  description:
    'Flags preferred product, brand, and convention-driven terms from the built-in house-style pack.',
  shortMessage: 'House style',
  issueType: 'style',
  category: {
    id: 'HOUSE_STYLE',
    name: 'House Style',
  },
  examples: {
    good: [
      { text: 'GitHub Actions runs our TypeScript checks on IPv6 traffic.' },
    ],
    bad: [
      {
        text: 'Github Actions runs our Typescript checks on ipv6 traffic from G Suite.',
      },
    ],
  },
  check(context) {
    const matches: Match[] = []
    const terms = getEffectiveHouseStyleTerms(
      context.houseStyleTerms,
      context.language.code,
    )

    for (const { entry, tokens } of findTokenPhraseMatches(context, terms)) {
      const firstToken = tokens[0]
      const lastToken = tokens.at(-1) ?? firstToken

      if (!firstToken || !lastToken) {
        continue
      }

      const offset = firstToken.offset
      const length = lastToken.offset + lastToken.length - firstToken.offset
      const surface = context.text.slice(offset, offset + length)

      if (
        surface === entry.preferred ||
        isQuotedLiteral(context.text, offset, offset + length)
      ) {
        continue
      }

      matches.push(
        createMatch({
          text: context.text,
          offset,
          length,
          message: entry.message,
          replacements: [entry.preferred],
          rule: houseStyleTermsRule,
        }),
      )
    }

    return matches
  },
}

export const houseStyleRules = [houseStyleTermsRule]
