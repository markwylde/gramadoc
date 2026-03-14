import type { Match } from '../../../../types.js'
import { hasPosHint, hasStrongPosHint } from '../../../linguistics.js'
import { isLikelyFiniteVerbMorphology } from '../../../morphology.js'
import { createPatternRule } from '../../../patterns.js'
import articlePhonetics from '../../../resources/article-phonetics.json' with {
  type: 'json',
}
import type { GrammerRule, Token } from '../../../types.js'
import { createMatch, preserveCase } from '../../../utils.js'

const VOWEL_START_REGEX = /^[aeiou]/i
const CONSONANT_START_REGEX = /^[bcdfghjklmnpqrstvwxyz]/i
const CONSONANT_SOUND_VOWEL_EXCEPTIONS = new Set(
  articlePhonetics.preferAPrefixes,
)
const SILENT_H_CONSONANT_EXCEPTIONS = new Set(articlePhonetics.preferAnPrefixes)
const COUNTABLE_NOUNS = new Set([
  'apple',
  'banana',
  'book',
  'car',
  'email',
  'guide',
  'idea',
  'orange',
  'plan',
  'report',
])
const UNCOUNTABLE_NOUNS = new Set([
  'advice',
  'equipment',
  'information',
  'money',
  'traffic',
  'water',
  'work',
])
const NON_NOUN_FOLLOWERS = new Set([
  'am',
  'are',
  'be',
  'been',
  'being',
  'did',
  'do',
  'does',
  'exciting',
  'feel',
  'feels',
  'go',
  'goes',
  'had',
  'has',
  'have',
  'is',
  'look',
  'looks',
  'seem',
  'seems',
  'was',
  'were',
])
const LIKELY_PREDICATE_WORDS = new Set([
  'am',
  'are',
  'been',
  'fell',
  'feel',
  'feels',
  'go',
  'goes',
  'had',
  'has',
  'have',
  'is',
  'look',
  'looks',
  'seem',
  'seems',
  'was',
  'were',
])
const DETERMINERS = new Set([
  'a',
  'an',
  'the',
  'this',
  'that',
  'these',
  'those',
  'my',
  'your',
  'our',
  'their',
  'his',
  'her',
  'its',
  'some',
  'any',
  'many',
  'much',
  'few',
  'fewer',
  'less',
  'another',
])
const ARTICLE_TRIGGER_VERBS = new Set([
  'bought',
  'carried',
  'found',
  'need',
  'packed',
  'read',
  'saw',
  'wrote',
])

function hasWhitespaceBridge(text: string, left: Token, right: Token) {
  return /^\s+$/u.test(text.slice(left.offset + left.length, right.offset))
}

function isLikelyNoun(value: string) {
  return !NON_NOUN_FOLLOWERS.has(value)
}

function isLikelyPredicateWord(token: Token) {
  return (
    LIKELY_PREDICATE_WORDS.has(token.normalized) ||
    isLikelyFiniteVerbMorphology(token)
  )
}

function isLikelyHeadNounToken(token: Token) {
  if (
    COUNTABLE_NOUNS.has(token.normalized) ||
    UNCOUNTABLE_NOUNS.has(token.normalized)
  ) {
    return true
  }

  if (isLikelyFiniteVerbMorphology(token) && !hasStrongPosHint(token, 'noun')) {
    return false
  }

  return (
    hasPosHint(token, 'noun') &&
    !hasPosHint(token, 'verb') &&
    !hasPosHint(token, 'auxiliary') &&
    !hasPosHint(token, 'modal') &&
    !hasPosHint(token, 'determiner') &&
    !hasPosHint(token, 'preposition')
  )
}

function isLikelyDemonstrativeNoun(token: Token, following?: Token) {
  if (isLikelyHeadNounToken(token)) {
    return true
  }

  if (
    !isLikelyNoun(token.normalized) ||
    hasPosHint(token, 'verb') ||
    hasPosHint(token, 'auxiliary') ||
    hasPosHint(token, 'modal') ||
    !following
  ) {
    return false
  }

  return isLikelyPredicateWord(following)
}

