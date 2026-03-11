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
    lemma: token.normalized,
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
    isOpenClassUnknown: false,
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
    const frobnicator = getTokenAnnotation('frobnicator')

    expect(well.lexicalPosHints).toContain('adverb')
    expect(well.fallbackPosHints).toEqual([])
    expect(well.isOpenClassUnknown).toBe(false)
    expect(well.posReadings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pos: 'adverb',
          sources: expect.arrayContaining(['open-class-lexicon']),
        }),
      ]),
    )

    expect(performs.lexicalPosHints).toContain('verb')
    expect(performs.morphologyPosHints).toContain('noun')
    expect(performs.fallbackPosHints).toEqual([])
    expect(performs.isPosAmbiguous).toBe(true)

    expect(frobnicator.fallbackPosHints).toEqual(['noun'])
    expect(frobnicator.isOpenClassUnknown).toBe(true)
    expect(frobnicator.posReadings).toEqual([
      {
        pos: 'noun',
        sources: ['fallback'],
        confidence: 'low',
      },
    ])
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
})
