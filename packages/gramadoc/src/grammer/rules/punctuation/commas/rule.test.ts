import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  commaSpliceRule,
  missingCommaAfterIntroductoryPhraseRule,
} from './rule'

describe('missingCommaAfterIntroductoryPhraseRule', () => {
  it('flags curated introductory phrases without commas', () => {
    const matches = runRule(
      missingCommaAfterIntroductoryPhraseRule,
      'However we changed course. For example this sentence needs a comma.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Add a comma after "However".',
      replacements: [{ value: 'However,' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'For example,' }],
    })
  })

  it('does not flag phrases that already use commas or lowercase continuations', () => {
    expect(
      runRule(
        missingCommaAfterIntroductoryPhraseRule,
        'However, we changed course. The example is in fact short.',
      ),
    ).toEqual([])
  })

  it('handles introductory phrases at the start of a new line', () => {
    const matches = runRule(
      missingCommaAfterIntroductoryPhraseRule,
      'The first line is fine.\nMeanwhile we kept working.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: 'Meanwhile,' }],
    })
  })
})

describe('commaSpliceRule', () => {
  it('flags simple comma splices between two clauses', () => {
    const matches = runRule(
      commaSpliceRule,
      'I went home, I cooked dinner. The report was late, it missed the deadline.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'This comma may be joining two complete sentences.',
      replacements: [{ value: '.' }],
    })
  })

  it('flags determiner-led clauses after the comma', () => {
    const matches = runRule(
      commaSpliceRule,
      'The report was late, the deadline slipped.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'This comma may be joining two complete sentences.',
      replacements: [{ value: '.' }],
    })
  })

  it('does not flag commas followed by coordinating conjunctions', () => {
    expect(
      runRule(
        commaSpliceRule,
        'I went home, and I cooked dinner. She stayed, but he left.',
      ),
    ).toEqual([])
  })

  it('does not flag ordinary list commas', () => {
    expect(
      runRule(
        commaSpliceRule,
        'We packed apples, oranges, and pears for lunch.',
      ),
    ).toEqual([])
  })

  it('does not flag appositive phrases with later verbs', () => {
    expect(
      runRule(commaSpliceRule, 'My brother, a doctor, arrived yesterday.'),
    ).toEqual([])
  })

  it('does not flag nonrestrictive relative clauses after a comma', () => {
    expect(
      runRule(
        commaSpliceRule,
        'UAE Minister of State Lana Nusseibeh condemned Iran, which has included strikes aimed at civilian infrastructure.',
      ),
    ).toEqual([])
  })

  it('does not flag subordinate clauses introduced after a comma', () => {
    expect(
      runRule(
        commaSpliceRule,
        'We postponed the launch, because the final checks were incomplete.',
      ),
    ).toEqual([])
  })

  it('does not flag short reporting attributions after a comma', () => {
    expect(
      runRule(
        commaSpliceRule,
        'The UAE did not want this war but would defend itself, she added, accusing Iran of attacking the peacemakers in the region.',
      ),
    ).toEqual([])
  })

  it('does not flag introductory participial or prepositional phrases before the main clause', () => {
    expect(
      runRule(
        commaSpliceRule,
        'In a statement posted online, his family said they wanted to keep the circumstances private.',
      ),
    ).toEqual([])
  })

  it('does not flag quotation attributions after a quoted sentence', () => {
    expect(
      runRule(
        commaSpliceRule,
        '"Though our hearts are heavy, we remain grateful for every year we shared," the family wrote.',
      ),
    ).toEqual([])
  })

  it('uses clause boundaries so introductory commas do not hide later comma splices', () => {
    const matches = runRule(
      commaSpliceRule,
      'After the audit, the report was late, the deadline slipped.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'This comma may be joining two complete sentences.',
      replacements: [{ value: '.' }],
    })
  })
})
