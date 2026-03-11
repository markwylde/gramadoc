import type {
  GrammerOptionalRulePack,
  GrammerOptionalRulePackOptions,
} from './types.js'

export interface EvaluationFixture {
  id?: string
  family: string
  confusionFamily?: string
  text: string
  expectedRuleIds: string[]
  forbiddenRuleIds?: string[]
  rootCause?:
    | 'disambiguation'
    | 'fallback-pos'
    | 'lexical-gap'
    | 'phrase-boundary'
    | 'rule-threshold'
  riskTier?: 'safe' | 'moderate' | 'risky'
  languageCode?: 'en' | 'en-US' | 'en-GB'
  classification?: 'correctness' | 'editorial'
  enabledRulePacks?: readonly GrammerOptionalRulePack[]
  optionalRulePacks?: GrammerOptionalRulePackOptions
  nativeLanguageProfile?: `l1/${string}`
}

export interface FalsePositiveFixture {
  id?: string
  family: string
  confusionFamily?: string
  text: string
  riskyRuleIds: string[]
  rootCause?:
    | 'disambiguation'
    | 'fallback-pos'
    | 'lexical-gap'
    | 'phrase-boundary'
    | 'rule-threshold'
  riskTier?: 'safe' | 'moderate' | 'risky'
  languageCode?: 'en' | 'en-US' | 'en-GB'
  classification?: 'correctness' | 'editorial'
  enabledRulePacks?: readonly GrammerOptionalRulePack[]
  optionalRulePacks?: GrammerOptionalRulePackOptions
  nativeLanguageProfile?: `l1/${string}`
}

export const highPriorityGapEvaluationFixtures: EvaluationFixture[] = [
  {
    family: 'paragraph whitespace',
    text: 'First sentence.Second sentence.',
    expectedRuleIds: ['MISSING_SPACE_AFTER_SENTENCE_BOUNDARY'],
    classification: 'correctness',
  },
  {
    family: 'plain-English replacement',
    text: 'We met in order to discuss the release.',
    expectedRuleIds: ['WORDY_PHRASE'],
    classification: 'editorial',
  },
  {
    family: 'plain-English suggestion',
    text: 'Please reply at your earliest convenience.',
    expectedRuleIds: ['WORDY_PHRASE_SUGGESTION'],
    classification: 'editorial',
  },
  {
    family: 'house style terms',
    text: 'Github Actions runs our Typescript checks on ipv6 traffic.',
    expectedRuleIds: ['HOUSE_STYLE_TERMS'],
    classification: 'editorial',
  },
  {
    family: 'variant consistency',
    text: 'The colour palette helped us organize the centre display.',
    expectedRuleIds: [
      'MIXED_LANGUAGE_VARIANTS',
      'DOCUMENT_VARIANT_CONSISTENCY',
    ],
    languageCode: 'en-US',
    classification: 'correctness',
  },
  {
    family: 'optional learner pack stays opt-in by default',
    text: 'We assisted to the meeting and demanded them to update the draft.',
    expectedRuleIds: [],
    forbiddenRuleIds: ['L2_FALSE_FRIENDS'],
    classification: 'correctness',
    nativeLanguageProfile: 'l1/fr',
  },
  {
    family: 'optional learner pack fires when enabled',
    text: 'We assisted to the meeting and demanded them to update the draft.',
    expectedRuleIds: ['L2_FALSE_FRIENDS'],
    classification: 'correctness',
    nativeLanguageProfile: 'l1/fr',
    optionalRulePacks: {
      profiles: {
        nativeLanguage: 'l1/fr',
        falseFriends: true,
      },
    },
  },
  {
    family: 'optional contextual pack stays opt-in by default',
    text: 'This release is better then the previous one.',
    expectedRuleIds: [],
    forbiddenRuleIds: ['THAN_THEN'],
    classification: 'correctness',
  },
  {
    family: 'optional contextual pack fires when enabled',
    text: 'This release is better then the previous one.',
    expectedRuleIds: ['THAN_THEN'],
    classification: 'correctness',
    optionalRulePacks: {
      experimental: {
        contextualConfusions: true,
      },
    },
  },
  {
    family: 'your/you-re possessive detection',
    confusionFamily: 'your/you-re',
    text: 'Your team is ready. Your laptop is overheating. Your build is failing. Your account settings are here.',
    expectedRuleIds: [],
    forbiddenRuleIds: ['YOUR_YOURE'],
    classification: 'correctness',
    rootCause: 'rule-threshold',
    riskTier: 'safe',
  },
  {
    family: 'its/it-s possessive detection',
    confusionFamily: 'its/it-s',
    text: 'Its API is stable, and its policy is documented.',
    expectedRuleIds: [],
    forbiddenRuleIds: ['ITS_ITS_CONTRACTION', 'POSSESSIVE_ITS'],
    classification: 'correctness',
    rootCause: 'rule-threshold',
    riskTier: 'safe',
  },
  {
    family: 'whose/who-s possessive detection',
    confusionFamily: 'whose/who-s',
    text: 'Whose idea was this, and whose team owns the follow-up?',
    expectedRuleIds: [],
    forbiddenRuleIds: ['WHOSE_POSSESSIVE', 'WHOS_CONTRACTION'],
    classification: 'correctness',
    rootCause: 'rule-threshold',
    riskTier: 'safe',
  },
  {
    family: 'their/there/they-re correction',
    confusionFamily: 'their/there/they-re',
    text: 'There team is ready, and their welcome is late.',
    expectedRuleIds: ['THEIR_THERE_THEYRE'],
    classification: 'correctness',
    rootCause: 'rule-threshold',
    riskTier: 'moderate',
  },
  {
    family:
      'noun stack readability still catches dense documentation compounds',
    text: 'Review the documentation management notes before launch.',
    expectedRuleIds: ['NOMINALIZATION_PILEUP'],
    classification: 'editorial',
    rootCause: 'rule-threshold',
    riskTier: 'risky',
  },
]

