import { describe, expect, it } from 'vitest'
import { analyzeText, buildRuleCheckContext } from './utils'

const benchmarkCorpus = [
  {
    family: 'word confusion',
    text: 'The delay had an affect on the launch.',
    expectedRuleIds: ['HAVE_AN_AFFECT_ON'],
  },
  {
    family: 'simple replace',
    text: 'Your should check weather the config changed, and there fore we should update it.',
    expectedRuleIds: ['PHRASE_WORD_CHOICE', 'WEATHER_WHETHER'],
  },
  {
    family: 'articles',
    text: 'She packed an banana for the trip.',
    expectedRuleIds: ['ARTICLE_BEFORE_CONSONANT'],
  },
  {
    family: 'agreement',
    text: 'The list of issues are ready.',
    expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
  },
  {
    family: 'agreement local singular bare verb',
    text: 'Every update make it worse. Each deploy fix one thing.',
    expectedRuleIds: ['SUBJECT_VERB_AGREEMENT'],
  },
  {
    family: 'prepositions',
    text: 'We focused in the API docs.',
    expectedRuleIds: ['INCORRECT_PREPOSITIONS'],
  },
  {
    family: 'punctuation',
    text: 'The release - after review - shipped',
    expectedRuleIds: ['HYPHEN_USED_AS_DASH', 'SENTENCE_ENDING_PUNCTUATION'],
  },
  {
    family: 'quoted question punctuation',
    text: 'She asked, "Are we ready."',
    expectedRuleIds: ['QUESTION_MARK_SENTENCE_ENDING'],
  },
  {
    family: 'style',
    text: 'The release was shipped yesterday.',
    expectedRuleIds: ['PASSIVE_VOICE'],
  },
  {
    family: 'variants',
    text: 'The colour palette helped us organise the centre display.',
    expectedRuleIds: [
      'MIXED_LANGUAGE_VARIANTS',
      'DOCUMENT_VARIANT_CONSISTENCY',
    ],
    languageCode: 'en-US' as const,
  },
  {
    family: 'variant-aware confusion ranking',
    text: 'We practice functional TypeScript every day.',
    expectedRuleIds: ['PRACTICE_PRACTISE'],
    languageCode: 'en-GB' as const,
  },
  {
    family: 'lexical consistency',
    text: 'Send an email from the website. The web site sends updates to each co-worker and every coworker.',
    expectedRuleIds: ['LEXICAL_CONSISTENCY'],
  },
  {
    family: 'confusion pair benchmark',
    text: 'Your welcome to join us. There team is ready.',
    expectedRuleIds: ['YOUR_YOURE', 'THEIR_THERE_THEYRE'],
  },
]

const falsePositiveCorpus = [
  'gramadoc integrates with pnpm, vite, vitest, biome, and the openai api.',
  'Use TypeScript-first functions that return readonly data and keep side effects at the edge.',
  'The parser walks Markdown headings, paragraphs, and list items before the rules run.',
  'This API is focused on functional TypeScript and on keeping side effects at the edge.',
  "You're welcome and it's safe to keep apostrophes in contractions.",
  'The monorepo keeps tsconfig, tsx, eslint, and codegen settings in one workspace.',
  'Async middleware should serialize webhook payloads to json before the runtime deserializer runs.',
  'Async TypeScript docs often mention envvars, GraphQL, vitepress, and webhooks in a monorepo.',
  'The NextJS app loads sourcemaps, cronjobs, authn, authz, and tsup output during preflight checks.',
  'Turborepo docs keep typedoc, tsdoc, and tsconfig references in the workspace repo.',
  'See the API docs for setup details. The Sea API syncs records between services.',
  'The Affect API sync completed after deploy, and the docs mention its cloud connector.',
  'The glossary compares "see" and "sea" for learners in the setup docs.',
  'Leave there_fore alone inside fixture names and prefer config.incaseFallback for backwards compatibility.',
  'The service works well, performs well, reads well, and scales well under load.',
  'The web app performs well and involves complex state recovery.',
  "But you're stuck with macOS. You're done when the build is green. You're offline right now.",
  "It's safe to continue, and it's broken again while their API docs stay live.",
  "Who's ready to ship, and whose team owns the follow-up?",
  "I can't stand it and every update makes it worse.",
  'We noticed it and each deploy fixes one thing.',
  'I know it and every reminder helps.',
  'Sometimes I think that I need to want to need to do the right thing.',
  'We drove to London yesterday and want to walk home later.',
  'The transcript quoted "Why went home so early?" as an example sentence.',
  "Commenting on Iran's ballistic missile programme, she said the past 14 days have shown there is no world in which countries can safely coexist with Iran while it has those capabilities.",
  'Recent talks have made clear there is no route to peace without compromise.',
  'The last two weeks have shown there are no easy answers for negotiators.',
  'Months of review have confirmed there is no evidence of tampering in the logs.',
]

