import type { PhraseReplacementPattern } from './phrase-patterns.js'

export const pluralPossessivePatterns: PhraseReplacementPattern[] = [
  {
    phrase: 'developers guide',
    replacement: "developers' guide",
    message: 'Use a plural possessive apostrophe in "developers\' guide".',
  },
  {
    phrase: 'players entrance',
    replacement: "players' entrance",
    message: 'Use a plural possessive apostrophe in "players\' entrance".',
  },
  {
    phrase: 'teachers lounge',
    replacement: "teachers' lounge",
    message: 'Use a plural possessive apostrophe in "teachers\' lounge".',
  },
  {
    phrase: 'writers room',
    replacement: "writers' room",
    message: 'Use a plural possessive apostrophe in "writers\' room".',
  },
]

export const namedPossessivePatterns: PhraseReplacementPattern[] = [
  {
    phrase: 'fathers day',
    replacement: "Father's Day",
    message: 'Use the holiday name "Father\'s Day".',
  },
  {
    phrase: 'mothers day',
    replacement: "Mother's Day",
    message: 'Use the holiday name "Mother\'s Day".',
  },
  {
    phrase: 'new years day',
    replacement: "New Year's Day",
    message: 'Use the holiday name "New Year\'s Day".',
  },
  {
    phrase: 'new years eve',
    replacement: "New Year's Eve",
    message: 'Use the holiday name "New Year\'s Eve".',
  },
  {
    phrase: 'saint patricks day',
    replacement: "Saint Patrick's Day",
    message: 'Use the holiday name "Saint Patrick\'s Day".',
  },
  {
    phrase: 'valentines day',
    replacement: "Valentine's Day",
    message: 'Use the holiday name "Valentine\'s Day".',
  },
]

export const possessivePronounCorrections = {
  "her's": 'hers',
  "our's": 'ours',
  "their's": 'theirs',
  "your's": 'yours',
} as const

export const whoseContractionFollowers = [
  'arriving',
  'coming',
  'going',
  'here',
  'hosting',
  'leading',
  'online',
  'ready',
  'responsible',
  'running',
  'speaking',
  'there',
  'working',
] as const
