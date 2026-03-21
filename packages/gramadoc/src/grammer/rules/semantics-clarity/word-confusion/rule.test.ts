import { describe, expect, it } from 'vitest'
import { rankConfusionCandidates } from '../../../confusion'
import {
  contextualConfusionSets,
  homophoneConfusionSets,
} from '../../../resources/confusion-sets'
import { analyzeText, buildRuleCheckContext } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  acceptExceptConfusionRule,
  adviceAdviseConfusionRule,
  affectEffectConfusionRule,
  breathBreatheConfusionRule,
  haveAnAffectOnRule,
  itsContractionConfusionRule,
  licenceLicenseConfusionRule,
  loseLooseConfusionRule,
  practicePractiseConfusionRule,
  principalPrincipleConfusionRule,
  quietQuiteConfusionRule,
  seeSeaConfusionRule,
  takeAffectRule,
  thanThenConfusionRule,
  theirThereTheyreConfusionRule,
  toTooTwoConfusionRule,
  weatherWhetherConfusionRule,
  wordConfusionRules,
  yourYoureConfusionRule,
} from './rule'

describe('haveAnAffectOnRule', () => {
  it('flags the fixed phrase with the wrong noun', () => {
    const matches = runRule(
      haveAnAffectOnRule,
      'The delay had an affect on the launch.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "effect" in the phrase "have an effect on".',
      replacements: [{ value: 'effect' }],
    })
  })

  it('does not flag the correct phrase or punctuation-broken words', () => {
    expect(
      runRule(
        haveAnAffectOnRule,
        'The delay had an effect on the launch. They had an, affect on, the vote.',
      ),
    ).toEqual([])
  })
})

describe('takeAffectRule', () => {
  it('flags the fixed phrase with the wrong noun', () => {
    const matches = runRule(
      takeAffectRule,
      'The policy will take affect tomorrow.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "effect" in the phrase "take effect".',
      replacements: [{ value: 'effect' }],
    })
  })

  it('does not flag the correct phrase or unrelated words', () => {
    expect(
      runRule(
        takeAffectRule,
        'The policy will take effect tomorrow. Their affect was calm.',
      ),
    ).toEqual([])
  })
})

describe('wordConfusionRules', () => {
  it('exports the grouped word confusion rules', () => {
    expect(wordConfusionRules).toEqual(
      expect.arrayContaining([
        haveAnAffectOnRule,
        takeAffectRule,
        thanThenConfusionRule,
        affectEffectConfusionRule,
        practicePractiseConfusionRule,
        licenceLicenseConfusionRule,
        adviceAdviseConfusionRule,
        weatherWhetherConfusionRule,
        seeSeaConfusionRule,
        loseLooseConfusionRule,
        quietQuiteConfusionRule,
        breathBreatheConfusionRule,
        acceptExceptConfusionRule,
        principalPrincipleConfusionRule,
        yourYoureConfusionRule,
        itsContractionConfusionRule,
        theirThereTheyreConfusionRule,
        toTooTwoConfusionRule,
      ]),
    )
  })
})

describe('thanThenConfusionRule', () => {
  it('keeps scored contextual rules opt-in unless the experimental pack is enabled', () => {
    expect(
      runRule(
        thanThenConfusionRule,
        'This release is better then the previous one.',
      ),
    ).toEqual([])

    expect(
      runRule(
        thanThenConfusionRule,
        'This release is better then the previous one.',
        {
          enabledRulePacks: ['experimental/contextual-confusions'],
        },
      ),
    ).toHaveLength(1)
  })

  it('ranks than/then replacements from nearby context', () => {
    const matches = runRule(
      thanThenConfusionRule,
      'This release is better then the previous one. Save the file, than run the tests.',
      {
        enabledRulePacks: ['experimental/contextual-confusions'],
      },
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'than' })
    expect(matches[1]?.replacements[0]).toEqual({ value: 'then' })
  })
})