function isLikelyClauseSubjectToken(token: Token) {
  return isLikelyHeadNounToken(token) || hasPosHint(token, 'pronoun')
}

function isLikelyClausePredicateToken(token: Token) {
  return (
    !hasPosHint(token, 'preposition') &&
    (isLikelyPredicateWord(token) ||
      hasPosHint(token, 'verb') ||
      hasPosHint(token, 'auxiliary') ||
      hasPosHint(token, 'modal'))
  )
}

function isLikelyClauseEmbeddingTrigger(token: Token) {
  return (
    !hasPosHint(token, 'preposition') &&
    (hasPosHint(token, 'verb') ||
      hasPosHint(token, 'auxiliary') ||
      hasPosHint(token, 'modal') ||
      isLikelyFiniteVerbMorphology(token))
  )
}

function isLikelyClauseAntecedent(token: Token) {
  return (
    !hasPosHint(token, 'determiner') &&
    !hasPosHint(token, 'preposition') &&
    isLikelyHeadNounToken(token)
  )
}

function hasSentenceLevelPredicateAfterThatClause(
  tokens: Token[],
  index: number,
) {
  const current = tokens[index]

  if (!current) {
    return false
  }

  for (let lookahead = index + 3; lookahead < tokens.length; lookahead += 1) {
    const candidate = tokens[lookahead]

    if (!candidate || candidate.sentenceIndex !== current.sentenceIndex) {
      break
    }

    if (isLikelyClausePredicateToken(candidate)) {
      return true
    }
  }

  return false
}

function isClauseIntroducingThat(
  tokens: Token[],
  index: number,
  text: string,
): boolean {
  const current = tokens[index]
  const previous = tokens[index - 1]
  const next = tokens[index + 1]
  const following = tokens[index + 2]

  if (
    current?.normalized !== 'that' ||
    !next ||
    !following ||
    next.sentenceIndex !== current.sentenceIndex ||
    following.sentenceIndex !== current.sentenceIndex
  ) {
    return false
  }

  if (!isLikelyClauseSubjectToken(next)) {
    return false
  }

  if (current.isSentenceStart) {
    return hasSentenceLevelPredicateAfterThatClause(tokens, index)
  }

  if (
    !previous ||
    previous.sentenceIndex !== current.sentenceIndex ||
    !hasWhitespaceBridge(text, previous, current)
  ) {
    return false
  }

  if (isLikelyClauseEmbeddingTrigger(previous)) {
    return true
  }

  return (
    isLikelyClauseAntecedent(previous) &&
    isLikelyClausePredicateToken(following)
  )
}

function getIndefiniteArticle(noun: string) {
  return VOWEL_START_REGEX.test(noun) ? 'an' : 'a'
}

export const articleBeforeVowelRule = createPatternRule({
  id: 'ARTICLE_BEFORE_VOWEL',
  name: 'A Before Vowel',
  description: 'Suggests "an" when the next word starts with a vowel sound.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'ARTICLES_DETERMINERS',
    name: 'Articles & Determiners',
  },
  examples: {
    good: [
      { text: 'I ate an apple before lunch.' },
      { text: 'She found an orange on the table.' },
      { text: 'A user can open one account.' },
    ],
    bad: [
      { text: 'I ate a apple before lunch.' },
      { text: 'She saw a orange in the bowl.' },
    ],
  },
  pattern: [
    { literal: 'a', capture: 'article' },
    {
      capture: 'next',
      test: (token) => VOWEL_START_REGEX.test(token.value),
    },
  ],
  filter: (match) => {
    const article = match.captures.article?.[0]
    const next = match.captures.next?.[0]

    if (!article || !next || !/^\s+$/u.test(article.trailingText)) {
      return false
    }

    const nextWord = next.normalized
    return ![...CONSONANT_SOUND_VOWEL_EXCEPTIONS].some((prefix) =>
      nextWord.startsWith(prefix),
    )
  },
  reportCapture: 'article',
  message: (match) =>
    `Use "${preserveCase(match.captures.article[0].value, 'an')}" before "${match.captures.next[0].value}".`,
  replacements: (match) => [
    preserveCase(match.captures.article[0].value, 'an'),
  ],
})

