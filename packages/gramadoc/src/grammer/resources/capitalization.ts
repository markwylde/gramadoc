export const capitalizationProperNouns = {
  christmas: 'Christmas',
  english: 'English',
  europe: 'Europe',
  friday: 'Friday',
  january: 'January',
  london: 'London',
  monday: 'Monday',
  nasa: 'NASA',
  paris: 'Paris',
  thanksgiving: 'Thanksgiving',
  typescript: 'TypeScript',
} as const

export const capitalizationBrandNames = {
  github: 'GitHub',
  iphone: 'iPhone',
  javascript: 'JavaScript',
  openai: 'OpenAI',
  youtube: 'YouTube',
} as const

export const capitalizationAcronyms = [
  'API',
  'CPU',
  'EU',
  'HTML',
  'JSON',
  'NASA',
  'PDF',
  'SQL',
  'UK',
  'URL',
  'US',
] as const

export const capitalizationTitlePhrases = {
  'lord of the rings': 'Lord of the Rings',
  'the great gatsby': 'The Great Gatsby',
  'to kill a mockingbird': 'To Kill a Mockingbird',
  'united kingdom': 'United Kingdom',
} as const

export const contextSensitiveCapitalizationTerms = [
  { word: 'march', replacement: 'March' },
  { word: 'may', replacement: 'May' },
  { word: 'august', replacement: 'August' },
] as const
