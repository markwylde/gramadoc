import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import { subjectVerbAgreementRule, thereIsAreAgreementRule } from './rule'

describe('subjectVerbAgreementRule', () => {
  it('flags simple subject-verb agreement mismatches', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'They is ready. Reports is confusing. She have notes.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Use "are" with "They".',
      replacements: [{ value: 'are' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'are' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'has' }],
    })
  })

  it('does not flag matching subject-verb pairs', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'They are ready. This report is clear. She has notes. This is exciting. These are exciting. My email address is mark@wex.com.',
      ),
    ).toEqual([])
  })

  it('ignores pairs separated by punctuation instead of whitespace', () => {
    expect(runRule(subjectVerbAgreementRule, 'They, are ready.')).toEqual([])
  })

  it('handles this/these verb agreement without creating a correction loop', () => {
    const pluralMismatch = runRule(
      subjectVerbAgreementRule,
      'These is exciting.',
    )
    const singularMismatch = runRule(
      subjectVerbAgreementRule,
      'This are exciting.',
    )

    expect(pluralMismatch).toHaveLength(1)
    expect(pluralMismatch[0]).toMatchObject({
      message: 'Use "are" with "These".',
      replacements: [{ value: 'are' }],
    })

    expect(singularMismatch).toHaveLength(1)
    expect(singularMismatch[0]).toMatchObject({
      message: 'Use "is" with "This".',
      replacements: [{ value: 'is' }],
    })
  })

  it('does not treat question words as subjects in inverted questions', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        '"Dario, why are you not talking to me?" I do not know why he is upset.',
      ),
    ).toEqual([])
  })

  it('flags high-confidence inverted questions with singular indefinite subjects', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'Why do no one care about me? Why do nobody listen?',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "does" with "no one".',
      replacements: [{ value: 'does' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "does" with "nobody".',
      replacements: [{ value: 'does' }],
    })
  })

  it('keeps plural inverted questions quiet', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Why do these alerts keep firing? Why are those reports still delayed?',
      ),
    ).toEqual([])
  })

  it('does not treat existential or modal helper words as subjects', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'There are several reasons to wait. We should have left earlier. They might have missed the train.',
      ),
    ).toEqual([])
  })

  it('does not treat prepositional objects or infinitive markers as subjects', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Why people get scared when they look at spiders is to do with evolution.',
      ),
    ).toEqual([])
  })

  it('flags regular third-person singular verbs after plural subjects', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'These reminds me of band camp. They walks quickly.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "remind" with "These".',
      replacements: [{ value: 'remind' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "walk" with "They".',
      replacements: [{ value: 'walk' }],
    })
  })

  it('does not flag was/were agreement on multi-word proper names', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Sun Microsystems was a familiar name. Bell Labs was highly influential.',
      ),
    ).toEqual([])
  })

  it('still flags clear plural noun mismatches with was/were', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'Reports was confusing. Engineers was ready.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "were" with "Reports".',
      replacements: [{ value: 'were' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "were" with "Engineers".',
      replacements: [{ value: 'were' }],
    })
  })

  it('uses clause metadata to skip lead-ins and keep the real subject', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'After a long review, the reports is ready. After a short review, the report is ready.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "are" with "reports".',
      replacements: [{ value: 'are' }],
    })
  })
})

describe('thereIsAreAgreementRule', () => {
  it('flags mismatches in simple there-is/there-are constructions', () => {
    const matches = runRule(
      thereIsAreAgreementRule,
      'There is many reasons to wait. There are a problem here.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "are" in this "there is" construction.',
      replacements: [{ value: 'are' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'is' }],
    })
  })

  it('does not flag valid singular and plural there-constructions', () => {
    expect(
      runRule(
        thereIsAreAgreementRule,
        'There are several reasons to wait. There is one problem here.',
      ),
    ).toEqual([])
  })

  it('treats singular irregular nouns like "news" as singular', () => {
    expect(
      runRule(
        thereIsAreAgreementRule,
        'There is news to share. There are news to share.',
      ),
    ).toHaveLength(1)
  })
})