export const articleBeforeConsonantRule = createPatternRule({
  id: 'ARTICLE_BEFORE_CONSONANT',
  name: 'An Before Consonant',
  description: 'Suggests "a" when the next word starts with a consonant sound.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'ARTICLES_DETERMINERS',
    name: 'Articles & Determiners',
  },
  examples: {
    good: [
      { text: 'She packed a banana for the trip.' },
      { text: 'He bought a book yesterday.' },
      { text: 'It took an hour to finish.' },
    ],
    bad: [
      { text: 'She packed an banana for the trip.' },
      { text: 'He bought an book yesterday.' },
    ],
  },
  pattern: [
    { literal: 'an', capture: 'article' },
    {
      capture: 'next',
      test: (token) => CONSONANT_START_REGEX.test(token.value),
    },
  ],
  filter: (match) => {
    const article = match.captures.article?.[0]
    const next = match.captures.next?.[0]

    if (!article || !next || !/^\s+$/u.test(article.trailingText)) {
      return false
    }

    const nextWord = next.normalized
    return ![...SILENT_H_CONSONANT_EXCEPTIONS].some((prefix) =>
      nextWord.startsWith(prefix),
    )
  },
  reportCapture: 'article',
  message: (match) =>
    `Use "${preserveCase(match.captures.article[0].value, 'a')}" before "${match.captures.next[0].value}".`,
  replacements: (match) => [preserveCase(match.captures.article[0].value, 'a')],
})

export const missingArticlesRule: GrammerRule = {
  id: 'MISSING_ARTICLES',
  name: 'Missing Articles',
  description:
    'Flags a small set of singular count nouns when they appear without an article or determiner in simple verb-object phrases.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'ARTICLES_DETERMINERS',
    name: 'Articles & Determiners',
  },
  examples: {
    good: [
      { text: 'She bought a book yesterday.' },
      { text: 'We found an orange on the table.' },
    ],
    bad: [
      { text: 'She bought book yesterday.' },
      { text: 'We found orange on the table.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 1; index < tokens.length; index += 1) {
      const previous = tokens[index - 1]
      const current = tokens[index]
      const beforePrevious = tokens[index - 2]

      if (
        !ARTICLE_TRIGGER_VERBS.has(previous.normalized) ||
        !COUNTABLE_NOUNS.has(current.normalized) ||
        current.isPluralLike ||
        (beforePrevious && DETERMINERS.has(beforePrevious.normalized))
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: current.offset,
          length: current.length,
          message: `Add "${getIndefiniteArticle(current.normalized)}" before "${current.value}".`,
          replacements: [
            `${getIndefiniteArticle(current.normalized)} ${current.value}`,
          ],
          rule: missingArticlesRule,
        }),
      )
    }

    return matches
  },
}

