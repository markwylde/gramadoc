export interface MultiwordExpressionEntry {
  phrase: string
  kind:
    | 'adverb-phrase'
    | 'multiword-expression'
    | 'noun-phrase'
    | 'prepositional-phrase'
  label: string
}

export const multiwordExpressionEntries: MultiwordExpressionEntry[] = [
  {
    phrase: 'as well as',
    kind: 'multiword-expression',
    label: 'as well as',
  },
  {
    phrase: 'at least',
    kind: 'adverb-phrase',
    label: 'at least',
  },
  {
    phrase: 'in order to',
    kind: 'multiword-expression',
    label: 'in order to',
  },
  {
    phrase: 'open source',
    kind: 'noun-phrase',
    label: 'open source',
  },
  {
    phrase: 'user interface',
    kind: 'noun-phrase',
    label: 'user interface',
  },
  {
    phrase: 'well known',
    kind: 'multiword-expression',
    label: 'well known',
  },
  {
    phrase: 'web app',
    kind: 'noun-phrase',
    label: 'web app',
  },
] as const
