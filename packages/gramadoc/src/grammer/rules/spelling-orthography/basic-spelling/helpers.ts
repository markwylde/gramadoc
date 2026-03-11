import american10 from 'wordlist-english/american-words-10.json' with {
  type: 'json',
}
import american20 from 'wordlist-english/american-words-20.json' with {
  type: 'json',
}
import american35 from 'wordlist-english/american-words-35.json' with {
  type: 'json',
}
import american40 from 'wordlist-english/american-words-40.json' with {
  type: 'json',
}
import american50 from 'wordlist-english/american-words-50.json' with {
  type: 'json',
}
import american55 from 'wordlist-english/american-words-55.json' with {
  type: 'json',
}
import american60 from 'wordlist-english/american-words-60.json' with {
  type: 'json',
}
import british10 from 'wordlist-english/british-words-10.json' with {
  type: 'json',
}
import british20 from 'wordlist-english/british-words-20.json' with {
  type: 'json',
}
import british35 from 'wordlist-english/british-words-35.json' with {
  type: 'json',
}
import british40 from 'wordlist-english/british-words-40.json' with {
  type: 'json',
}
import british50 from 'wordlist-english/british-words-50.json' with {
  type: 'json',
}
import british55 from 'wordlist-english/british-words-55.json' with {
  type: 'json',
}
import british60 from 'wordlist-english/british-words-60.json' with {
  type: 'json',
}
import english10 from 'wordlist-english/english-words-10.json' with {
  type: 'json',
}
import english20 from 'wordlist-english/english-words-20.json' with {
  type: 'json',
}
import english35 from 'wordlist-english/english-words-35.json' with {
  type: 'json',
}
import english40 from 'wordlist-english/english-words-40.json' with {
  type: 'json',
}
import english50 from 'wordlist-english/english-words-50.json' with {
  type: 'json',
}
import english55 from 'wordlist-english/english-words-55.json' with {
  type: 'json',
}
import english60 from 'wordlist-english/english-words-60.json' with {
  type: 'json',
}
import { technicalAllowlist } from '../../../resources/technical-allowlist.js'

const MAX_SUGGESTION_DISTANCE = 3
const MAX_SUGGESTIONS = 3
const MAX_CANDIDATE_CACHE_SIZE = 2000
const MAX_UNKNOWN_WORD_CACHE_SIZE = 5000
const MAX_INDEXED_CANDIDATES = 250
const EXCLUDED_DICTIONARY_WORDS = new Set([
  'arent',
  'cant',
  'couldnt',
  'couldve',
  'didnt',
  'doesnt',
  'dont',
  'hadnt',
  'hasnt',
  'havent',
  'hed',
  'heres',
  'fiance',
  'im',
  'isnt',
  'itll',
  'ive',
  'jalapeno',
  'lets',
  'mightnt',
  'mightve',
  'mustnt',
  'mustve',
  'naive',
  'neednt',
  'shant',
  'senor',
  'shouldve',
  'shouldnt',
  'thatll',
  'thats',
  'therell',
  'theres',
  'theyd',
  'theyll',
  'theyre',
  'theyve',
  'wasnt',
  'weve',
  'werent',
  'whos',
  'wont',
  'wouldve',
  'wouldnt',
  'youd',
  'youll',
  'youre',
  'youve',
])
const DICTIONARY_WORDS = [
  ...new Set(
    [
      english10,
      english20,
      english35,
      english40,
      english50,
      english55,
      english60,
      american10,
      american20,
      american35,
      american40,
      american50,
      american55,
      american60,
      british10,
      british20,
      british35,
      british40,
      british50,
      british55,
      british60,
      technicalAllowlist,
    ]
      .flat()
      .map((word) => word.toLowerCase()),
  ),
].filter((word) => !EXCLUDED_DICTIONARY_WORDS.has(word))

const VALID_WORDS = new Set(
  DICTIONARY_WORDS.filter(
    (word) => !EXCLUDED_DICTIONARY_WORDS.has(word.toLowerCase()),
  ),
)
const WORDS_BY_LENGTH = new Map<number, string[]>()
const WORDS_BY_NGRAM = new Map<string, string[]>()
const CANDIDATE_SCORES_CACHE = new Map<string, CandidateScore[]>()
const UNKNOWN_WORD_CLASSIFICATION_CACHE = new Map<
  string,
  UnknownWordClassification | null
