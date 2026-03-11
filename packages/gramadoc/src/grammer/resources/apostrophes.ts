import type { PhraseReplacementPattern } from './phrase-patterns.js'

export const pluralPossessivePatterns: PhraseReplacementPattern[] = [
  {
    phrase: 'authors guild',
    replacement: "authors' guild",
    message: 'Use a plural possessive apostrophe in "authors\' guild".',
  },
  {
    phrase: 'artists studio',
    replacement: "artists' studio",
    message: 'Use a plural possessive apostrophe in "artists\' studio".',
  },
  {
    phrase: 'authors notes',
    replacement: "authors' notes",
    message: 'Use a plural possessive apostrophe in "authors\' notes".',
  },
  {
    phrase: 'customers lounge',
    replacement: "customers' lounge",
    message: 'Use a plural possessive apostrophe in "customers\' lounge".',
  },
  {
    phrase: 'developers guide',
    replacement: "developers' guide",
    message: 'Use a plural possessive apostrophe in "developers\' guide".',
  },
  {
    phrase: 'editors desk',
    replacement: "editors' desk",
    message: 'Use a plural possessive apostrophe in "editors\' desk".',
  },
  {
    phrase: 'employees entrance',
    replacement: "employees' entrance",
    message: 'Use a plural possessive apostrophe in "employees\' entrance".',
  },
  {
    phrase: 'members area',
    replacement: "members' area",
    message: 'Use a plural possessive apostrophe in "members\' area".',
  },
  {
    phrase: 'players entrance',
    replacement: "players' entrance",
    message: 'Use a plural possessive apostrophe in "players\' entrance".',
  },
  {
    phrase: 'readers forum',
    replacement: "readers' forum",
    message: 'Use a plural possessive apostrophe in "readers\' forum".',
  },
  {
    phrase: 'readers guide',
    replacement: "readers' guide",
    message: 'Use a plural possessive apostrophe in "readers\' guide".',
  },
  {
    phrase: 'researchers conference',
    replacement: "researchers' conference",
    message: 'Use a plural possessive apostrophe in "researchers\' conference".',
  },
  {
    phrase: 'students union',
    replacement: "students' union",
    message: 'Use a plural possessive apostrophe in "students\' union".',
  },
  {
    phrase: 'students guide',
    replacement: "students' guide",
    message: 'Use a plural possessive apostrophe in "students\' guide".',
  },
  {
    phrase: 'teachers lounge',
    replacement: "teachers' lounge",
    message: 'Use a plural possessive apostrophe in "teachers\' lounge".',
  },
  {
    phrase: 'teachers union',
    replacement: "teachers' union",
    message: 'Use a plural possessive apostrophe in "teachers\' union".',
  },
  {
    phrase: 'users guide',
    replacement: "users' guide",
    message: 'Use a plural possessive apostrophe in "users\' guide".',
  },
  {
    phrase: 'visitors center',
    replacement: "visitors' center",
    message: 'Use a plural possessive apostrophe in "visitors\' center".',
  },
  {
    phrase: 'writers room',
    replacement: "writers' room",
    message: 'Use a plural possessive apostrophe in "writers\' room".',
  },
  {
    phrase: 'writers guild',
    replacement: "writers' guild",
    message: 'Use a plural possessive apostrophe in "writers\' guild".',
  },
]

export const namedPossessivePatterns: PhraseReplacementPattern[] = [
  {
    phrase: 'all saints day',
    replacement: "All Saints' Day",
    message: 'Use the holiday name "All Saints\' Day".',
  },
  {
    phrase: 'april fools day',
    replacement: "April Fools' Day",
    message: 'Use the holiday name "April Fools\' Day".',
  },
  {
    phrase: 'childrens day',
    replacement: "Children's Day",
    message: 'Use the holiday name "Children\'s Day".',
  },
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
    phrase: 'saint andrews day',
    replacement: "Saint Andrew's Day",
    message: 'Use the holiday name "Saint Andrew\'s Day".',
  },
  {
    phrase: 'saint brigids day',
    replacement: "Saint Brigid's Day",
    message: 'Use the holiday name "Saint Brigid\'s Day".',
  },
  {
    phrase: 'saint davids day',
    replacement: "Saint David's Day",
    message: 'Use the holiday name "Saint David\'s Day".',
  },
  {
    phrase: 'saint georges day',
    replacement: "Saint George's Day",
    message: 'Use the holiday name "Saint George\'s Day".',
  },
  {
    phrase: 'presidents day',
    replacement: "Presidents' Day",
    message: 'Use the holiday name "Presidents\' Day".',
  },
  {
    phrase: 'valentines day',
    replacement: "Valentine's Day",
    message: 'Use the holiday name "Valentine\'s Day".',
  },
  {
    phrase: 'womens day',
    replacement: "Women's Day",
    message: 'Use the holiday name "Women\'s Day".',
  },
  {
    phrase: 'womens history month',
    replacement: "Women's History Month",
    message: 'Use the observance name "Women\'s History Month".',
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
