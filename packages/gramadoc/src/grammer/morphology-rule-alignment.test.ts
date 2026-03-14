import { describe, expect, it } from 'vitest'
import { analyzeText, buildRuleCheckContext } from './utils'

function getToken(text: string, normalized: string) {
  const context = buildRuleCheckContext(text)
  const token = context.tokens.find(
    (candidate) => candidate.normalized === normalized,
  )

  expect(token, `Expected token "${normalized}" in: ${text}`).toBeDefined()

  return token!
}

function getRuleIds(text: string) {
  return new Set(
    analyzeText(text).warnings.matches.map((match) => match.rule.id),
  )
}

describe('morphology and rule alignment', () => {
  it('fires infinitive base-verb warnings only for non-base morphology', () => {
    const flaggedText = 'They hoped to agreed too quickly.'
    const agreed = getToken(flaggedText, 'agreed')

    expect(agreed.morphology).toMatchObject({
      lemma: 'agree',
      provenance: 'regular',
      verb: {
        base: 'agree',
        form: 'past',
        isNonBaseForm: true,
        canBePast: true,
      },
    })
    expect(getRuleIds(flaggedText).has('INFINITIVE_BASE_VERB')).toBe(true)

    const quietText = 'We need to read the memo.'
    const read = getToken(quietText, 'read')

    expect(read.morphology).toMatchObject({
      lemma: 'read',
      provenance: 'ambiguous',
      isAmbiguous: true,
    })
    expect(getRuleIds(quietText).has('INFINITIVE_BASE_VERB')).toBe(false)
  })

  it('uses shared morphology for do-support base-verb recovery', () => {
    const flaggedText = 'Does he agreed too quickly?'
    const agreed = getToken(flaggedText, 'agreed')

    expect(agreed.morphology.verb).toMatchObject({
      base: 'agree',
      form: 'past',
      isNonBaseForm: true,
      canBePast: true,
    })
    expect(getRuleIds(flaggedText).has('DO_SUPPORT_BASE_VERB')).toBe(true)

    const quietText = 'Does he agree too quickly?'
    const agree = getToken(quietText, 'agree')

    expect(agree.morphology.verb).toMatchObject({
      base: 'agree',
      form: 'base',
      isNonBaseForm: false,
      canBeBase: true,
    })
    expect(getRuleIds(quietText).has('DO_SUPPORT_BASE_VERB')).toBe(false)
  })

  it('fires sentence-leading why warnings when morphology marks the verb as non-base', () => {
    const flaggedText = 'Why went home so early?'
    const went = getToken(flaggedText, 'went')

    expect(went.morphology).toMatchObject({
      lemma: 'go',
      provenance: 'irregular',
      verb: {
        base: 'go',
        form: 'past',
        isNonBaseForm: true,
        canBePast: true,
      },
    })
    expect(getRuleIds(flaggedText).has('QUESTION_LEAD_BASE_VERB')).toBe(true)

    const quietText = 'Why go home so early?'
    const go = getToken(quietText, 'go')

    expect(go.morphology.verb).toMatchObject({
      base: 'go',
      form: 'base',
      isNonBaseForm: false,
      canBeBase: true,
    })
    expect(getRuleIds(quietText).has('QUESTION_LEAD_BASE_VERB')).toBe(false)
  })

  it('keeps subject-verb agreement decisions consistent with third-person morphology', () => {
    const flaggedText = 'They writes every morning.'
    const pluralWrites = getToken(flaggedText, 'writes')

    expect(pluralWrites.morphology).toMatchObject({
      lemma: 'write',
      verb: {
        base: 'write',
        form: 'third-person-singular',
        isNonBaseForm: true,
        canBeThirdPersonSingular: true,
      },
    })
    expect(getRuleIds(flaggedText).has('SUBJECT_VERB_AGREEMENT')).toBe(true)

    const quietText = 'She writes every morning.'
    const singularWrites = getToken(quietText, 'writes')

    expect(singularWrites.morphology.verb).toMatchObject({
      base: 'write',
      form: 'third-person-singular',
      isNonBaseForm: true,
      canBeThirdPersonSingular: true,
    })
    expect(getRuleIds(quietText).has('SUBJECT_VERB_AGREEMENT')).toBe(false)
  })
})
