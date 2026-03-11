import { describe, expect, it } from 'vitest'
import { analyzeText } from '../../../utils'
import { runRule } from '../../testUtils'
import { l2FalseFriendsRule, l2FalseFriendsRules } from './rule'

describe('l2FalseFriendsRule', () => {
  it('stays disabled by default', () => {
    expect(
      runRule(l2FalseFriendsRule, 'I assisted to the conference yesterday.'),
    ).toEqual([])
  })

  it('flags the first French L1 pack when explicitly enabled', () => {
    const matches = runRule(
      l2FalseFriendsRule,
      'We assisted to the conference yesterday, and she demanded them to update the draft.',
      {
        enabledRulePacks: ['l2-false-friends/fr'],
        nativeLanguageProfile: 'l1/fr',
      },
    )

    expect(matches).toHaveLength(2)
    expect(matches.map((match) => match.replacements[0]?.value)).toEqual([
      'attended the conference',
      'asked them to update',
    ])
    expect(matches.map((match) => match.rule.id)).toEqual([
      'L2_FALSE_FRIENDS',
      'L2_FALSE_FRIENDS',
    ])
  })

  it('supports additional native-language packs after the first format is stable', () => {
    const matches = runRule(
      l2FalseFriendsRule,
      'Review the actual roadmap before launch.',
      {
        enabledRulePacks: ['l2-false-friends/es'],
        nativeLanguageProfile: 'l1/es',
      },
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.replacements[0]?.value).toBe('current')
  })

  it('flags learner-oriented grammar-transfer patterns for the Spanish pack', () => {
    const matches = runRule(
      l2FalseFriendsRule,
      'We depend of that draft and discuss about timelines every week.',
      {
        enabledRulePacks: ['l2-false-friends/es'],
        nativeLanguageProfile: 'l1/es',
      },
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use "depend on" in English after this verb.',
      replacements: [{ value: 'on' }],
    })
    expect(matches[1]).toMatchObject({
      message:
        'Use "discuss" directly with the topic instead of "discuss about".',
      replacements: [{ value: '' }],
    })
  })

  it('stays quiet for legitimate English wording and unrelated profiles', () => {
    const englishMatches = runRule(
      l2FalseFriendsRule,
      'The assistant supported the workshop, and the child is sensitive to noise.',
      {
        enabledRulePacks: ['l2-false-friends/fr'],
        nativeLanguageProfile: 'l1/fr',
      },
    )
    const mismatchedProfileMatches = runRule(
      l2FalseFriendsRule,
      'I assisted to the conference yesterday.',
      {
        enabledRulePacks: ['l2-false-friends/fr'],
        nativeLanguageProfile: 'l1/de',
      },
    )
    const quotedMatches = runRule(
      l2FalseFriendsRule,
      'The teacher wrote "depend of" on the board and explained why "discuss about" sounds unnatural in English.',
      {
        enabledRulePacks: ['l2-false-friends/es'],
        nativeLanguageProfile: 'l1/es',
      },
    )
    const correctTransferMatches = runRule(
      l2FalseFriendsRule,
      'We depend on that draft and discuss timelines every week.',
      {
        enabledRulePacks: ['l2-false-friends/es'],
        nativeLanguageProfile: 'l1/es',
      },
    )

    expect(englishMatches).toEqual([])
    expect(mismatchedProfileMatches).toEqual([])
    expect(quotedMatches).toEqual([])
    expect(correctTransferMatches).toEqual([])
  })

  it('supports additional native-language packs once the format is stable', () => {
    const matches = runRule(
      l2FalseFriendsRule,
      'The actual version is still in staging.',
      {
        enabledRulePacks: ['l2-false-friends/es'],
        nativeLanguageProfile: 'l1/es',
      },
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.replacements).toEqual([{ value: 'current' }])
  })
})

describe('L2 false-friend integration', () => {
  it('does not affect default analyzer output', () => {
    const baseline = analyzeText('I assisted the team during the workshop.')
      .warnings.matches

    expect(baseline.map((match) => match.rule.id)).not.toContain(
      'L2_FALSE_FRIENDS',
    )
  })
})

describe('l2FalseFriendsRules', () => {
  it('exports the grouped L2 false-friend rule', () => {
    expect(l2FalseFriendsRules).toEqual([l2FalseFriendsRule])
  })
})
