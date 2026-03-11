import { describe, expect, it } from 'vitest'
import { analyzeText } from '../../../utils'
import { runRule } from '../../testUtils'
import { looseEPrimeRule, strictEPrimeRule } from './rule'

describe('strictEPrimeRule', () => {
  it('stays disabled by default', () => {
    expect(runRule(strictEPrimeRule, 'The release is ready.')).toEqual([])
  })

  it('flags every direct be-form when the strict pack is enabled', () => {
    const matches = runRule(
      strictEPrimeRule,
      'The launch is late and the docs were unclear.',
      {
        enabledRulePacks: ['creative-writing/e-prime-strict'],
      },
    )

    expect(matches).toHaveLength(2)
    expect(matches.map((match) => match.rule.id)).toEqual([
      'E_PRIME_STRICT',
      'E_PRIME_STRICT',
    ])
  })

  it('does not activate the loose rule when only the strict pack is enabled', () => {
    const matches = analyzeText('There are two issues in the draft.', {
      enabledRulePacks: ['creative-writing/e-prime-strict'],
    }).warnings.matches

    expect(matches.map((match) => match.rule.id)).toEqual(['E_PRIME_STRICT'])
  })
})

describe('looseEPrimeRule', () => {
  it('stays disabled by default', () => {
    expect(
      runRule(looseEPrimeRule, 'There are two issues in the draft.'),
    ).toEqual([])
  })

  it('flags existential openings when the loose pack is enabled', () => {
    const matches = runRule(
      looseEPrimeRule,
      'There are two issues in the draft.',
      {
        enabledRulePacks: ['creative-writing/e-prime-loose'],
      },
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.rule.id).toBe('E_PRIME_LOOSE')
    expect(matches[0]?.message).toContain('there is/are')
  })

  it('flags simple copular be-constructions but ignores progressive verb phrases', () => {
    const matches = runRule(
      looseEPrimeRule,
      'The report is very clear, and the team is running tests.',
      {
        enabledRulePacks: ['creative-writing/e-prime-loose'],
      },
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.offset).toBe('The report '.length)
  })

  it('stays narrower than the strict pack on the same sentence', () => {
    const text =
      'There are two release blockers, and the team is being briefed.'

    const strictMatches = analyzeText(text, {
      enabledRulePacks: ['creative-writing/e-prime-strict'],
    }).warnings.matches.filter((match) => match.rule.id.startsWith('E_PRIME_'))
    const looseMatches = analyzeText(text, {
      enabledRulePacks: ['creative-writing/e-prime-loose'],
    }).warnings.matches.filter((match) => match.rule.id.startsWith('E_PRIME_'))

    expect(strictMatches.map((match) => match.rule.id)).toEqual([
      'E_PRIME_STRICT',
      'E_PRIME_STRICT',
      'E_PRIME_STRICT',
    ])
    expect(looseMatches.map((match) => match.rule.id)).toEqual([
      'E_PRIME_LOOSE',
    ])
    expect(strictMatches.length).toBeGreaterThan(looseMatches.length)
  })
})

describe('E-Prime integration', () => {
  it('does not affect default analyzer output', () => {
    const text =
      'There are two issues in the draft, and the summary is unclear.'
    const baseline = analyzeText(text)
    const withStrict = analyzeText(text, {
      enabledRulePacks: ['creative-writing/e-prime-strict'],
    })
    const withLoose = analyzeText(text, {
      enabledRulePacks: ['creative-writing/e-prime-loose'],
    })

    expect(
      baseline.warnings.matches.map((match) => match.rule.id),
    ).not.toContain('E_PRIME_STRICT')
    expect(
      baseline.warnings.matches.map((match) => match.rule.id),
    ).not.toContain('E_PRIME_LOOSE')
    expect(withStrict.warnings.matches.length).toBeGreaterThan(
      baseline.warnings.matches.length,
    )
    expect(withLoose.warnings.matches.length).toBeGreaterThan(
      baseline.warnings.matches.length,
    )
  })

  it('surfaces the strict and loose packs independently', () => {
    const strict = analyzeText('The release is late.', {
      enabledRulePacks: ['creative-writing/e-prime-strict'],
    }).warnings.matches
    const loose = analyzeText('There are two issues in the draft.', {
      enabledRulePacks: ['creative-writing/e-prime-loose'],
    }).warnings.matches

    expect(strict.map((match) => match.rule.id)).toContain('E_PRIME_STRICT')
    expect(loose.map((match) => match.rule.id)).toContain('E_PRIME_LOOSE')
  })
})
