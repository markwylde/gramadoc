import { describe, expect, it } from 'vitest'
import { rankConfusionCandidates } from './confusion'
import { getTokenAnnotation } from './linguistics'
import { contextualConfusionSets } from './resources/confusion-sets'
import type { RuleCheckContext } from './types'
import { buildRuleCheckContext } from './utils'

function stripLightweightAnnotation(
  context: RuleCheckContext,
): RuleCheckContext {
  const strippedTokens = context.tokens.map((token) => ({
    ...token,
    morphology: {
      ...token.morphology,
      lemma: token.normalized,
      lemmaAlternates: [],
      provenance: 'identity' as const,
      confidence: 'low' as const,
      isAmbiguous: false,
      ambiguityTags: [],
      verb: {
        ...token.morphology.verb,
        isCandidate: false,
        form: null,
        base: null,
        candidates: [],
        provenance: null,
        confidence: 'low' as const,
        isAmbiguous: false,
        isNonBaseForm: false,
        canBeBase: false,
        canBeThirdPersonSingular: false,
        canBePast: false,
        canBePastParticiple: false,
        canBePresentParticiple: false,
      },
    },
    posHints: ['noun'] as const,
    lexicalPosHints: ['noun'] as const,
    morphologyPosHints: [] as const,
    fallbackPosHints: [] as const,
    contextualPosHints: [] as const,
    posReadings: [
      {
        pos: 'noun' as const,
        sources: ['open-class-lexicon'] as const,
        confidence: 'high' as const,
      },
    ],
    disambiguationProvenance: [],
  })) as RuleCheckContext['tokens']
  const tokenByIndex = new Map(
    strippedTokens.map((token) => [token.index, token]),
  )

  return {
    ...context,
    tokens: strippedTokens,
    sentenceTokens: context.sentenceTokens.map((tokens) =>
      tokens.map((token) => tokenByIndex.get(token.index) ?? token),
    ),
    clauseTokens: context.clauseTokens.map((tokens) =>
      tokens.map((token) => tokenByIndex.get(token.index) ?? token),
    ),
    paragraphTokens: context.paragraphTokens.map((tokens) =>
      tokens.map((token) => tokenByIndex.get(token.index) ?? token),
    ),
  }
}

