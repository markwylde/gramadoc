import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import { concisenessRules, fillerLeadInRule, repeatedHedgeRule } from './rule'

describe('repeatedHedgeRule', () => {
  it('flags adjacent hedge phrases that can be reduced', () => {
    const matches = runRule(
      repeatedHedgeRule,
      'Maybe perhaps we should leave now. It was kind of sort of surprising.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a single hedge phrase here.',
      replacements: [{ value: 'Maybe' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'kind of' }],
    })
  })

  it('does not flag when punctuation breaks the phrase apart', () => {
    expect(
      runRule(
        repeatedHedgeRule,
        'Maybe, perhaps, we should leave now. It was kind of, sort of, surprising.',
      ),
    ).toEqual([])
  })
})

describe('fillerLeadInRule', () => {
  it('flags filler lead-in phrases', () => {
    const matches = runRule(
      fillerLeadInRule,
      'It is important to note that the report is late. It should be noted that the draft is ready.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'This lead-in phrase is usually unnecessary.',
      replacements: [],
    })
  })

  it('does not flag ordinary clauses with the same words separated by punctuation', () => {
    expect(
      runRule(
        fillerLeadInRule,
        'It is important, to note, that details matter. It should be noted: that phrase is quoted here.',
      ),
    ).toEqual([])
  })
})

describe('concisenessRules', () => {
  it('exports the grouped conciseness rules', () => {
    expect(concisenessRules).toEqual([repeatedHedgeRule, fillerLeadInRule])
  })
})