export const highPriorityGapFalsePositiveFixtures: FalsePositiveFixture[] = [
  {
    family: 'quoted examples stay quiet',
    text: 'The guide quotes "at your earliest convenience" as an example.',
    riskyRuleIds: ['WORDY_PHRASE_SUGGESTION'],
    classification: 'editorial',
  },
  {
    family: 'preferred house style terms stay quiet',
    text: 'GitHub Actions runs our TypeScript checks on IPv6 traffic.',
    riskyRuleIds: ['HOUSE_STYLE_TERMS'],
    classification: 'editorial',
  },
  {
    family: 'single-variant prose stays quiet',
    text: 'The color palette helped us organize the center display.',
    riskyRuleIds: ['MIXED_LANGUAGE_VARIANTS', 'DOCUMENT_VARIANT_CONSISTENCY'],
    languageCode: 'en-US',
    classification: 'correctness',
  },
  {
    family: 'experimental contextual pack stays quiet on docs prose',
    text: 'See the API docs for setup details. The Sea API syncs records between services.',
    riskyRuleIds: ['THAN_THEN', 'SEE_SEA'],
    classification: 'correctness',
    optionalRulePacks: {
      experimental: {
        contextualConfusions: true,
      },
    },
  },
  {
    family: 'adverb ambiguity stays quiet in predicate contexts',
    text: 'The service works well, performs well, reads well, and scales well under load.',
    riskyRuleIds: ['NOMINALIZATION_PILEUP', 'TECHNICAL_NOUN_CLUSTER'],
    classification: 'editorial',
    rootCause: 'disambiguation',
    riskTier: 'risky',
  },
  {
    family: 'predicate verbs break noun-stack scans in technical prose',
    text: 'The web app performs well and involves complex state recovery.',
    riskyRuleIds: ['NOMINALIZATION_PILEUP', 'TECHNICAL_NOUN_CLUSTER'],
    classification: 'editorial',
    rootCause: 'phrase-boundary',
    riskTier: 'risky',
  },
  {
    family: 'your/you-re predicate quiet',
    confusionFamily: 'your/you-re',
    text: "But you're stuck with macOS. You're done when the build is green. You're offline right now. Hope you're well. You're under pressure.",
    riskyRuleIds: ['YOUR_YOURE'],
    classification: 'correctness',
    rootCause: 'fallback-pos',
    riskTier: 'risky',
  },
  {
    family: 'its/it-s predicate quiet',
    confusionFamily: 'its/it-s',
    text: "It's been a long time. It's safe to continue, and it's broken again.",
    riskyRuleIds: ['ITS_ITS_CONTRACTION', 'POSSESSIVE_ITS'],
    classification: 'correctness',
    rootCause: 'disambiguation',
    riskTier: 'risky',
  },
  {
    family: 'whose/who-s contraction quiet',
    confusionFamily: 'whose/who-s',
    text: "Who's ready to ship, and who's responsible for the launch notes?",
    riskyRuleIds: ['WHOSE_POSSESSIVE', 'WHOS_CONTRACTION'],
    classification: 'correctness',
    rootCause: 'disambiguation',
    riskTier: 'moderate',
  },
  {
    family: 'their/there/they-re docs quiet',
    confusionFamily: 'their/there/they-re',
    text: "They're ready to ship, there are two options, and their API docs are live.",
    riskyRuleIds: ['THEIR_THERE_THEYRE'],
    classification: 'correctness',
    rootCause: 'fallback-pos',
    riskTier: 'risky',
  },
]

export const evaluationRecallFixtures = highPriorityGapEvaluationFixtures.map(
  (fixture, index) => ({
    ...fixture,
    id: fixture.id ?? `recall-${index + 1}`,
    classification: fixture.classification ?? 'correctness',
  }),
)

export const evaluationPrecisionFixtures =
  highPriorityGapFalsePositiveFixtures.map((fixture, index) => ({
    ...fixture,
    id: fixture.id ?? `precision-${index + 1}`,
    classification: fixture.classification ?? 'correctness',
    forbiddenRuleIds: fixture.riskyRuleIds,
  }))
