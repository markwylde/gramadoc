import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  datesTimesRules,
  duplicateMeridiemRule,
  repeatedDateSeparatorRule,
  repeatedTimeSeparatorRule,
  twentyFourHourMeridiemRule,
} from './rule'

describe('duplicateMeridiemRule', () => {
  it('flags times that repeat AM/PM markers', () => {
    const matches = runRule(
      duplicateMeridiemRule,
      'Meet at 10 a.m. pm tomorrow. The backup call is at 3pm am.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use only one AM/PM marker for this time.',
      replacements: [{ value: '' }],
    })
  })

  it('does not flag valid meridiem forms', () => {
    expect(
      runRule(
        duplicateMeridiemRule,
        'Meet at 10 a.m. tomorrow. The backup call is at 3pm.',
      ),
    ).toEqual([])
  })
})

describe('repeatedTimeSeparatorRule', () => {
  it('flags repeated separators in time expressions', () => {
    const matches = runRule(
      repeatedTimeSeparatorRule,
      'The call starts at 10::30 and ends at 9..45.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a single separator in this time.',
      replacements: [{ value: ':' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: '.' }],
    })
  })

  it('does not flag normal times or decimals', () => {
    expect(
      runRule(
        repeatedTimeSeparatorRule,
        'The call starts at 10:30 and the value is 9.45.',
      ),
    ).toEqual([])
  })
})

describe('repeatedDateSeparatorRule', () => {
  it('flags repeated separators in date expressions', () => {
    const matches = runRule(
      repeatedDateSeparatorRule,
      'The deadline is 03//09//2026 and the archive starts on 2026--03--09.',
    )

    expect(matches).toHaveLength(4)
    expect(matches[0]).toMatchObject({
      message: 'Use a single separator in this date.',
      replacements: [{ value: '/' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: '-' }],
    })
  })

  it('does not flag dates that already use single separators', () => {
    expect(
      runRule(
        repeatedDateSeparatorRule,
        'The deadline is 03/09/2026 and the archive starts on 2026-03-09.',
      ),
    ).toEqual([])
  })
})

describe('twentyFourHourMeridiemRule', () => {
  it('flags 24-hour times that also include AM or PM markers', () => {
    const matches = runRule(
      twentyFourHourMeridiemRule,
      'The backup call starts at 18:30 pm and the handoff ends at 13 a.m.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Do not combine a 24-hour time with an AM/PM marker.',
      replacements: [{ value: '' }],
    })
  })

  it('does not flag valid 12-hour or 24-hour time forms', () => {
    expect(
      runRule(
        twentyFourHourMeridiemRule,
        'The backup call starts at 18:30 and the handoff ends at 6:30 p.m.',
      ),
    ).toEqual([])
  })
})

describe('datesTimesRules', () => {
  it('exports the grouped dates and times rules', () => {
    expect(datesTimesRules).toEqual([
      duplicateMeridiemRule,
      repeatedTimeSeparatorRule,
      repeatedDateSeparatorRule,
      twentyFourHourMeridiemRule,
    ])
  })
})
