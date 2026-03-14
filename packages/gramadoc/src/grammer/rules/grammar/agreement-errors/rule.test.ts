import { describe, expect, it } from 'vitest'
import { buildRuleCheckContext } from '../../../utils'
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

  it('does not treat sentence-initial frequency adverbs as singular subjects', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Sometimes I think that I can fly.',
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

  it('recovers plural-subject mismatches with sentence-final and complement predicates', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'These plans works. The results seems wrong. Many teams depends on this.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Use "work" with "plans".',
      replacements: [{ value: 'work' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "seem" with "results".',
      replacements: [{ value: 'seem' }],
    })
    expect(matches[2]).toMatchObject({
      message: 'Use "depend" with "teams".',
      replacements: [{ value: 'depend' }],
    })
  })

  it('recovers agreement mismatches across longer subject phrases and embedded clauses', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      [
        'Archaeologists around the world has recently uncovered several remarkable discoveries.',
        'Many of the coffins appears to belong to priests and officials.',
        'The chambers contains pottery fragments and tools.',
        'Still, archaeologists caution that discoveries like these often raises as many questions as it answers.',
        'A process that can takes years before definitive conclusions are reached.',
        'The demand for modern offices and apartments are increasing.',
        'The project was promoted as an innovative solution that include three towers connected by sky bridges.',
        'Many cities continues to push forward with ambitious construction plans.',
      ].join(' '),
    )

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          replacements: [{ value: 'have' }],
        }),
        expect.objectContaining({
          replacements: [{ value: 'appear' }],
        }),
        expect.objectContaining({
          replacements: [{ value: 'contain' }],
        }),
        expect.objectContaining({
          replacements: [{ value: 'raise' }],
        }),
        expect.objectContaining({
          replacements: [{ value: 'take' }],
        }),
        expect.objectContaining({
          replacements: [{ value: 'is' }],
        }),
        expect.objectContaining({
          replacements: [{ value: 'includes' }],
        }),
        expect.objectContaining({
          replacements: [{ value: 'continue' }],
        }),
      ]),
    )
  })

  it('keeps clean matrix-plus-content-clause sentences quiet when shared clause subjects are sufficient', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Sometimes the team thinks that the plan works. I know that the engineers agree on the fix.',
      ),
    ).toEqual([])
  })

  it('re-expands to singular local subjects when the bare verb is a clean predicate', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'Every update make it worse. Each deploy fix one thing. This feature help new users. A reminder keep me honest. One of the changes make sense.',
    )

    expect(matches).toHaveLength(5)
    expect(matches[0]).toMatchObject({
      message: 'Use "makes" with "update".',
      replacements: [{ value: 'makes' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "fixes" with "deploy".',
      replacements: [{ value: 'fixes' }],
    })
    expect(matches[2]).toMatchObject({
      message: 'Use "helps" with "feature".',
      replacements: [{ value: 'helps' }],
    })
    expect(matches[3]).toMatchObject({
      message: 'Use "keeps" with "reminder".',
      replacements: [{ value: 'keeps' }],
    })
    expect(matches[4]).toMatchObject({
      message: 'Use "makes" with "One".',
      replacements: [{ value: 'makes' }],
    })
  })

  it('keeps bounded local recovery for bare-verb partitives while staying quiet on the correct pair', () => {
    const mismatchMatches = runRule(
      subjectVerbAgreementRule,
      'One of the changes make sense.',
    )

    expect(mismatchMatches).toHaveLength(1)
    expect(mismatchMatches[0]).toMatchObject({
      message: 'Use "makes" with "One".',
      replacements: [{ value: 'makes' }],
    })
    expect(mismatchMatches[0]?.diagnostics?.evidence).toContain(
      'subject:local:one:singular',
    )

    expect(
      runRule(
        subjectVerbAgreementRule,
        'One of the changes makes sense.',
      ),
    ).toEqual([])
  })

  it('stays quiet on coordinated sentences where the local singular subject matches', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        "I can't stand it and every update makes it worse. We noticed it and each deploy fixes one thing. I know it and every reminder helps. We can't fix it and each hotpatch resolves one issue. I don't mind it and every status update helps.",
      ),
    ).toEqual([])
  })

  it('stays quiet on grammatical clauses built around contracted auxiliaries', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        "I can't stand delays. We don't like regressions. She won't listen.",
      ),
    ).toEqual([])
  })

  it('does not reintroduce bare-verb false positives after auxiliaries or modals', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        "I can't stand delays. We don't like regressions. She won't listen. Every user can log in. This report should read clearly.",
      ),
    ).toEqual([])
  })

  it('still flags mismatches when the finite verb is a contracted auxiliary', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      "They doesn't care. She don't agree.",
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "don\'t" with "They".',
      replacements: [{ value: "don't" }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Use "doesn\'t" with "She".',
      replacements: [{ value: "doesn't" }],
    })
  })

  it('uses the local subject phrase for regular s-form verbs', () => {
    const context = buildRuleCheckContext(
      "I can't stand it and every update makes it worse.",
    )

    expect(context.clauseRanges.map((clause) => clause.text)).toEqual([
      "I can't stand it",
      'and every update makes it worse',
    ])
    expect(
      context.tokens.map((token) => `${token.value}:${token.clausePart}`),
    ).toEqual([
      'I:subject',
      "can't:predicate",
      'stand:predicate',
      'it:predicate',
      'and:lead',
      'every:subject',
      'update:predicate',
      'makes:predicate',
      'it:predicate',
      'worse:predicate',
    ])
    expect(runRule(subjectVerbAgreementRule, context.text)).toEqual([])
  })

  it('re-expands coordinated local subjects for regular finite verbs', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'The user and admin approves the change.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "approve" with "admin".',
      replacements: [{ value: 'approve' }],
    })
  })

  it('prefers shared clause subjects for simple finite-form agreement when local expansion is not needed', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'Reports was confusing.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "were" with "Reports".',
      replacements: [{ value: 'were' }],
    })
    expect(matches[0]?.diagnostics?.evidence).toContain(
      'subject:clause:reports:plural',
    )
  })

  it('does not flag was/were agreement on multi-word proper names', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Sun Microsystems was a familiar name. Bell Labs was highly influential.',
      ),
    ).toEqual([])
  })

  it('does not treat capitalized lead-ins followed by pronouns as proper-name subjects', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Today I think that we can ship. Tomorrow I think that I can leave.',
      ),
    ).toEqual([])
  })

  it('stays quiet on singular series nouns and titled works with internal of-phrases', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'A series of updates is live. The series of tests is complete. The Chronicles of Narnia is on the shelf.',
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

  it('still catches agreement errors inside clean that-clauses', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'I know that the engineers agrees on the fix.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "agree" with "engineers".',
      replacements: [{ value: 'agree' }],
    })
  })

  it('still catches plural lexical heads inside determiner-led noun phrases', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'The patch notes explains the fix.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "explain" with "notes".',
      replacements: [{ value: 'explain' }],
    })
  })

  it('reuses sentence fallback when a coordinated clause starts mid-sentence', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'Architects says that the demand for modern offices and apartments are increasing.',
    )

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Use "say" with "Architects".',
          replacements: [{ value: 'say' }],
        }),
        expect.objectContaining({
          message: 'Use "is" with "demand".',
          replacements: [{ value: 'is' }],
        }),
      ]),
    )
  })

  it('uses the relative-clause antecedent as the subject of embedded predicates', () => {
    const matches = runRule(
      subjectVerbAgreementRule,
      'One example comes from a recently opened residential complex that include three towers connected by sky bridges.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "includes" with "complex".',
      replacements: [{ value: 'includes' }],
    })
  })

  it('stays quiet when unknown words only provide weak local evidence', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        'Every frobnicator glips the queue. These frobnicators glips the queue.',
      ),
    ).toEqual([])
  })

  it('stays quiet on recovered broad-coverage counterparts and known risky correct prose', () => {
    expect(
      runRule(
        subjectVerbAgreementRule,
        "These plans work. The results seem wrong. Many teams depend on this. I can't stand it and every update makes it worse.",
      ),
    ).toEqual([])
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