export const incorrectDeterminersRule: GrammerRule = {
  id: 'INCORRECT_DETERMINERS',
  name: 'Incorrect Determiners',
  description:
    'Flags a few common determiner mismatches for countable and uncountable nouns.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'ARTICLES_DETERMINERS',
    name: 'Articles & Determiners',
  },
  examples: {
    good: [
      { text: 'Many books were helpful.' },
      { text: 'Much water remained.' },
    ],
    bad: [
      { text: 'Much books were helpful.' },
      { text: 'Many water remained.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = tokens[index + 1]
      const between = text.slice(current.offset + current.length, next.offset)

      if (!/^\s+$/.test(between)) {
        continue
      }

      if (
        current.normalized === 'much' &&
        (COUNTABLE_NOUNS.has(next.normalized) || next.isPluralLike)
      ) {
        matches.push(
          createMatch({
            text,
            offset: current.offset,
            length: current.length,
            message: `Use "many" before the countable noun "${next.value}".`,
            replacements: ['many'],
            rule: incorrectDeterminersRule,
          }),
        )
      }

      if (
        current.normalized === 'many' &&
        UNCOUNTABLE_NOUNS.has(next.normalized)
      ) {
        matches.push(
          createMatch({
            text,
            offset: current.offset,
            length: current.length,
            message: `Use "much" before the uncountable noun "${next.value}".`,
            replacements: ['much'],
            rule: incorrectDeterminersRule,
          }),
        )
      }

      if (
        current.normalized === 'less' &&
        (COUNTABLE_NOUNS.has(next.normalized) || next.isPluralLike)
      ) {
        matches.push(
          createMatch({
            text,
            offset: current.offset,
            length: current.length,
            message: `Use "fewer" before the countable noun "${next.value}".`,
            replacements: ['fewer'],
            rule: incorrectDeterminersRule,
          }),
        )
      }

      if (
        current.normalized === 'fewer' &&
        UNCOUNTABLE_NOUNS.has(next.normalized)
      ) {
        matches.push(
          createMatch({
            text,
            offset: current.offset,
            length: current.length,
            message: `Use "less" before the uncountable noun "${next.value}".`,
            replacements: ['less'],
            rule: incorrectDeterminersRule,
          }),
        )
      }
    }

    return matches
  },
}

export const demonstrativeMisuseRule: GrammerRule = {
  id: 'DEMONSTRATIVE_MISUSE',
  name: 'Demonstrative Misuse',
  description:
    'Flags demonstratives that do not agree with a nearby singular or plural noun.',
  shortMessage: 'Grammar',
  issueType: 'grammar',
  category: {
    id: 'ARTICLES_DETERMINERS',
    name: 'Articles & Determiners',
  },
  examples: {
    good: [
      { text: 'These books were helpful.' },
      { text: 'That guide is clear.' },
    ],
    bad: [
      { text: 'This books were helpful.' },
      { text: 'Those guide is clear.' },
    ],
  },
  check({ text, tokens }) {
    const matches: Match[] = []

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index]
      const next = tokens[index + 1]
      const following = tokens[index + 2]
      const between = text.slice(current.offset + current.length, next.offset)

      if (!/^\s+$/.test(between)) {
        continue
      }

      if (
        following &&
        !/^\s+$/.test(text.slice(next.offset + next.length, following.offset))
      ) {
        continue
      }

      if (isClauseIntroducingThat(tokens, index, text)) {
        continue
      }

      if (!isLikelyDemonstrativeNoun(next, following)) {
        continue
      }

      const nextIsPlural =
        next.isPluralLike && !UNCOUNTABLE_NOUNS.has(next.normalized)

      if (
        (current.normalized === 'this' || current.normalized === 'that') &&
        nextIsPlural
      ) {
        const replacement =
          current.normalized === 'this'
            ? preserveCase(current.value, 'these')
            : preserveCase(current.value, 'those')

        matches.push(
          createMatch({
            text,
            offset: current.offset,
            length: current.length,
            message: `Use "${replacement}" with the plural noun "${next.value}".`,
            replacements: [replacement],
            rule: demonstrativeMisuseRule,
          }),
        )
      }

      if (
        (current.normalized === 'these' || current.normalized === 'those') &&
        !nextIsPlural
      ) {
        const replacement =
          current.normalized === 'these'
            ? preserveCase(current.value, 'this')
            : preserveCase(current.value, 'that')

        matches.push(
          createMatch({
            text,
            offset: current.offset,
            length: current.length,
            message: `Use "${replacement}" with the singular noun "${next.value}".`,
            replacements: [replacement],
            rule: demonstrativeMisuseRule,
          }),
        )
      }
    }

    return matches
  },
}

export const articlesDeterminersRules = [
  articleBeforeVowelRule,
  articleBeforeConsonantRule,
  missingArticlesRule,
  incorrectDeterminersRule,
  demonstrativeMisuseRule,
]