describe('benchmark corpus', () => {
  it('covers the major grammar, punctuation, style, and consistency families', () => {
    for (const fixture of benchmarkCorpus) {
      const matches = analyzeText(fixture.text, {
        languageCode: fixture.languageCode,
      }).warnings.matches
      const ruleIds = new Set(matches.map((match) => match.rule.id))

      for (const expectedRuleId of fixture.expectedRuleIds) {
        expect(ruleIds.has(expectedRuleId), fixture.family).toBe(true)
      }
    }
  })
})

describe('false-positive corpus', () => {
  it('keeps docs-style technical text quiet on spelling, passive-voice heuristics, and apostrophes', () => {
    for (const text of falsePositiveCorpus) {
      const riskyMatches = analyzeText(text).warnings.matches.filter(
        (match) =>
          match.rule.category.id === 'BASIC_SPELLING' ||
          match.rule.id === 'NON_DICTIONARY_WORDS' ||
          match.rule.id === 'PASSIVE_VOICE' ||
          match.rule.id === 'NOUN_STACK' ||
          match.rule.id === 'UNMATCHED_QUOTATION_MARK' ||
          [
            'LOSE_LOOSE',
            'PHRASE_WORD_CHOICE',
            'QUIET_QUITE',
            'SEE_SEA',
          ].includes(match.rule.id),
      )

      expect(riskyMatches).toEqual([])
    }
  })

  it('keeps agreement quiet on sentence-initial adverbials followed by content clauses', () => {
    const texts = [
      'Sometimes I think that I can fly.',
      'Sometimes I think that I need to want to need to do the right thing.',
      'Usually we think that we can ship safely.',
      'Today I think that we can ship safely.',
    ]

    for (const text of texts) {
      const agreementMatches = analyzeText(text).warnings.matches.filter(
        (match) => match.rule.id === 'SUBJECT_VERB_AGREEMENT',
      )

      expect(agreementMatches, text).toEqual([])
    }
  })

  it('keeps optional editorial packs off unless explicitly enabled', () => {
    const matches = analyzeText(
      'There are two issues in the draft, and the release is unclear.',
    ).warnings.matches

    expect(matches.map((match) => match.rule.id)).not.toContain(
      'E_PRIME_STRICT',
    )
    expect(matches.map((match) => match.rule.id)).not.toContain('E_PRIME_LOOSE')
  })
})

describe('overlap instrumentation', () => {
  it('captures overlap groups for deliberately overlapping rule families', () => {
    const analysis = analyzeText(
      'The colour palette helped us organise the centre display.',
      {
        languageCode: 'en-US',
      },
    )

    expect(analysis.metrics?.overlappingMatchGroups.length).toBeGreaterThan(0)
    expect(analysis.metrics?.topFiringRuleIds).toContain(
      'DOCUMENT_VARIANT_CONSISTENCY',
    )
  })
})

