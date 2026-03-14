import { describe, expect, it } from 'vitest'
import { analyzeTokenMorphology } from './morphology'
import { analyzeText, buildRuleCheckContext } from './utils'

function getRuleIds(text: string) {
  return new Set(
    analyzeText(text).warnings.matches.map((match) => match.rule.id),
  )
}

function getToken(text: string, normalized: string, occurrence = 0) {
  const matches = buildRuleCheckContext(text).tokens.filter(
    (token) => token.normalized === normalized,
  )

  expect(
    matches[occurrence],
    `Expected token "${normalized}" occurrence ${occurrence} in: ${text}`,
  ).toBeDefined()

  const match = matches[occurrence]

  if (!match) {
    throw new Error(
      `Expected token "${normalized}" occurrence ${occurrence} in: ${text}`,
    )
  }

  return match
}

describe('morphology known failures', () => {
  it('keeps the audit surface conservative at the token level', () => {
    const need = analyzeTokenMorphology('need')
    const read = analyzeTokenMorphology('read')
    const status = analyzeTokenMorphology('status')
    const series = analyzeTokenMorphology('series')

    expect(need).toMatchObject({
      lemma: 'need',
      provenance: 'identity',
      verb: {
        base: 'need',
        canBeBase: true,
        isNonBaseForm: false,
      },
    })
    expect(read).toMatchObject({
      lemma: 'read',
      provenance: 'ambiguous',
      isAmbiguous: true,
    })
    expect(status.verb.isCandidate).toBe(false)
    expect(series.verb.isCandidate).toBe(false)
  })

  it('keeps infinitive rewrite heuristics quiet for want-to-need, prepositional to, and quoted mentions', () => {
    const flaggedRuleIds = getRuleIds('They hoped to agreed too quickly.')
    const quietText = [
      'Sometimes I think that I need to want to need to do the right thing.',
      'We drove to London yesterday.',
      'The guide quoted "to agreed" as a learner error.',
    ].join(' ')
    const quietRuleIds = getRuleIds(quietText)
    const quietContext = buildRuleCheckContext(quietText)
    const trailingNeed = getToken(quietText, 'need', 1)
    const london = quietContext.tokens.find(
      (token) => token.normalized === 'london',
    )
    const agreed = getToken(quietText, 'agreed')

    expect(flaggedRuleIds.has('INFINITIVE_BASE_VERB')).toBe(true)
    expect(quietRuleIds.has('INFINITIVE_BASE_VERB')).toBe(false)
    expect(trailingNeed.morphology).toMatchObject({
      lemma: 'need',
      verb: {
        base: 'need',
        isNonBaseForm: false,
      },
    })
    expect(london?.normalized).toBe('london')
    expect(agreed.morphology).toMatchObject({
      lemma: 'agree',
      provenance: 'regular',
      verb: {
        base: 'agree',
        isNonBaseForm: true,
      },
    })
  })

  it('keeps ambiguous and quoted why examples quiet while live non-base questions still fire', () => {
    const flaggedRuleIds = getRuleIds('Why went home so early?')
    const quietText =
      'We need to read the memo. The transcript quoted "Why went home so early?" as an example sentence.'
    const quietRuleIds = getRuleIds(quietText)
    const read = getToken(quietText, 'read')
    const went = getToken(quietText, 'went')

    expect(flaggedRuleIds.has('QUESTION_LEAD_BASE_VERB')).toBe(true)
    expect(quietRuleIds.has('QUESTION_LEAD_BASE_VERB')).toBe(false)
    expect(read.morphology).toMatchObject({
      lemma: 'read',
      provenance: 'ambiguous',
      isAmbiguous: true,
    })
    expect(went.morphology).toMatchObject({
      lemma: 'go',
      provenance: 'irregular',
      verb: {
        base: 'go',
        isNonBaseForm: true,
      },
    })
  })
})