describe('affectEffectConfusionRule', () => {
  it('ranks affect/effect replacements from nearby context', () => {
    const matches = runRule(
      affectEffectConfusionRule,
      'This can effect the launch date.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'affect' })
  })
})

describe('practicePractiseConfusionRule', () => {
  it('uses the selected language mode to rank the right variant', () => {
    const usMatches = runRule(
      practicePractiseConfusionRule,
      'We practise functional TypeScript every day.',
      { languageCode: 'en-US' },
    )
    const ukMatches = runRule(
      practicePractiseConfusionRule,
      'We practice functional TypeScript every day.',
      { languageCode: 'en-GB' },
    )

    expect(usMatches).toHaveLength(1)
    expect(usMatches[0]?.replacements[0]).toEqual({ value: 'practice' })
    expect(ukMatches).toHaveLength(1)
    expect(ukMatches[0]?.replacements[0]).toEqual({ value: 'practise' })
  })

  it('stays quiet in generic english mode where either variant may be valid', () => {
    expect(
      runRule(
        practicePractiseConfusionRule,
        'We practice functional TypeScript every day.',
      ),
    ).toEqual([])
    expect(
      runRule(
        practicePractiseConfusionRule,
        'We practise functional TypeScript every day.',
      ),
    ).toEqual([])
  })
})

describe('licenceLicenseConfusionRule', () => {
  it('uses noun and variant cues to rank the correct spelling', () => {
    const ukMatches = runRule(
      licenceLicenseConfusionRule,
      'Your license expired last week.',
      { languageCode: 'en-GB' },
    )
    const usMatches = runRule(
      licenceLicenseConfusionRule,
      'We licence the package before release.',
      { languageCode: 'en-US' },
    )

    expect(ukMatches).toHaveLength(1)
    expect(ukMatches[0]?.replacements[0]).toEqual({ value: 'licence' })
    expect(usMatches).toHaveLength(1)
    expect(usMatches[0]?.replacements[0]).toEqual({ value: 'license' })
  })
})

describe('adviceAdviseConfusionRule', () => {
  it('ranks advice/advise from local noun and verb cues', () => {
    const matches = runRule(
      adviceAdviseConfusionRule,
      'Thanks for the advise. We advice checking the API docs first.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'advice' })
    expect(matches[1]?.replacements[0]).toEqual({ value: 'advise' })
  })
})

describe('weatherWhetherConfusionRule', () => {
  it('ranks weather/whether from clause and noun cues', () => {
    const matches = runRule(
      weatherWhetherConfusionRule,
      'Check weather the tests passed. The whether stayed clear all day.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'whether' })
    expect(matches[1]?.replacements[0]).toEqual({ value: 'weather' })
  })
})

describe('seeSeaConfusionRule', () => {
  it('ranks see/sea from modal and maritime cues', () => {
    const matches = runRule(
      seeSeaConfusionRule,
      'I can sea the failing test now. The see stayed calm near the harbor.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'see' })
    expect(matches[1]?.replacements[0]).toEqual({ value: 'sea' })
  })

  it('stays quiet for ordinary documentation prose and capitalized product names', () => {
    expect(
      runRule(
        seeSeaConfusionRule,
        'See the API docs for setup details. The Sea API syncs records between services. We can see the diff clearly.',
      ),
    ).toEqual([])
  })
})

describe('loseLooseConfusionRule', () => {
  it('ranks lose/loose from infinitive and copular cues', () => {
    const matches = runRule(
      loseLooseConfusionRule,
      'We do not want to loose data. The connector is lose again.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'lose' })
    expect(matches[1]?.replacements[0]).toEqual({ value: 'loose' })
  })
})

describe('quietQuiteConfusionRule', () => {
  it('ranks quiet/quite from noun and adjective cues', () => {
    const matches = runRule(
      quietQuiteConfusionRule,
      'We need a quite room. The release is quiet stable now.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'quiet' })
    expect(matches[1]?.replacements[0]).toEqual({ value: 'quite' })
  })
})

describe('toTooTwoConfusionRule', () => {
  it('flags infinitive spellings when count context clearly calls for the number form', () => {
    const matches = runRule(
      toTooTwoConfusionRule,
      'We have to options queued. There are to tests left.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]).toEqual({ value: 'two' })
    expect(matches[1]?.replacements[0]).toEqual({ value: 'two' })
  })

  it('stays quiet for correct number phrases even when the following noun is verb-ambiguous', () => {
    expect(
      runRule(
        toTooTwoConfusionRule,
        'There are two issues in the draft. We have two reports to review.',
      ),
    ).toEqual([])
  })

  it('stays quiet for parenthetical "too" set off by commas', () => {
    expect(
      runRule(
        toTooTwoConfusionRule,
        "Elena Alvarez, the singer's granddaughter, shared a tribute online, revealing that she, too, had grown up hearing stories about her grandmother's influence.",
      ),
    ).toEqual([])
  })

  it('stays quiet for short additive parentheticals in ordinary prose', () => {
    expect(
      runRule(
        toTooTwoConfusionRule,
        'I, too, was surprised by the reaction. She, too, wanted to help.',
      ),
    ).toEqual([])
  })

  it('stays quiet for idiomatic prepositional phrases like "counted to infinity"', () => {
    expect(
      runRule(
        toTooTwoConfusionRule,
        'People joked that Professor Vale had counted to infinity twice before breakfast, she said.',
      ),
    ).toEqual([])
  })
})

describe('confusion ranking evidence', () => {
  it('records when statistical, casing, and POS cues are driving ranking decisions', () => {
    const thanThenSet = contextualConfusionSets.find(
      (set) => set.id === 'THAN_THEN',
    )
    const practicePractiseSet = contextualConfusionSets.find(
      (set) => set.id === 'PRACTICE_PRACTISE',
    )
    const affectEffectSet = contextualConfusionSets.find(
      (set) => set.id === 'AFFECT_EFFECT',
    )

    expect(thanThenSet).toBeDefined()
    expect(practicePractiseSet).toBeDefined()
    expect(affectEffectSet).toBeDefined()
    if (!thanThenSet || !practicePractiseSet || !affectEffectSet) {
      throw new Error('Expected contextual confusion sets to be defined')
    }

    const thanThenContext = buildRuleCheckContext(
      'Save the file, and than deploy the service.',
      {
        enabledRulePacks: ['experimental/contextual-confusions'],
      },
    )
    const thanThenRanking = rankConfusionCandidates(
      thanThenSet,
      thanThenContext,
      4,
    )

    expect(thanThenRanking[0]?.candidate.value).toBe('then')
    expect(
      thanThenRanking
        .flatMap((entry) => entry.evidence)
        .some((evidence) => evidence.source === 'collocation'),
    ).toBe(true)

    const practicePractiseContext = buildRuleCheckContext(
      'We practice functional TypeScript every day.',
      { languageCode: 'en-GB' },
    )
    const practicePractiseRanking = rankConfusionCandidates(
      practicePractiseSet,
      practicePractiseContext,
      1,
    )

    expect(practicePractiseRanking[0]?.candidate.value).toBe('practise')
    expect(
      practicePractiseRanking
        .flatMap((entry) => entry.evidence)
        .some((evidence) =>
          [
            'language',
            'pos-contextual',
            'pos-lexical',
            'pos-morphology',
            'variant',
          ].includes(evidence.source),
        ),
    ).toBe(true)

    const affectEffectContext = buildRuleCheckContext(
      'The change takes effect tomorrow.',
    )
    const affectEffectRanking = rankConfusionCandidates(
      affectEffectSet,
      affectEffectContext,
      3,
    )

    const effectEntry = affectEffectRanking.find(
      (entry) => entry.candidate.value === 'effect',
    )

    expect(effectEntry).toBeDefined()
    expect(
      effectEntry?.evidence.some((evidence) => evidence.source === 'lemma'),
    ).toBe(true)
  })

  it('uses clause-position cues for subordinating-context confusions', () => {
    const weatherWhetherSet = contextualConfusionSets.find(
      (set) => set.id === 'WEATHER_WHETHER',
    )

    expect(weatherWhetherSet).toBeDefined()
    if (!weatherWhetherSet) {
      throw new Error('Expected WEATHER_WHETHER confusion set to be defined')
    }

    const context = buildRuleCheckContext('Check weather the tests passed.')
    const ranking = rankConfusionCandidates(weatherWhetherSet, context, 1)

    expect(ranking[0]?.candidate.value).toBe('whether')
    expect(
      ranking
        .flatMap((entry) => entry.evidence)
        .some((evidence) => evidence.source === 'clause'),
    ).toBe(true)
  })

  it('labels marginal scored contextual matches as low confidence in the API', () => {
    const matches = runRule(
      thanThenConfusionRule,
      'This release is better then the previous one.',
      {
        enabledRulePacks: ['experimental/contextual-confusions'],
      },
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.confidenceLabel).toBe('low')
  })

  it('keeps case-plausible product names quiet in docs-style prose', () => {
    expect(
      runRule(
        affectEffectConfusionRule,
        'The Affect API sync completed after deploy.',
      ),
    ).toEqual([])
  })

  it('ignores fallback-only noun evidence for risky your/you-re scoring', () => {
    const yourYoureSet = homophoneConfusionSets.find(
      (set) => set.id === 'YOUR_YOURE',
    )

    expect(yourYoureSet).toBeDefined()
    if (!yourYoureSet) {
      throw new Error('Expected YOUR_YOURE confusion set to be defined')
    }

    const context = buildRuleCheckContext("But you're frobnicator today.")
    const ranking = rankConfusionCandidates(yourYoureSet, context, 1)
    const yourEntry = ranking.find((entry) => entry.candidate.value === 'your')

    expect(ranking[0]?.candidate.value).not.toBe('your')
    expect(yourEntry?.evidence ?? []).toEqual([])
  })

  it('keeps predicate and antipattern cases quiet while preserving possessives', () => {
    expect(
      runRule(yourYoureConfusionRule, "But you're stuck with macOS."),
    ).toEqual([])
    expect(
      runRule(
        yourYoureConfusionRule,
        "You're done when the build is green. You're offline right now. Hope you're well. You're under pressure.",
      ),
    ).toEqual([])

    const matches = analyzeText(
      'Your team is ready. Your build is failing. Your laptop is overheating. Your account settings are here.',
    ).warnings.matches

    expect(matches.filter((match) => match.rule.id === 'YOUR_YOURE')).toEqual(
      [],
    )
  })

  it('adds debug details for the winning confusion evidence', () => {
    const matches = runRule(yourYoureConfusionRule, 'Your welcome to join us.')

    expect(matches).toHaveLength(1)
    expect(matches[0]?.details?.winningCandidate).toBe("you're")
    expect(matches[0]?.details?.confusionFamily).toBe('your/you-re')
    expect(matches[0]?.diagnostics?.evidence?.length).toBeGreaterThan(0)
  })
})
