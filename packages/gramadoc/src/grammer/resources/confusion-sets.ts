import type {
  ClausePart,
  GrammerLanguageCode,
  GrammerRuleExamples,
  TokenPosHint,
} from '../types.js'

export interface FixedPhraseConfusion {
  id: string
  name: string
  description: string
  message: string
  replacements: string[]
  pattern: {
    literals: Array<string | string[]>
    focusIndex: number
  }
}

export interface ContextualConfusionCue {
  score: number
  relativeTokenIndex: -2 | -1 | 1 | 2
  values?: string[]
  lemmas?: string[]
  posHints?: TokenPosHint[]
  clauseParts?: ClausePart[]
  languages?: GrammerLanguageCode[]
}

export interface ContextualConfusionNgram {
  score: number
  kind?: 'collocation-frequency' | 'ngram'
  previousRelativeTokenIndex?: -2 | -1
  nextRelativeTokenIndex?: 1 | 2
  previousValues?: string[]
  nextValues?: string[]
  previousPosHints?: TokenPosHint[]
  nextPosHints?: TokenPosHint[]
}

export interface ContextualConfusionSurfaceCue {
  score: number
  relativeTokenIndex: -2 | -1 | 1 | 2
  values?: string[]
  capitalized?: boolean
  allCaps?: boolean
}

export interface ContextualConfusionSurfacePlausibility {
  cases: Array<'all-caps' | 'title-case'>
  minimumScore?: number
  cues: ContextualConfusionSurfaceCue[]
}

export interface ContextualConfusionAntiPattern {
  literals: Array<string | string[]>
  focusIndex: number
}

export interface ContextualConfusionCandidate {
  value: string
  baseScore?: number
  languageBias?: Partial<Record<GrammerLanguageCode, number>>
  cues?: ContextualConfusionCue[]
  statisticalContexts?: ContextualConfusionNgram[]
}

export type ContextualConfusionImplementationMode =
  | 'deterministic-local-context'
  | 'heuristic-collocation'
  | 'scored-collocation'
  | 'hybrid'

export interface ContextualConfusionSet {
  id: string
  name: string
  description: string
  message: string
  forms: string[]
  examples: GrammerRuleExamples
  confusionFamily?: string
  family?: 'semantics-clarity/contextual-errors'
  implementationModes?: readonly ContextualConfusionImplementationMode[]
  minimumAdvantage?: number
  minimumScore?: number
  minimumEvidenceCount?: number
  enabledInLanguages?: GrammerLanguageCode[]
  requiresVariantPreference?: boolean
  ignoreFallbackOnlyPosHints?: boolean
  antiPatterns?: ContextualConfusionAntiPattern[]
  surfacePlausibility?: ContextualConfusionSurfacePlausibility[]
  candidates: ContextualConfusionCandidate[]
}

export const fixedPhraseConfusions: FixedPhraseConfusion[] = [
  {
    id: 'HAVE_AN_AFFECT_ON',
    name: 'Have An Affect On',
    description:
      'Flags the fixed phrase "have an affect on", where "effect" is usually intended.',
    message: 'Use "effect" in the phrase "have an effect on".',
    replacements: ['effect'],
    pattern: {
      literals: [['have', 'has', 'had'], 'an', 'affect', 'on'],
      focusIndex: 2,
    },
  },
  {
    id: 'TAKE_AFFECT',
    name: 'Take Affect',
    description:
      'Flags the fixed phrase "take affect", where "take effect" is usually intended.',
    message: 'Use "effect" in the phrase "take effect".',
    replacements: ['effect'],
    pattern: {
      literals: [['take', 'takes', 'took'], 'affect'],
      focusIndex: 1,
    },
  },
]

