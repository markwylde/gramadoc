import type { Match } from '../../../../types.js'
import type {
  GrammerOptionalRulePack,
  GrammerRule,
  Token,
} from '../../../types.js'
import { createMatch } from '../../../utils.js'

const STRICT_E_PRIME_PACK =
  'creative-writing/e-prime-strict' satisfies GrammerOptionalRulePack
const LOOSE_E_PRIME_PACK =
  'creative-writing/e-prime-loose' satisfies GrammerOptionalRulePack
const OPTIONAL_E_PRIME_NOTE =
  'Kept as an optional editorial pack for teams that deliberately want E-Prime guidance without changing default analysis.'

const STRICT_BE_FORMS = new Set([
  'am',
  'are',
  'be',
  'been',
  'being',
  'is',
  'was',
  'were',
])
const LOOSE_BE_FORMS = new Set(['am', 'are', 'is', 'was', 'were'])
const COPULAR_ADVERBS = new Set([
  'almost',
  'fairly',
  'just',
  'more',
  'most',
  'nearly',
  'quite',
  'rather',
  'really',
  'so',
  'still',
  'too',
  'very',
])
const ARTICLE_OR_DETERMINER_WORDS = new Set([
  'a',
  'an',
  'another',
  'no',
  'the',
  'this',
  'that',
  'these',
  'those',
])

function isRulePackEnabled(
  enabledRulePacks: readonly GrammerOptionalRulePack[],
  rulePack: GrammerOptionalRulePack,
) {
  return enabledRulePacks.includes(rulePack)
}

function getNextContentToken(tokens: Token[], startIndex: number) {
  const candidate = tokens[startIndex + 1]
  if (!candidate) {
    return undefined
  }

  if (candidate.sentenceIndex !== tokens[startIndex]?.sentenceIndex) {
    return undefined
  }

  return /^\s*$/u.test(candidate.leadingText) ? candidate : undefined
}

function getCopularFollower(tokens: Token[], beTokenIndex: number) {
  let follower = getNextContentToken(tokens, beTokenIndex)

  while (follower && COPULAR_ADVERBS.has(follower.normalized)) {
    follower = getNextContentToken(tokens, follower.index)
  }

  return follower
}

function isLooseCopularConstruction(tokens: Token[], beTokenIndex: number) {
  const follower = getCopularFollower(tokens, beTokenIndex)

  if (!follower) {
    return false
  }

  if (/ing$/u.test(follower.normalized)) {
    return false
  }

  if (
    ARTICLE_OR_DETERMINER_WORDS.has(follower.normalized) ||
    follower.posHints.includes('adjective')
  ) {
    return true
  }

  return false
}

export const strictEPrimeRule: GrammerRule = {
  id: 'E_PRIME_STRICT',
  name: 'E-Prime (Strict)',
  description: `Optional editorial rule that flags every form of "to be" for teams that deliberately write in strict E-Prime. ${OPTIONAL_E_PRIME_NOTE}`,
  shortMessage: 'Editorial',
  issueType: 'style',
  category: {
    id: 'CREATIVE_WRITING',
    name: 'Creative Writing & Editorial',
  },
  examples: {
    good: [{ text: 'The launch failed, so we rewrote the onboarding copy.' }],
    bad: [{ text: 'The launch is late, and the copy was confusing.' }],
  },
  check({ text, tokens, enabledRulePacks }) {
    if (!isRulePackEnabled(enabledRulePacks, STRICT_E_PRIME_PACK)) {
      return []
    }

    const matches: Match[] = []

    for (const token of tokens) {
      if (!STRICT_BE_FORMS.has(token.normalized)) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message:
            'Strict E-Prime avoids forms of "to be". Rewrite this clause with a more specific verb.',
          rule: strictEPrimeRule,
        }),
      )
    }

    return matches
  },
}

export const looseEPrimeRule: GrammerRule = {
  id: 'E_PRIME_LOOSE',
  name: 'E-Prime (Loose)',
  description: `Optional follow-on editorial rule that flags only the most direct E-Prime candidates, such as existential openings and simple copular "be" constructions. ${OPTIONAL_E_PRIME_NOTE}`,
  shortMessage: 'Editorial',
  issueType: 'style',
  category: {
    id: 'CREATIVE_WRITING',
    name: 'Creative Writing & Editorial',
  },
  examples: {
    good: [
      { text: 'Two issues remain in the draft.' },
      { text: 'The release shipped yesterday.' },
    ],
    bad: [
      { text: 'There are two issues in the draft.' },
      { text: 'The release is unclear.' },
    ],
  },
  check({ text, tokens, enabledRulePacks }) {
    if (!isRulePackEnabled(enabledRulePacks, LOOSE_E_PRIME_PACK)) {
      return []
    }

    const matches: Match[] = []

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]
      const previousToken = tokens[index - 1]

      if (
        token.normalized === 'there' &&
        token.isSentenceStart &&
        LOOSE_BE_FORMS.has(tokens[index + 1]?.normalized ?? '')
      ) {
        const beToken = tokens[index + 1]

        matches.push(
          createMatch({
            text,
            offset: token.offset,
            length: beToken.offset + beToken.length - token.offset,
            message:
              'Loose E-Prime prefers naming the subject directly instead of opening with "there is/are".',
            rule: looseEPrimeRule,
          }),
        )

        index += 1
        continue
      }

      if (!LOOSE_BE_FORMS.has(token.normalized)) {
        continue
      }

      if (
        previousToken?.isSentenceStart &&
        previousToken.normalized === 'there'
      ) {
        continue
      }

      if (!isLooseCopularConstruction(tokens, index)) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message:
            'Loose E-Prime prefers replacing this "be" verb with a more specific verb.',
          rule: looseEPrimeRule,
        }),
      )
    }

    return matches
  },
}

export const ePrimeRules = [strictEPrimeRule, looseEPrimeRule]