>()

function getWordNgrams(word: string) {
  const padded = `^${word}$`
  const size = word.length <= 4 ? 2 : 3
  const ngrams = new Set<string>()

  for (let index = 0; index <= padded.length - size; index += 1) {
    ngrams.add(padded.slice(index, index + size))
  }

  return [...ngrams]
}

for (const word of DICTIONARY_WORDS) {
  const bucket = WORDS_BY_LENGTH.get(word.length)

  if (bucket) {
    bucket.push(word)
  } else {
    WORDS_BY_LENGTH.set(word.length, [word])
  }

  for (const ngram of getWordNgrams(word)) {
    const ngramBucket = WORDS_BY_NGRAM.get(ngram)

    if (ngramBucket) {
      ngramBucket.push(word)
      continue
    }

    WORDS_BY_NGRAM.set(ngram, [word])
  }
}

interface CandidateScore {
  value: string
  distance: number
}

export type UnknownWordKind =
  | 'TYPOGRAPHICAL_ERRORS'
  | 'TRANSPOSED_LETTERS'
  | 'MISSING_LETTERS'
  | 'EXTRA_LETTERS'
  | 'MISSPELLED_WORDS'
  | 'NON_DICTIONARY_WORDS'

export interface UnknownWordClassification {
  kind: UnknownWordKind
  suggestions: string[]
}

export function isKnownDictionaryWord(word: string) {
  return VALID_WORDS.has(word.toLowerCase())
}

function getCachedValue<T>(cache: Map<string, T>, key: string) {
  const value = cache.get(key)

  if (value === undefined) {
    return undefined
  }

  cache.delete(key)
  cache.set(key, value)
  return value
}

function setCachedValue<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  maxSize: number,
) {
  if (cache.has(key)) {
    cache.delete(key)
  }

  cache.set(key, value)

  if (cache.size <= maxSize) {
    return
  }

  const oldestKey = cache.keys().next().value

  if (oldestKey !== undefined) {
    cache.delete(oldestKey)
  }
}

export function shouldAnalyzeSpellingWord(word: string) {
  return /^[a-z]+$/.test(word) && word.length > 2
}

export function hasSupportedWordCasing(word: string) {
  return (
    word === word.toLowerCase() ||
    word === word.toUpperCase() ||
    /^[A-Z][a-z]+$/.test(word)
  )
}

export function levenshteinDistance(
  a: string,
  b: string,
  maxDistance = Number.POSITIVE_INFINITY,
): number {
  if (a === b) {
    return 0
  }

  if (Math.abs(a.length - b.length) > maxDistance) {
    return maxDistance + 1
  }

  if (a.length === 0) {
    return b.length
  }

  if (b.length === 0) {
    return a.length
  }

  const previous = new Array(b.length + 1)
  const current = new Array(b.length + 1)

  for (let index = 0; index <= b.length; index += 1) {
    previous[index] = index
  }

  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row
    let rowMin = current[0]

    for (let col = 1; col <= b.length; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1
      current[col] = Math.min(
        current[col - 1] + 1,
        previous[col] + 1,
        previous[col - 1] + cost,
      )
      rowMin = Math.min(rowMin, current[col])
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1
    }

    for (let col = 0; col <= b.length; col += 1) {
      previous[col] = current[col]
    }
  }

  return previous[b.length]
}

function isSingleTransposition(source: string, target: string) {
  if (source.length !== target.length || source === target) {
    return false
  }

  for (let index = 0; index < source.length - 1; index += 1) {
    if (source[index] === target[index]) {
      continue
    }

    const swapped =
      source.slice(0, index) +
      source[index + 1] +
      source[index] +
      source.slice(index + 2)

    return swapped === target
  }

  return false
}

function isSingleInsertion(source: string, target: string) {
  if (target.length !== source.length + 1) {
    return false
  }

  let sourceIndex = 0
  let targetIndex = 0
  let skipped = false

  while (sourceIndex < source.length && targetIndex < target.length) {
    if (source[sourceIndex] === target[targetIndex]) {
      sourceIndex += 1
      targetIndex += 1
      continue
    }

    if (skipped) {
      return false
    }

    skipped = true
    targetIndex += 1
  }

  return true
}

