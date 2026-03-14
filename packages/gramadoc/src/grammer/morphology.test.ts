import { describe, expect, it } from 'vitest'
import {
  analyzeTokenMorphology,
  getBaseVerbCandidate,
  getBaseVerbCandidateInAuxiliaryContext,
  getBaseVerbCandidateInInfinitiveContext,
  getPastParticipleCandidate,
  getPastParticipleCandidateInPerfectContext,
  getPastTenseCandidate,
  isLikelyVerbInAuxiliaryContext,
  isLikelyVerbInInfinitiveContext,
  toPresentParticiple,
} from './morphology'

describe('analyzeTokenMorphology', () => {
  it('covers regular and irregular verb-form families', () => {
    const cases = [
      {
        token: 'walked',
        lemma: 'walk',
        provenance: 'regular',
        form: 'past',
      },
      {
        token: 'agreed',
        lemma: 'agree',
        provenance: 'regular',
        form: 'past',
      },
      {
        token: 'studied',
        lemma: 'study',
        provenance: 'regular',
        form: 'past',
      },
      {
        token: 'making',
        lemma: 'make',
        provenance: 'regular',
        form: 'present-participle',
      },
      {
        token: 'tries',
        lemma: 'try',
        provenance: 'regular',
        form: 'third-person-singular',
      },
      {
        token: 'went',
        lemma: 'go',
        provenance: 'irregular',
        form: 'past',
      },
      {
        token: 'written',
        lemma: 'write',
        provenance: 'irregular',
        form: 'past-participle',
      },
    ] as const

    for (const testCase of cases) {
      const morphology = analyzeTokenMorphology(testCase.token)

      expect(morphology).toMatchObject({
        lemma: testCase.lemma,
        provenance: testCase.provenance,
        verb: {
          form: testCase.form,
          base: testCase.lemma,
        },
      })
      expect(morphology.verb.isNonBaseForm).toBe(true)
    }
  })

  it('treats ambiguous and suffix-lookalike words conservatively', () => {
    const read = analyzeTokenMorphology('read')
    const need = analyzeTokenMorphology('need')
    const status = analyzeTokenMorphology('status')
    const series = analyzeTokenMorphology('series')

    expect(read).toMatchObject({
      lemma: 'read',
      provenance: 'ambiguous',
      isAmbiguous: true,
      verb: {
        canBeBase: true,
        canBePast: true,
      },
    })
    expect(need).toMatchObject({
      lemma: 'need',
      provenance: 'identity',
      verb: {
        canBeBase: true,
        isNonBaseForm: false,
      },
    })
    expect(status.verb.isCandidate).toBe(false)
    expect(series.verb.isCandidate).toBe(false)
  })
})

describe('shared morphology helpers', () => {
  it('recovers safe rewrite candidates for base-verb and participle contexts', () => {
    const agreed = analyzeTokenMorphology('agreed')
    const wrote = analyzeTokenMorphology('wrote')
    const read = analyzeTokenMorphology('read')

    expect(
      getBaseVerbCandidate({ normalized: 'agreed', morphology: agreed }),
    ).toBe('agree')
    expect(
      getPastParticipleCandidate({ normalized: 'wrote', morphology: wrote }),
    ).toBe('written')
    expect(
      getPastTenseCandidate({
        normalized: 'seen',
        morphology: analyzeTokenMorphology('seen'),
      }),
    ).toBe('saw')
    expect(getBaseVerbCandidate({ normalized: 'read', morphology: read })).toBe(
      null,
    )
  })

  it('keeps known failure surfaces out of unsafe rewrite candidates', () => {
    const to = {
      normalized: 'to',
    }
    const need = {
      normalized: 'need',
      posHints: ['verb'],
      morphology: analyzeTokenMorphology('need'),
    }
    const read = {
      normalized: 'read',
      posHints: ['verb'],
      morphology: analyzeTokenMorphology('read'),
    }
    const status = {
      normalized: 'status',
      posHints: ['noun'],
      morphology: analyzeTokenMorphology('status'),
    }
    const series = {
      normalized: 'series',
      posHints: ['noun'],
      morphology: analyzeTokenMorphology('series'),
    }

    expect(getBaseVerbCandidate(need)).toBe(null)
    expect(
      getBaseVerbCandidateInInfinitiveContext({
        leader: to,
        candidate: need,
      }),
    ).toBe(null)
    expect(getBaseVerbCandidate(status)).toBe(null)
    expect(getBaseVerbCandidate(series)).toBe(null)
    expect(getPastParticipleCandidate(read)).toBe(null)
    expect(getPastTenseCandidate(read)).toBe(null)
  })

  it('inflects shared present-participle rewrites for regular patterns', () => {
    expect(toPresentParticiple('fix')).toBe('fixing')
    expect(toPresentParticiple('clean')).toBe('cleaning')
    expect(toPresentParticiple('die')).toBe('dying')
    expect(toPresentParticiple('make')).toBe('making')
  })

  it('shares infinitive and auxiliary context decisions across consumers', () => {
    const to = {
      normalized: 'to',
    }
    const have = {
      normalized: 'have',
      posHints: ['auxiliary', 'verb'],
      morphology: analyzeTokenMorphology('have'),
    }
    const agreed = {
      normalized: 'agreed',
      posHints: ['verb'],
      morphology: analyzeTokenMorphology('agreed'),
    }
    const wrote = {
      normalized: 'wrote',
      posHints: ['verb'],
      morphology: analyzeTokenMorphology('wrote'),
    }
    const market = {
      normalized: 'market',
      posHints: ['noun'],
      morphology: analyzeTokenMorphology('market'),
    }

    expect(
      isLikelyVerbInInfinitiveContext({ leader: to, candidate: agreed }),
    ).toBe(true)
    expect(
      getBaseVerbCandidateInInfinitiveContext({
        leader: to,
        candidate: agreed,
      }),
    ).toBe('agree')
    expect(
      isLikelyVerbInInfinitiveContext({ leader: to, candidate: market }),
    ).toBe(false)
    expect(
      isLikelyVerbInAuxiliaryContext({ leader: have, candidate: wrote }),
    ).toBe(true)
    expect(
      getPastParticipleCandidateInPerfectContext({
        leader: have,
        candidate: wrote,
      }),
    ).toBe('written')
    expect(
      getBaseVerbCandidateInAuxiliaryContext({
        leader: have,
        candidate: agreed,
      }),
    ).toBe('agree')
  })
})