describe('lightweight annotation lift', () => {
  it('keeps attested open-class readings separate from fallback noun guesses', () => {
    const well = getTokenAnnotation('well')
    const performs = getTokenAnnotation('performs')
    const makes = getTokenAnnotation('makes')
    const helps = getTokenAnnotation('helps')
    const status = getTokenAnnotation('status')
    const series = getTokenAnnotation('series')
    const containerize = getTokenAnnotation('containerize')
    const frobnicator = getTokenAnnotation('frobnicator')

    expect(well.lexicalPosHints).toContain('adverb')
    expect(well.fallbackPosHints).toEqual([])
    expect(well.usedFallbackPosGuess).toBe(false)
    expect(well.posReadings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pos: 'adverb',
          sources: expect.arrayContaining(['open-class-lexicon']),
        }),
      ]),
    )

    expect(performs.lexicalPosHints).toContain('verb')
    expect(performs.morphologyPosHints).toEqual(
      expect.arrayContaining(['noun', 'verb']),
    )
    expect(makes.morphologyPosHints).toEqual(
      expect.arrayContaining(['noun', 'verb']),
    )
    expect(helps.morphologyPosHints).toEqual(
      expect.arrayContaining(['noun', 'verb']),
    )
    expect(status.morphologyPosHints).toEqual([])
    expect(series.morphologyPosHints).toEqual([])
    expect(containerize.morphologyPosHints).toEqual(['verb'])
    expect(containerize.fallbackPosHints).toEqual([])
    expect(performs.morphologyPosHints).toContain('noun')
    expect(performs.fallbackPosHints).toEqual([])
    expect(performs.isPosAmbiguous).toBe(true)

    expect(frobnicator.fallbackPosHints).toEqual(['noun'])
    expect(frobnicator.usedFallbackPosGuess).toBe(true)
    expect(frobnicator.posReadings).toEqual([
      {
        pos: 'noun',
        sources: ['fallback'],
        confidence: 'low',
      },
    ])
  })

  it('recovers useful auxiliary and modal signals from common contractions', () => {
    const cant = getTokenAnnotation("can't")
    const dont = getTokenAnnotation("don't")
    const wont = getTokenAnnotation("won't")
    const im = getTokenAnnotation("i'm")
    const were = getTokenAnnotation("we're")
    const shouldnt = getTokenAnnotation("shouldn't")
    const youll = getTokenAnnotation("you'll")
    const shouldve = getTokenAnnotation("should've")

    expect(cant).not.toHaveProperty('lemma')
    expect(cant).toMatchObject({
      morphology: { lemma: 'can' },
      lexicalPosHints: expect.arrayContaining(['modal', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
    expect(dont).toMatchObject({
      morphology: { lemma: 'do' },
      lexicalPosHints: expect.arrayContaining(['auxiliary', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
    expect(wont).toMatchObject({
      morphology: { lemma: 'will' },
      lexicalPosHints: expect.arrayContaining(['modal', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
    expect(im).toMatchObject({
      morphology: { lemma: 'be' },
      lexicalPosHints: expect.arrayContaining(['auxiliary', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
    expect(were).toMatchObject({
      morphology: { lemma: 'be' },
      lexicalPosHints: expect.arrayContaining(['auxiliary', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
    expect(shouldnt).toMatchObject({
      morphology: { lemma: 'should' },
      lexicalPosHints: expect.arrayContaining(['modal', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
    expect(youll).toMatchObject({
      morphology: { lemma: 'will' },
      lexicalPosHints: expect.arrayContaining(['modal', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
    expect(shouldve).toMatchObject({
      morphology: { lemma: 'should' },
      lexicalPosHints: expect.arrayContaining(['modal', 'verb']),
      fallbackPosHints: [],
      posHintConfidence: 'high',
    })
  })

  it('exposes structured morphology provenance, form, and ambiguity', () => {
    const agreed = getTokenAnnotation('agreed')
    const studied = getTokenAnnotation('studied')
    const read = getTokenAnnotation('read')
    const need = getTokenAnnotation('need')

    expect(agreed.morphology).toMatchObject({
      lemma: 'agree',
      provenance: 'regular',
      verb: {
        form: 'past',
        base: 'agree',
        canBePast: true,
        canBePastParticiple: true,
      },
    })
    expect(studied.morphology.verb.base).toBe('study')
    expect(read.morphology).toMatchObject({
      lemma: 'read',
      provenance: 'ambiguous',
      isAmbiguous: true,
    })
    expect(need.morphology).toMatchObject({
      lemma: 'need',
      provenance: 'identity',
      verb: {
        form: 'base',
        base: 'need',
        canBeBase: true,
      },
    })
  })

  it('still improves confusion ranking on annotation-sensitive fixtures', () => {
    const thanThenSet = contextualConfusionSets.find(
      (set) => set.id === 'THAN_THEN',
    )

    expect(thanThenSet).toBeDefined()
    if (!thanThenSet) {
      throw new Error('Expected THAN_THEN confusion set to be defined')
    }

    const context = buildRuleCheckContext(
      'Save the file, than run the tests.',
      {
        enabledRulePacks: ['experimental/contextual-confusions'],
      },
    )
    const annotatedRanking = rankConfusionCandidates(thanThenSet, context, 3)
    const strippedRanking = rankConfusionCandidates(
      thanThenSet,
      stripLightweightAnnotation(context),
      3,
    )

    expect(annotatedRanking[0]?.candidate.value).toBe('then')
    expect(
      annotatedRanking[0]?.evidence.some(
        (evidence) =>
          evidence.source === 'pos-contextual' ||
          evidence.source === 'pos-lexical' ||
          evidence.source === 'pos-morphology',
      ),
    ).toBe(true)
    expect(
      strippedRanking[0] === undefined ||
        strippedRanking[0].candidate.value === 'than',
    ).toBe(true)
    expect(strippedRanking[0]?.score ?? 0).toBeLessThan(
      annotatedRanking[0]?.score ?? 0,
    )
  })

  it('promotes predicate readings after be without treating fallback nouns as strong evidence', () => {
    const context = buildRuleCheckContext(
      "You're stuck, it's broken, they're ready, and we're offline.",
    )

    const stuck = context.tokens.find((token) => token.normalized === 'stuck')
    const broken = context.tokens.find((token) => token.normalized === 'broken')
    const ready = context.tokens.find((token) => token.normalized === 'ready')
    const offline = context.tokens.find(
      (token) => token.normalized === 'offline',
    )
    const frobnicator = getTokenAnnotation('frobnicator')

    expect(stuck?.contextualPosHints).toContain('adjective')
    expect(
      stuck?.posReadings.find((reading) => reading.pos === 'adjective')
        ?.sources,
    ).toContain('contextual-disambiguation')
    expect(broken?.contextualPosHints).toContain('adjective')
    expect(ready?.posHints).toContain('adjective')
    expect(offline?.posHints).toContain('adjective')
    expect(frobnicator.fallbackPosHints).toEqual(['noun'])
    expect(frobnicator.posReadings[0]?.sources).toEqual(['fallback'])
  })

  it('recovers predicate signals after contracted auxiliaries and leaves unknown fallback noun-only', () => {
    const context = buildRuleCheckContext(
      "I can't stand delays. We don't agree. I'm ready. We're late. She won't listen. Every frobnicator glips the queue.",
    )

    const stand = context.tokens.find((token) => token.normalized === 'stand')
    const agree = context.tokens.find((token) => token.normalized === 'agree')
    const ready = context.tokens.find((token) => token.normalized === 'ready')
    const late = context.tokens.find((token) => token.normalized === 'late')
    const listen = context.tokens.find((token) => token.normalized === 'listen')
    const glips = context.tokens.find((token) => token.normalized === 'glips')

    expect(stand?.posHints).toContain('verb')
    expect(stand?.disambiguationProvenance).toContain(
      'auxiliary-or-modal-plus-verb',
    )
    expect(agree?.posHints).toContain('verb')
    expect(agree?.disambiguationProvenance).toContain(
      'auxiliary-or-modal-plus-verb',
    )
    expect(ready?.posHints).toContain('adjective')
    expect(late?.posHints).toContain('adjective')
    expect(listen?.posHints).toContain('verb')
    expect(listen?.disambiguationProvenance).toContain(
      'auxiliary-or-modal-plus-verb',
    )
    expect(glips?.posHints).toEqual(['noun'])
    expect(glips?.usedFallbackPosGuess).toBe(false)
  })

  it('uses the shared infinitive context to promote verbs after infinitival to without promoting nouns after prepositional to', () => {
    const context = buildRuleCheckContext(
      'We plan to agree soon and walked to market yesterday.',
    )

    const agree = context.tokens.find((token) => token.normalized === 'agree')
    const market = context.tokens.find((token) => token.normalized === 'market')

    expect(agree).not.toHaveProperty('lemma')
    expect(agree?.posHints).toContain('verb')
    expect(agree?.disambiguationProvenance).toContain('to-plus-verb')
    expect(market?.posHints).toContain('noun')
    expect(market?.disambiguationProvenance).not.toContain('to-plus-verb')
  })

  it('recovers verb signals after additional contracted modals', () => {
    const context = buildRuleCheckContext(
      "You'll listen. We shouldn't go. They should've gone. He might've finished.",
    )

    const listen = context.tokens.find((token) => token.normalized === 'listen')
    const go = context.tokens.find((token) => token.normalized === 'go')
    const gone = context.tokens.find((token) => token.normalized === 'gone')
    const finished = context.tokens.find(
      (token) => token.normalized === 'finished',
    )

    expect(listen?.posHints).toContain('verb')
    expect(listen?.disambiguationProvenance).toContain(
      'auxiliary-or-modal-plus-verb',
    )
    expect(go?.posHints).toContain('verb')
    expect(go?.disambiguationProvenance).toContain(
      'auxiliary-or-modal-plus-verb',
    )
    expect(gone?.posHints).toContain('verb')
    expect(gone?.disambiguationProvenance).toContain(
      'auxiliary-or-modal-plus-verb',
    )
    expect(finished?.posHints).toContain('verb')
    expect(finished?.disambiguationProvenance).toContain(
      'auxiliary-or-modal-plus-verb',
    )
  })
})
