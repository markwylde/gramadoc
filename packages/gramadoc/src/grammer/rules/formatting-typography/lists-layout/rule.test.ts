import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  inconsistentNumberedListRule,
  listsLayoutRules,
  missingSpaceAfterListMarkerRule,
  mixedBulletMarkerRule,
} from './rule'

describe('mixedBulletMarkerRule', () => {
  it('flags mixed bullet markers in the same list block', () => {
    const matches = runRule(
      mixedBulletMarkerRule,
      '- First item\n* Second item\n- Third item',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use a consistent bullet marker throughout the list.',
      replacements: [{ value: '-' }],
    })
  })

  it('does not flag lists that already use one marker style', () => {
    expect(
      runRule(mixedBulletMarkerRule, '- First item\n- Second item'),
    ).toEqual([])
  })
})

describe('inconsistentNumberedListRule', () => {
  it('flags skipped or restarted numbering in simple lists', () => {
    const matches = runRule(
      inconsistentNumberedListRule,
      '1. First item\n3. Second item\n4. Third item\n1. Restarted item',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use sequential numbering in this list.',
      replacements: [{ value: '2' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: '5' }],
    })
  })

  it('does not flag sequential lists', () => {
    expect(
      runRule(
        inconsistentNumberedListRule,
        '1. First item\n2. Second item\n3. Third item',
      ),
    ).toEqual([])
  })
})

describe('missingSpaceAfterListMarkerRule', () => {
  it('flags bullet and numbered markers without a following space', () => {
    const matches = runRule(
      missingSpaceAfterListMarkerRule,
      '-Item one\n1.Item two',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Add a space after this list marker.',
      replacements: [{ value: ' ' }],
    })
  })

  it('does not flag normal list spacing or hyphenated prose', () => {
    expect(
      runRule(
        missingSpaceAfterListMarkerRule,
        '- Item one\n1. Item two\nA well-known phrase appears here.',
      ),
    ).toEqual([])
  })
})

describe('listsLayoutRules', () => {
  it('exports the grouped list and layout rules', () => {
    expect(listsLayoutRules).toEqual([
      mixedBulletMarkerRule,
      inconsistentNumberedListRule,
      missingSpaceAfterListMarkerRule,
    ])
  })
})