function isSingleDeletion(source: string, target: string) {
  return isSingleInsertion(target, source)
}

function isSingleSubstitution(source: string, target: string) {
  if (source.length !== target.length || source === target) {
    return false
  }

  let differences = 0

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== target[index]) {
      differences += 1
    }

    if (differences > 1) {
      return false
    }
  }

  return differences === 1
}

function getNearbyDictionaryWords(word: string) {
  const nearbyWords: string[] = []

  for (
    let length = word.length - MAX_SUGGESTION_DISTANCE;
    length <= word.length + MAX_SUGGESTION_DISTANCE;
    length += 1
  ) {
    const bucket = WORDS_BY_LENGTH.get(length)

    if (!bucket) {
      continue
    }

    nearbyWords.push(...bucket)
  }

  return nearbyWords
}

function getIndexedNearbyDictionaryWords(word: string) {
  if (word.length <= 4) {
    return getNearbyDictionaryWords(word)
  }

  const candidateOverlap = new Map<string, number>()

  for (const ngram of getWordNgrams(word)) {
    const bucket = WORDS_BY_NGRAM.get(ngram)

    if (!bucket) {
      continue
    }

    for (const candidate of bucket) {
      if (Math.abs(candidate.length - word.length) > MAX_SUGGESTION_DISTANCE) {
        continue
      }

      candidateOverlap.set(
        candidate,
        (candidateOverlap.get(candidate) ?? 0) + 1,
      )
    }
  }

  if (candidateOverlap.size === 0) {
    return getNearbyDictionaryWords(word)
  }

  return [...candidateOverlap.entries()]
    .sort((left, right) => {
      if (left[1] !== right[1]) {
        return right[1] - left[1]
      }

      const leftLengthDifference = Math.abs(left[0].length - word.length)
      const rightLengthDifference = Math.abs(right[0].length - word.length)

      if (leftLengthDifference !== rightLengthDifference) {
        return leftLengthDifference - rightLengthDifference
      }

      return left[0].localeCompare(right[0])
    })
    .slice(0, MAX_INDEXED_CANDIDATES)
    .map(([candidate]) => candidate)
}

function scoreCandidateWords(word: string, candidates: string[]) {
  return candidates
    .map((candidate) => ({
      value: candidate,
      distance: levenshteinDistance(word, candidate, MAX_SUGGESTION_DISTANCE),
    }))
    .filter((candidate) => candidate.distance <= MAX_SUGGESTION_DISTANCE)
    .sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance
      }

      const leftLengthDifference = Math.abs(left.value.length - word.length)
      const rightLengthDifference = Math.abs(right.value.length - word.length)

      if (leftLengthDifference !== rightLengthDifference) {
        return leftLengthDifference - rightLengthDifference
      }

      const leftSameFirstLetter = Number(left.value[0] === word[0])
      const rightSameFirstLetter = Number(right.value[0] === word[0])

      if (leftSameFirstLetter !== rightSameFirstLetter) {
        return rightSameFirstLetter - leftSameFirstLetter
      }

      const leftPrefixLength = getCommonPrefixLength(left.value, word)
      const rightPrefixLength = getCommonPrefixLength(right.value, word)

      if (leftPrefixLength !== rightPrefixLength) {
        return rightPrefixLength - leftPrefixLength
      }

      const leftSameLastLetter = Number(left.value.at(-1) === word.at(-1))
      const rightSameLastLetter = Number(right.value.at(-1) === word.at(-1))

      if (leftSameLastLetter !== rightSameLastLetter) {
        return rightSameLastLetter - leftSameLastLetter
      }

      return left.value.localeCompare(right.value)
    })
}

function getCandidateScores(word: string) {
  const cached = getCachedValue(CANDIDATE_SCORES_CACHE, word)

  if (cached) {
    return cached
  }

  const indexedScores = scoreCandidateWords(
    word,
    getIndexedNearbyDictionaryWords(word),
  )
  const scores =
    indexedScores.length > 0
      ? indexedScores
      : scoreCandidateWords(word, getNearbyDictionaryWords(word))

  setCachedValue(CANDIDATE_SCORES_CACHE, word, scores, MAX_CANDIDATE_CACHE_SIZE)
  return scores
}

