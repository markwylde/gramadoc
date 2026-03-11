import type { PhraseReplacementPattern } from './phrase-patterns.js'

export const repeatedHedgePatterns: PhraseReplacementPattern[] = [
  {
    phrase: 'maybe perhaps',
    replacement: 'maybe',
    message: 'Use a single hedge phrase here.',
  },
  {
    phrase: 'perhaps maybe',
    replacement: 'perhaps',
    message: 'Use a single hedge phrase here.',
  },
  {
    phrase: 'kind of sort of',
    replacement: 'kind of',
    message: 'Use a single hedge phrase here.',
  },
  {
    phrase: 'sort of kind of',
    replacement: 'sort of',
    message: 'Use a single hedge phrase here.',
  },
]

export const fillerLeadInPatterns: PhraseReplacementPattern[] = [
  {
    phrase: 'it is important to note that',
    replacement: '',
    message: 'This lead-in phrase is usually unnecessary.',
  },
  {
    phrase: 'it should be noted that',
    replacement: '',
    message: 'This lead-in phrase is usually unnecessary.',
  },
]
