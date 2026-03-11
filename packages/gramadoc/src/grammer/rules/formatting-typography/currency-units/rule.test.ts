import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  currencyCodeSpacingRule,
  currencyUnitsRules,
  numberUnitSpacingRule,
  repeatedUnitSymbolRule,
} from './rule'

describe('currencyCodeSpacingRule', () => {
  it('flags currency codes attached directly to numbers', () => {
    const matches = runRule(
      currencyCodeSpacingRule,
      'The refund was USD20 and the invoice total was EUR30.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Add a space between the currency code and the amount.',
      replacements: [{ value: ' ' }],
    })
  })

  it('does not flag currency codes that already have spacing or unrelated acronyms', () => {
    expect(
      runRule(
        currencyCodeSpacingRule,
        'The refund was USD 20 and the API handled 30 requests.',
      ),
    ).toEqual([])
  })
})

describe('repeatedUnitSymbolRule', () => {
  it('flags duplicated unit symbols', () => {
    const matches = runRule(
      repeatedUnitSymbolRule,
      'The package weighed 10 kg kg and the route covered 5 km km.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use the unit symbol only once here.',
      replacements: [{ value: '' }],
    })
  })

  it('does not flag normal unit usage or repeated prose words', () => {
    expect(
      runRule(
        repeatedUnitSymbolRule,
        'The package weighed 10 kg. We said go go afterward.',
      ),
    ).toEqual([])
  })
})

describe('numberUnitSpacingRule', () => {
  it('flags missing spaces between numbers and units', () => {
    const matches = runRule(
      numberUnitSpacingRule,
      'The package weighed 10kg and the route covered 5km.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Add a space between the number and the unit.',
      replacements: [{ value: ' ' }],
    })
  })

  it('does not flag numbers that already have spacing', () => {
    expect(
      runRule(
        numberUnitSpacingRule,
        'The package weighed 10 kg and the route covered 5 km.',
      ),
    ).toEqual([])
  })
})

describe('currencyUnitsRules', () => {
  it('exports the grouped currency and units rules', () => {
    expect(currencyUnitsRules).toEqual([
      currencyCodeSpacingRule,
      repeatedUnitSymbolRule,
      numberUnitSpacingRule,
    ])
  })
})
