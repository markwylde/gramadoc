import type { SingleWordReplacementPattern } from './phrase-patterns.js'

export interface InformalityTonePattern extends SingleWordReplacementPattern {
  requireLowercaseSurface?: boolean
}

export interface ProfanityTonePattern extends InformalityTonePattern {
  allowInPolicyContext?: boolean
}

export const chatShorthandPatterns: InformalityTonePattern[] = [
  {
    word: 'pls',
    replacement: 'please',
    message: 'Replace this chat shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'thx',
    replacement: 'thanks',
    message: 'Replace this chat shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'btw',
    replacement: 'by the way',
    message: 'Replace this chat shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'idk',
    replacement: 'I do not know',
    message: 'Replace this chat shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'imo',
    replacement: 'in my opinion',
    message: 'Replace this chat shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'dat',
    replacement: 'that',
    message: 'Replace this nonstandard shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'dis',
    replacement: 'this',
    message: 'Replace this nonstandard shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'luv',
    replacement: 'love',
    message: 'Replace this nonstandard shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
  {
    word: 'ppl',
    replacement: 'people',
    message: 'Replace this chat shorthand with standard prose.',
    requireLowercaseSurface: true,
  },
]

export const informalContractionPatterns: InformalityTonePattern[] = [
  {
    word: 'gonna',
    replacement: 'going to',
    message: 'Use a less informal phrasing here.',
  },
  {
    word: 'wanna',
    replacement: 'want to',
    message: 'Use a less informal phrasing here.',
  },
  {
    word: 'kinda',
    replacement: 'kind of',
    message: 'Use a less informal phrasing here.',
  },
  {
    word: 'sorta',
    replacement: 'sort of',
    message: 'Use a less informal phrasing here.',
  },
  {
    word: 'outta',
    replacement: 'out of',
    message: 'Use a less informal phrasing here.',
  },
  {
    word: 'lemme',
    replacement: 'let me',
    message: 'Use a less informal phrasing here.',
  },
  {
    word: 'gimme',
    replacement: 'give me',
    message: 'Use a less informal phrasing here.',
  },
]

export const mildProfanityPatterns: ProfanityTonePattern[] = [
  {
    word: 'crap',
    replacement: 'issue',
    message: 'Prefer a more neutral word here.',
  },
  {
    word: 'damn',
    replacement: 'very',
    message: 'Prefer a more neutral intensifier here.',
  },
  {
    word: 'hell',
    replacement: 'very',
    message: 'Prefer a more neutral intensifier here.',
  },
  {
    word: 'shit',
    replacement: 'problem',
    message: 'Replace this profanity with a more neutral word.',
  },
]

export const offensiveLanguagePatterns: ProfanityTonePattern[] = [
  {
    word: 'crazy',
    replacement: 'unexpected',
    message: 'Avoid potentially ableist wording here.',
    allowInPolicyContext: true,
  },
  {
    word: 'ghetto',
    replacement: 'makeshift',
    message: 'Avoid this potentially offensive term here.',
  },
  {
    word: 'gypped',
    replacement: 'cheated',
    message: 'Avoid this offensive term here.',
  },
  {
    word: 'retarded',
    replacement: 'broken',
    message: 'Avoid this offensive term here.',
  },
]
