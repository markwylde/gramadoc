import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  spacingInsideQuotationMarksRule,
  unmatchedDoubleQuotationMarkRule,
} from './rule'

describe('unmatchedDoubleQuotationMarkRule', () => {
  it('flags an opening double quote that is never closed', () => {
    const matches = runRule(
      unmatchedDoubleQuotationMarkRule,
      'She said "hello before leaving.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'This quotation mark appears to be missing its closing pair.',
      replacements: [{ value: '"' }],
    })
  })

  it('does not flag balanced quotation marks', () => {
    expect(
      runRule(
        unmatchedDoubleQuotationMarkRule,
        'She said "hello" before leaving.',
      ),
    ).toEqual([])
  })
})

describe('spacingInsideQuotationMarksRule', () => {
  it('flags spaces just inside paired quotation marks', () => {
    const matches = spacingInsideQuotationMarksRule.check({
      text: 'She said " hello " before leaving.',
    } as never)

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Remove the space just inside the opening quotation mark.',
      replacements: [{ value: '"' }],
    })
    expect(matches[1]).toMatchObject({
      message: 'Remove the space just inside the closing quotation mark.',
      replacements: [{ value: '"' }],
    })
  })

  it('does not flag quotes that already hug the quoted text', () => {
    expect(
      runRule(
        spacingInsideQuotationMarksRule,
        'She said "hello" before leaving.',
      ),
    ).toEqual([])
  })

  it('uses the quote-pair analysis for curly quotation marks too', () => {
    const matches = runRule(
      spacingInsideQuotationMarksRule,
      'She said “ hello ” before leaving.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: '“' }])
    expect(matches[1].replacements).toEqual([{ value: '”' }])
  })

  it('also flags stray spaces inside actual single-quote pairs', () => {
    const matches = runRule(
      spacingInsideQuotationMarksRule,
      "She called it ' hello ' in the notes.",
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: "'" }])
    expect(matches[1].replacements).toEqual([{ value: "'" }])
  })

  it('ignores apostrophes because they are not double quotation marks', () => {
    expect(
      runRule(
        spacingInsideQuotationMarksRule,
        "It's fine to leave apostrophes alone.",
      ),
    ).toEqual([])
  })
})