function formatSuggestions(candidates: CandidateScore[]) {
  return candidates
    .slice(0, MAX_SUGGESTIONS)
    .map((candidate) => candidate.value)
}

function getCommonPrefixLength(source: string, target: string) {
  const maxLength = Math.min(source.length, target.length)
  let index = 0

  while (index < maxLength && source[index] === target[index]) {
    index += 1
  }

  return index
}

export function classifyUnknownWord(
  rawWord: string,
): UnknownWordClassification | null {
  const word = rawWord.toLowerCase()
  const cached = getCachedValue(UNKNOWN_WORD_CLASSIFICATION_CACHE, word)

  if (cached !== undefined) {
    return cached
  }

  if (!shouldAnalyzeSpellingWord(word) || isKnownDictionaryWord(word)) {
    setCachedValue(
      UNKNOWN_WORD_CLASSIFICATION_CACHE,
      word,
      null,
      MAX_UNKNOWN_WORD_CACHE_SIZE,
    )
    return null
  }

  const candidates = getCandidateScores(word)
  const transposed = candidates.filter(
    (candidate) =>
      candidate.distance <= 2 &&
      isSingleTransposition(word, candidate.value.toLowerCase()),
  )

  if (transposed.length > 0) {
    const result = {
      kind: 'TRANSPOSED_LETTERS',
      suggestions: formatSuggestions(transposed),
    } satisfies UnknownWordClassification
    setCachedValue(
      UNKNOWN_WORD_CLASSIFICATION_CACHE,
      word,
      result,
      MAX_UNKNOWN_WORD_CACHE_SIZE,
    )
    return result
  }

  const missingLetter = candidates.filter(
    (candidate) =>
      candidate.distance === 1 &&
      isSingleInsertion(word, candidate.value.toLowerCase()),
  )

  if (missingLetter.length > 0) {
    const result = {
      kind: 'MISSING_LETTERS',
      suggestions: formatSuggestions(missingLetter),
    } satisfies UnknownWordClassification
    setCachedValue(
      UNKNOWN_WORD_CLASSIFICATION_CACHE,
      word,
      result,
      MAX_UNKNOWN_WORD_CACHE_SIZE,
    )
    return result
  }

  const extraLetter = candidates.filter(
    (candidate) =>
      candidate.distance === 1 &&
      isSingleDeletion(word, candidate.value.toLowerCase()),
  )

  if (extraLetter.length > 0) {
    const result = {
      kind: 'EXTRA_LETTERS',
      suggestions: formatSuggestions(extraLetter),
    } satisfies UnknownWordClassification
    setCachedValue(
      UNKNOWN_WORD_CLASSIFICATION_CACHE,
      word,
      result,
      MAX_UNKNOWN_WORD_CACHE_SIZE,
    )
    return result
  }

  const typographical = candidates.filter(
    (candidate) =>
      candidate.distance === 1 &&
      isSingleSubstitution(word, candidate.value.toLowerCase()),
  )

  if (typographical.length > 0) {
    const result = {
      kind: 'TYPOGRAPHICAL_ERRORS',
      suggestions: formatSuggestions(typographical),
    } satisfies UnknownWordClassification
    setCachedValue(
      UNKNOWN_WORD_CLASSIFICATION_CACHE,
      word,
      result,
      MAX_UNKNOWN_WORD_CACHE_SIZE,
    )
    return result
  }

  const misspelled = candidates.filter(
    (candidate) => candidate.distance >= 2 && candidate.distance <= 3,
  )

  if (misspelled.length > 0) {
    const result = {
      kind: 'MISSPELLED_WORDS',
      suggestions: formatSuggestions(misspelled),
    } satisfies UnknownWordClassification
    setCachedValue(
      UNKNOWN_WORD_CLASSIFICATION_CACHE,
      word,
      result,
      MAX_UNKNOWN_WORD_CACHE_SIZE,
    )
    return result
  }

  const result = {
    kind: 'NON_DICTIONARY_WORDS',
    suggestions: [],
  } satisfies UnknownWordClassification
  setCachedValue(
    UNKNOWN_WORD_CLASSIFICATION_CACHE,
    word,
    result,
    MAX_UNKNOWN_WORD_CACHE_SIZE,
  )
  return result
}