describe('optional pack toggles', () => {
  it('supports structured creative-writing toggles without changing the default baseline', () => {
    const text =
      'There are two issues in the draft, and the release is unclear.'
    const baselineRuleIds = analyzeText(text).warnings.matches.map(
      (match) => match.rule.id,
    )
    const configuredRuleIds = analyzeText(text, {
      optionalRulePacks: {
        creativeWriting: {
          ePrime: 'all',
        },
      },
    }).warnings.matches.map((match) => match.rule.id)

    expect(baselineRuleIds).not.toContain('E_PRIME_STRICT')
    expect(baselineRuleIds).not.toContain('E_PRIME_LOOSE')
    expect(configuredRuleIds).toContain('E_PRIME_STRICT')
    expect(configuredRuleIds).toContain('E_PRIME_LOOSE')
    expect(
      configuredRuleIds.filter(
        (ruleId) => ruleId !== 'E_PRIME_STRICT' && ruleId !== 'E_PRIME_LOOSE',
      ),
    ).toEqual(baselineRuleIds)
  })

  it('derives profile-based optional packs from the native-language profile config', () => {
    const context = buildRuleCheckContext(
      'Your should check weather the config changed.',
      {
        optionalRulePacks: {
          profiles: {
            nativeLanguage: 'l1/fr',
            falseFriends: true,
          },
        },
      },
    )

    expect(context.nativeLanguageProfile).toBe('l1/fr')
    expect(context.enabledRulePacks).toContain('l2-false-friends/fr')
    expect(
      analyzeText('Your should check weather the config changed.', {
        optionalRulePacks: {
          profiles: {
            nativeLanguage: 'l1/fr',
            falseFriends: true,
          },
        },
      }).warnings.matches.map((match) => match.rule.id),
    ).toEqual(
      analyzeText('Your should check weather the config changed.', {
        enabledRulePacks: ['l2-false-friends/fr'],
        nativeLanguageProfile: 'l1/fr',
      }).warnings.matches.map((match) => match.rule.id),
    )
  })

  it('maps editorial toggles into extensible unit-conversion pack ids without affecting current defaults', () => {
    const text =
      'Your should check weather the config changed, and there fore we should update it.'

    const baselineRuleIds = analyzeText(text).warnings.matches.map(
      (match) => match.rule.id,
    )
    const configuredRuleIds = analyzeText(text, {
      optionalRulePacks: {
        editorial: {
          unitConversions: 'imperial-us',
        },
      },
    }).warnings.matches.map((match) => match.rule.id)

    expect(configuredRuleIds).toEqual(baselineRuleIds)
  })

  it('keep core analysis stable when optional pack config is present', () => {
    const text =
      'Your should check weather the config changed, and there fore we should update it.'

    const baselineRuleIds = analyzeText(text).warnings.matches.map(
      (match) => match.rule.id,
    )
    const configuredRuleIds = analyzeText(text, {
      enabledRulePacks: [
        'creative-writing/e-prime-strict',
        'editorial/unit-conversions-us',
        'l2-false-friends/fr',
      ],
      nativeLanguageProfile: 'l1/fr',
      measurementPreference: 'imperial-us',
    }).warnings.matches.map((match) => match.rule.id)

    expect(configuredRuleIds).toEqual(baselineRuleIds)
  })

  it('keeps experimental contextual scoring behind its optional pack', () => {
    const text = 'This release is better then the previous one.'
    const baselineMatches = analyzeText(text).warnings.matches
    const configuredMatches = analyzeText(text, {
      optionalRulePacks: {
        experimental: {
          contextualConfusions: true,
        },
      },
    }).warnings.matches

    expect(baselineMatches.map((match) => match.rule.id)).not.toContain(
      'THAN_THEN',
    )
    expect(configuredMatches.map((match) => match.rule.id)).toContain(
      'THAN_THEN',
    )
    expect(
      configuredMatches.find((match) => match.rule.id === 'THAN_THEN')
        ?.confidenceLabel,
    ).toBe('low')
  })
})