export const contextualConfusionSets: ContextualConfusionSet[] = [
  {
    id: 'THAN_THEN',
    name: 'Than vs Then',
    description:
      'Ranks "than" and "then" using comparative and sequencing cues from nearby words.',
    message:
      'Use the comparative or sequence word that fits the local context.',
    forms: ['than', 'then'],
    implementationModes: ['heuristic-collocation'],
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        { text: 'This release is better than the previous one.' },
        { text: 'Save the file, then run the tests.' },
      ],
      bad: [
        { text: 'This release is better then the previous one.' },
        { text: 'Save the file, than run the tests.' },
      ],
    },
    candidates: [
      {
        value: 'than',
        statisticalContexts: [
          {
            score: 2,
            kind: 'collocation-frequency',
            previousValues: ['more', 'less', 'rather'],
            nextValues: ['the'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['better', 'different', 'less', 'more', 'other', 'rather'],
            score: 3,
          },
          {
            relativeTokenIndex: -2,
            values: ['better', 'different', 'less', 'more', 'other', 'rather'],
            score: 1,
          },
        ],
      },
      {
        value: 'then',
        statisticalContexts: [
          {
            score: 2,
            kind: 'collocation-frequency',
            previousValues: ['and', 'but'],
            nextPosHints: ['verb'],
          },
          {
            score: 2,
            kind: 'collocation-frequency',
            previousValues: ['if'],
            nextValues: ['we', 'you', 'they'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['back', 'by', 'if', 'until'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['he', 'it', 'she', 'they', 'we', 'you'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['verb'],
            score: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'AFFECT_EFFECT',
    name: 'Affect vs Effect',
    description:
      'Ranks "affect" and "effect" using nearby article, modal, and fixed-phrase cues.',
    message: 'Choose the noun or verb form that fits the local context.',
    forms: ['affect', 'effect'],
    minimumAdvantage: 2,
    minimumScore: 2,
    surfacePlausibility: [
      {
        cases: ['all-caps', 'title-case'],
        minimumScore: 2,
        cues: [
          {
            relativeTokenIndex: 1,
            values: ['api', 'sdk', 'cloud', 'sync'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            capitalized: true,
            score: 1,
          },
          {
            relativeTokenIndex: -1,
            capitalized: true,
            score: 1,
          },
        ],
      },
    ],
    examples: {
      good: [
        { text: 'This can affect the launch date.' },
        { text: 'The change will take effect tomorrow.' },
      ],
      bad: [
        { text: 'This can effect the launch date.' },
        { text: 'The change had an affect on the launch.' },
      ],
    },
    candidates: [
      {
        value: 'effect',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['an', 'the', 'had', 'have', 'has'],
            score: 3,
          },
          {
            relativeTokenIndex: -1,
            lemmas: ['take'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            values: ['on'],
            score: 3,
          },
        ],
      },
      {
        value: 'affect',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['can', 'could', 'may', 'might', 'to', 'will', 'would'],
            score: 3,
          },
          {
            relativeTokenIndex: -2,
            values: ['can', 'could', 'may', 'might', 'to', 'will', 'would'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'noun'],
            score: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'PRACTICE_PRACTISE',
    name: 'Practice vs Practise',
    description:
      'Ranks the US/UK noun and verb variants using the selected language mode and local grammar cues.',
    message:
      'Choose the spelling that matches the document variant and local grammar.',
    forms: ['practice', 'practise'],
    requiresVariantPreference: true,
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        {
          text: 'We practice functional TypeScript every day.',
          note: 'Correct in en-US.',
        },
        {
          text: 'We practise functional TypeScript every day.',
          note: 'Correct in en-GB.',
        },
      ],
      bad: [
        {
          text: 'We practise functional TypeScript every day.',
          note: 'Incorrect in en-US.',
        },
        {
          text: 'We practice functional TypeScript every day.',
          note: 'Incorrect in en-GB.',
        },
      ],
    },
    candidates: [
      {
        value: 'practice',
        languageBias: {
          'en-US': 2,
        },
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['daily', 'medical', 'private', 'standard'],
            score: 2,
          },
          {
            relativeTokenIndex: -1,
            values: ['a', 'in', 'of', 'the'],
            score: 2,
          },
        ],
      },
      {
        value: 'practise',
        languageBias: {
          'en-GB': 2,
        },
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'can',
              'could',
              'may',
              'might',
              'must',
              'should',
              'to',
              'will',
              'would',
            ],
            score: 3,
          },
          {
            relativeTokenIndex: -2,
            values: [
              'can',
              'could',
              'may',
              'might',
              'must',
              'should',
              'to',
              'will',
              'would',
            ],
            score: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'LICENCE_LICENSE',
    name: 'Licence vs License',
    description:
      'Ranks the noun and verb spellings using the selected language mode plus nearby grammar cues.',
    message:
      'Choose the spelling that matches the document variant and noun or verb role.',
    forms: ['licence', 'license'],
    requiresVariantPreference: true,
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        {
          text: 'Your licence expired last week.',
          note: 'Correct in en-GB.',
        },
        {
          text: 'We license the package before release.',
          note: 'Correct in en-US and en-GB.',
        },
      ],
      bad: [
        {
          text: 'Your license expired last week.',
          note: 'Incorrect in en-GB noun context.',
        },
        {
          text: 'We licence the package before release.',
          note: 'Incorrect in en-US and in en-GB verb context.',
        },
      ],
    },
    candidates: [
      {
        value: 'licence',
        languageBias: {
          'en-GB': 2,
        },
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['a', 'an', 'my', 'our', 'their', 'the', 'your'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['expired', 'is', 'was'],
            score: 2,
          },
        ],
      },
      {
        value: 'license',
        languageBias: {
          en: 1,
          'en-US': 2,
        },
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'can',
              'could',
              'may',
              'might',
              'must',
              'should',
              'to',
              'will',
              'would',
            ],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'noun'],
            score: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'ADVICE_ADVISE',
    name: 'Advice vs Advise',
    description:
      'Ranks the noun and verb forms using nearby determiner, modal, and object cues.',
    message: 'Choose the noun or verb form that fits the sentence.',
    forms: ['advice', 'advise'],
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        { text: 'Thanks for the advice.' },
        { text: 'We advise checking the API docs first.' },
      ],
      bad: [
        { text: 'Thanks for the advise.' },
        { text: 'We advice checking the API docs first.' },
      ],
    },
    candidates: [
      {
        value: 'advice',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['any', 'good', 'helpful', 'my', 'some', 'the', 'your'],
            score: 3,
          },
          {
            relativeTokenIndex: -1,
            posHints: ['determiner', 'preposition'],
            score: 2,
          },
        ],
      },
      {
        value: 'advise',
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'can',
              'could',
              'may',
              'might',
              'must',
              'should',
              'to',
              'will',
              'would',
            ],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'noun', 'pronoun', 'verb'],
            score: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'WEATHER_WHETHER',
    name: 'Weather vs Whether',
    description:
      'Ranks the noun and conjunction using nearby question and meteorological cues.',
    message: 'Choose the noun or conjunction that fits the sentence.',
    forms: ['weather', 'whether'],
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        { text: 'Check whether the tests passed.' },
        { text: 'The weather stayed clear all day.' },
      ],
      bad: [
        { text: 'Check weather the tests passed.' },
        { text: 'The whether stayed clear all day.' },
      ],
    },
    candidates: [
      {
        value: 'weather',
        statisticalContexts: [
          {
            score: 2,
            kind: 'collocation-frequency',
            previousValues: ['the'],
            nextValues: ['forecast', 'report'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['bad', 'cold', 'hot', 'stormy', 'the'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['forecast', 'improved', 'stayed', 'was'],
            score: 2,
          },
        ],
      },
      {
        value: 'whether',
        statisticalContexts: [
          {
            score: 3,
            kind: 'collocation-frequency',
            previousValues: ['know', 'see', 'wonder'],
            nextValues: ['or'],
          },
          {
            score: 2,
            kind: 'collocation-frequency',
            previousValues: ['check', 'confirm', 'determine'],
            nextValues: ['the'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'ask',
              'check',
              'confirm',
              'decide',
              'determine',
              'know',
              'see',
              'wonder',
            ],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['he', 'if', 'it', 'or', 'she', 'the', 'they', 'we', 'you'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'modal', 'pronoun', 'verb'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            clauseParts: ['predicate'],
            score: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'SEE_SEA',
    name: 'See vs Sea',
    description:
      'Ranks the verb and noun forms using nearby modal, article, and noun cues.',
    message: 'Choose the verb or noun that fits the sentence.',
    forms: ['sea', 'see'],
    minimumAdvantage: 2,
    minimumScore: 2,
    surfacePlausibility: [
      {
        cases: ['all-caps', 'title-case'],
        minimumScore: 2,
        cues: [
          {
            relativeTokenIndex: 1,
            values: ['api', 'cloud', 'docs', 'sdk'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            capitalized: true,
            score: 1,
          },
          {
            relativeTokenIndex: -1,
            capitalized: true,
            score: 1,
          },
        ],
      },
    ],
    examples: {
      good: [
        { text: 'You can see the difference immediately.' },
        { text: 'The sea was calm all morning.' },
      ],
      bad: [
        { text: 'You can sea the difference immediately.' },
        { text: 'The see was calm all morning.' },
      ],
    },
    candidates: [
      {
        value: 'see',
        statisticalContexts: [
          {
            score: 2,
            previousValues: ['can', 'could', 'to'],
            nextValues: ['the'],
          },
          {
            score: 2,
            previousValues: ['can', 'could', 'will'],
            nextValues: ['why', 'what', 'whether'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'can',
              'could',
              'did',
              'do',
              'does',
              'let',
              'lets',
              'may',
              'might',
              'must',
              'should',
              'to',
              'will',
              'would',
            ],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'noun', 'pronoun'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            values: ['if', 'that', 'what', 'whether', 'why'],
            score: 2,
          },
        ],
      },
      {
        value: 'sea',
        statisticalContexts: [
          {
            score: 2,
            previousValues: ['the'],
            nextValues: ['air', 'breeze', 'coast', 'level', 'water'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['across', 'by', 'near', 'over', 'the'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: [
              'air',
              'breeze',
              'coast',
              'harbor',
              'level',
              'stayed',
              'was',
              'water',
            ],
            score: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'LOSE_LOOSE',
    name: 'Lose vs Loose',
    description:
      'Ranks the verb and adjective forms using nearby infinitive, modal, and copular cues.',
    message: 'Choose the verb or adjective that fits the sentence.',
    forms: ['lose', 'loose'],
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        { text: 'We do not want to lose data.' },
        { text: 'The connector is loose again.' },
      ],
      bad: [
        { text: 'We do not want to loose data.' },
        { text: 'The connector is lose again.' },
      ],
    },
    candidates: [
      {
        value: 'lose',
        statisticalContexts: [
          {
            score: 2,
            previousValues: ['to'],
            nextValues: ['data', 'time'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'can',
              'could',
              'did',
              'do',
              'does',
              'dont',
              "don't",
              'may',
              'might',
              'must',
              'never',
              'not',
              'should',
              'to',
              'will',
              'would',
            ],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'noun', 'pronoun'],
            score: 2,
          },
        ],
      },
      {
        value: 'loose',
        statisticalContexts: [
          {
            score: 2,
            previousValues: ['is', 'was', 'were'],
            nextValues: ['again'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'am',
              'are',
              'be',
              'been',
              'being',
              'feel',
              'feels',
              'felt',
              'is',
              'look',
              'looked',
              'looks',
              'seem',
              'seemed',
              'seems',
              'too',
              'was',
              'were',
            ],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['again', 'enough'],
            score: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'QUIET_QUITE',
    name: 'Quiet vs Quite',
    description:
      'Ranks the adjective and adverb forms using nearby article, adjective, and intensifier cues.',
    message: 'Choose the adjective or adverb that fits the sentence.',
    forms: ['quiet', 'quite'],
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        { text: 'We need a quiet room for the interview.' },
        { text: 'The release is quite stable now.' },
      ],
      bad: [
        { text: 'We need a quite room for the interview.' },
        { text: 'The release is quiet stable now.' },
      ],
    },
    candidates: [
      {
        value: 'quiet',
        statisticalContexts: [
          {
            score: 2,
            previousValues: ['a', 'the'],
            nextValues: ['room', 'space'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['a', 'an', 'the'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['noun'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['room', 'space'],
            score: 2,
          },
        ],
      },
      {
        value: 'quite',
        statisticalContexts: [
          {
            score: 2,
            previousValues: ['is', 'looks', 'seems', 'was'],
            nextValues: ['likely', 'stable'],
          },
          {
            score: 2,
            nextValues: ['helpful'],
            nextPosHints: ['adjective'],
          },
        ],
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['adjective', 'adverb'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['a', 'an', 'helpful', 'likely', 'stable'],
            score: 2,
          },
          {
            relativeTokenIndex: -1,
            values: ['is', 'looks', 'seems', 'was'],
            score: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'BREATH_BREATHE',
    name: 'Breath vs Breathe',
    description:
      'Ranks the noun and verb forms using nearby determiners, modals, and adverbial cues.',
    message: 'Choose the noun or verb form that fits the sentence.',
    forms: ['breath', 'breathe'],
    family: 'semantics-clarity/contextual-errors',
    implementationModes: ['deterministic-local-context'],
    minimumAdvantage: 2,
    minimumScore: 3,
    minimumEvidenceCount: 2,
    examples: {
      good: [
        { text: 'Take a deep breath before the demo.' },
        { text: 'Try to breathe more slowly.' },
      ],
      bad: [
        { text: 'Take a deep breathe before the demo.' },
        { text: 'Try to breath more slowly.' },
      ],
    },
    candidates: [
      {
        value: 'breath',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['a', 'deep', 'one', 'single', 'that', 'the', 'your'],
            score: 2,
          },
          {
            relativeTokenIndex: -2,
            values: ['catch', 'take'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            values: ['before', 'of'],
            score: 1,
          },
        ],
      },
      {
        value: 'breathe',
        cues: [
          {
            relativeTokenIndex: -1,
            values: [
              'can',
              'could',
              'help',
              'lets',
              'must',
              'should',
              'to',
              'will',
            ],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            values: ['again', 'better', 'easily', 'more', 'slowly'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['adverb'],
            score: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'ACCEPT_EXCEPT',
    name: 'Accept vs Except',
    description:
      'Ranks the verb and exclusion forms using nearby modal, object, and determiner cues.',
    message: 'Choose the verb or exclusion word that fits the sentence.',
    forms: ['accept', 'except'],
    family: 'semantics-clarity/contextual-errors',
    implementationModes: ['deterministic-local-context'],
    minimumAdvantage: 2,
    minimumScore: 3,
    minimumEvidenceCount: 2,
    examples: {
      good: [
        { text: 'Please accept the updated draft.' },
        { text: 'Everyone except the reviewer approved it.' },
      ],
      bad: [
        { text: 'Please except the updated draft.' },
        { text: 'Everyone accept the reviewer approved it.' },
      ],
    },
    candidates: [
      {
        value: 'accept',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['can', 'could', 'please', 'should', 'to', 'will'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            values: ['it', 'responsibility', 'the', 'this'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'noun', 'pronoun'],
            score: 1,
          },
        ],
      },
      {
        value: 'except',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['anyone', 'everyone', 'everything', 'nobody', 'nothing'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            values: ['for', 'the', 'when'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['determiner', 'noun', 'pronoun'],
            score: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'PRINCIPAL_PRINCIPLE',
    name: 'Principal vs Principle',
    description:
      'Ranks the person-or-adjective form and the abstract noun form using nearby noun and article cues.',
    message:
      'Choose the person/adjective form or the abstract noun that fits the sentence.',
    forms: ['principal', 'principle'],
    family: 'semantics-clarity/contextual-errors',
    implementationModes: ['deterministic-local-context'],
    minimumAdvantage: 2,
    minimumScore: 3,
    minimumEvidenceCount: 2,
    examples: {
      good: [
        { text: 'That principle guided the API design.' },
        { text: 'The principal engineer reviewed the patch.' },
      ],
      bad: [
        { text: 'That principal guided the API design.' },
        { text: 'The principle engineer reviewed the patch.' },
      ],
    },
    candidates: [
      {
        value: 'principal',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['a', 'an', 'our', 'the'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            values: ['engineer', 'goal', 'owner', 'reason'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['noun'],
            score: 1,
          },
        ],
      },
      {
        value: 'principle',
        cues: [
          {
            relativeTokenIndex: -1,
            values: ['a', 'an', 'core', 'guiding', 'that', 'the', 'this'],
            score: 2,
          },
          {
            relativeTokenIndex: 1,
            values: ['guides', 'matters', 'of', 'that'],
            score: 1,
          },
          {
            relativeTokenIndex: -2,
            values: ['by'],
            score: 1,
          },
        ],
      },
    ],
  },
]

export const homophoneConfusionSets: ContextualConfusionSet[] = [
  {
    id: 'YOUR_YOURE',
    name: 'Your vs You’re',
    description:
      'Ranks possessive and contraction forms using nearby grammar cues.',
    message: 'Choose the possessive or contraction that fits the sentence.',
    confusionFamily: 'your/you-re',
    forms: ['your', "you're"],
    minimumAdvantage: 2,
    minimumScore: 2,
    minimumEvidenceCount: 2,
    ignoreFallbackOnlyPosHints: true,
    antiPatterns: [
      {
        literals: [["you're"], ['welcome', 'right', 'free', 'safe', 'ready']],
        focusIndex: 0,
      },
      {
        literals: [["you're"], ['under'], ['pressure']],
        focusIndex: 0,
      },
      {
        literals: [["you're"], ['on'], ['time']],
        focusIndex: 0,
      },
      {
        literals: [
          ['your'],
          ['api', 'build', 'config', 'laptop', 'settings', 'team'],
        ],
        focusIndex: 0,
      },
    ],
    examples: {
      good: [
        { text: "You're welcome to join us." },
        { text: 'Your team is ready.' },
      ],
      bad: [
        { text: 'Your welcome to join us.' },
        { text: "You're team is ready." },
      ],
    },
    candidates: [
      {
        value: 'your',
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['noun'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            values: [
              'account',
              'api',
              'build',
              'config',
              'docs',
              'laptop',
              'settings',
              'team',
            ],
            score: 3,
          },
        ],
      },
      {
        value: "you're",
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['adjective'],
            score: 4,
          },
          {
            relativeTokenIndex: 1,
            values: [
              'alive',
              'aware',
              'broken',
              'busy',
              'configured',
              'done',
              'failing',
              'fine',
              'free',
              'here',
              'offline',
              'okay',
              'online',
              'ready',
              'right',
              'safe',
              'sorry',
              'stuck',
              'under',
              'well',
              'welcome',
              'wrong',
            ],
            score: 4,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['verb'],
            score: 3,
          },
        ],
      },
    ],
  },
  {
    id: 'ITS_ITS_CONTRACTION',
    name: 'Its vs It’s',
    description:
      'Ranks possessive and contraction forms using nearby grammar cues.',
    message: 'Choose the possessive or contraction that fits the sentence.',
    confusionFamily: 'its/it-s',
    forms: ['its', "it's"],
    minimumAdvantage: 2,
    minimumScore: 2,
    minimumEvidenceCount: 2,
    ignoreFallbackOnlyPosHints: true,
    antiPatterns: [
      {
        literals: [["it's"], ['been', 'fine', 'late', 'ready', 'safe', 'time']],
        focusIndex: 0,
      },
      {
        literals: [['its'], ['api', 'build', 'config', 'policy']],
        focusIndex: 0,
      },
    ],
    examples: {
      good: [
        { text: "It's been a long time." },
        { text: 'Its API is stable.' },
      ],
      bad: [{ text: 'Its been a long time.' }, { text: "It's API is stable." }],
    },
    candidates: [
      {
        value: 'its',
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['noun'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            values: ['api', 'build', 'config', 'own', 'policy'],
            score: 3,
          },
        ],
      },
      {
        value: "it's",
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['adjective'],
            score: 4,
          },
          {
            relativeTokenIndex: 1,
            values: [
              'a',
              'an',
              'been',
              'broken',
              'done',
              'fine',
              'going',
              'late',
              'offline',
              'ready',
              'safe',
              'time',
            ],
            score: 4,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['verb'],
            score: 3,
          },
        ],
      },
    ],
  },
  {
    id: 'THEIR_THERE_THEYRE',
    name: 'Their vs There vs They’re',
    description:
      'Ranks possession, location, and contraction forms using nearby grammar cues.',
    message:
      'Choose the form that matches possession, location, or contraction.',
    confusionFamily: 'their/there/they-re',
    forms: ['their', 'there', "they're"],
    minimumAdvantage: 2,
    minimumScore: 2,
    minimumEvidenceCount: 2,
    ignoreFallbackOnlyPosHints: true,
    antiPatterns: [
      {
        literals: [["they're"], ['ready', 'welcome', 'wrong']],
        focusIndex: 0,
      },
      {
        literals: [['their'], ['api', 'build', 'config', 'team']],
        focusIndex: 0,
      },
      {
        literals: [['there'], ['are', 'is', 'was', 'were']],
        focusIndex: 0,
      },
    ],
    examples: {
      good: [
        { text: 'Their team is ready.' },
        { text: "They're ready to ship." },
        { text: 'There are two options.' },
      ],
      bad: [
        { text: 'There team is ready.' },
        { text: 'Their are two options.' },
        { text: 'Their ready to ship.' },
      ],
    },
    candidates: [
      {
        value: 'their',
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['noun'],
            score: 1,
          },
          {
            relativeTokenIndex: 1,
            values: ['api', 'build', 'config', 'house', 'plan', 'team'],
            score: 3,
          },
          {
            relativeTokenIndex: 2,
            values: ['are', 'is', 'owns', 'was', 'were'],
            score: 2,
          },
        ],
      },
      {
        value: 'there',
        cues: [
          {
            relativeTokenIndex: 1,
            values: ['are', 'is', 'was', 'were'],
            score: 3,
          },
          {
            relativeTokenIndex: 1,
            values: ['here'],
            score: 2,
          },
        ],
      },
      {
        value: "they're",
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['adjective'],
            score: 4,
          },
          {
            relativeTokenIndex: 1,
            values: [
              'aware',
              'broken',
              'busy',
              'configured',
              'done',
              'free',
              'here',
              'offline',
              'online',
              'ready',
              'safe',
              'welcome',
              'wrong',
            ],
            score: 4,
          },
          {
            relativeTokenIndex: 1,
            posHints: ['verb'],
            score: 3,
          },
        ],
      },
    ],
  },
  {
    id: 'TO_TOO_TWO',
    name: 'To vs Too vs Two',
    description:
      'Ranks infinitive, degree, and number forms using nearby grammar cues.',
    message:
      'Choose the infinitive, degree, or number form that fits the sentence.',
    forms: ['to', 'too', 'two'],
    minimumAdvantage: 2,
    minimumScore: 2,
    examples: {
      good: [
        { text: 'We have too many notes.' },
        { text: 'We need to ship today.' },
        { text: 'We have two options.' },
      ],
      bad: [
        { text: 'We have to many notes.' },
        { text: 'We need too ship today.' },
        { text: 'We have to options.' },
      ],
    },
    candidates: [
      {
        value: 'to',
        cues: [
          {
            relativeTokenIndex: 1,
            posHints: ['verb'],
            score: 4,
          },
        ],
      },
      {
        value: 'too',
        cues: [
          {
            relativeTokenIndex: 1,
            values: ['late', 'little', 'many', 'much'],
            score: 4,
          },
        ],
      },
      {
        value: 'two',
        cues: [
          {
            relativeTokenIndex: 1,
            values: ['choices', 'notes', 'options', 'tests'],
            score: 4,
          },
        ],
      },
    ],
  },
]
