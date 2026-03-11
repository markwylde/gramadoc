import { describe, expect, it } from 'vitest'
import { createPatternRule, findPatternMatches } from './patterns'
import { buildRuleCheckContext } from './utils'

describe('findPatternMatches', () => {
  it('supports regex steps, optional tokens, and bounded skipping', () => {
    const context = buildRuleCheckContext('We need to quickly analyze docs.')
    const matches = findPatternMatches(context, [
      { literal: 'to' },
      { type: 'skip', max: 1 },
      { regex: '^analy', field: 'normalized', capture: 'verb' },
      { literal: 'docs', optional: true },
    ])

    expect(matches).toHaveLength(1)
    expect(matches[0]?.captures.verb?.[0]?.value).toBe('analyze')
  })
})

describe('createPatternRule', () => {
  it('applies anti-patterns to suppress false positives', () => {
    const rule = createPatternRule({
      id: 'TEST_ARTICLE',
      name: 'Test Article',
      description: 'Checks a/an style behavior.',
      shortMessage: 'Grammar',
      issueType: 'grammar',
      category: {
        id: 'TEST',
        name: 'Test',
      },
      examples: {
        good: [],
        bad: [],
      },
      pattern: [
        { literal: 'a', capture: 'article' },
        { regex: '^[aeiou].*', capture: 'noun' },
      ],
      antiPatterns: [[{ literal: 'a' }, { literal: 'user' }]],
      reportCapture: 'article',
      filter: (match) =>
        /^\s+$/u.test(match.captures.article[0]?.trailingText ?? ''),
      message: 'Use "an".',
      replacements: ['an'],
    })

    const matches = rule.check(
      buildRuleCheckContext('a apple and a user account'),
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use "an".',
      replacements: [{ value: 'an' }],
    })
  })

  it('supports multiple alternative patterns in one declarative rule', () => {
    const rule = createPatternRule({
      id: 'TEST_ALT_PATTERNS',
      name: 'Test Alt Patterns',
      description: 'Checks multiple pattern alternatives.',
      shortMessage: 'Style',
      issueType: 'style',
      category: {
        id: 'TEST',
        name: 'Test',
      },
      examples: {
        good: [],
        bad: [],
      },
      pattern: [
        [{ literal: 'gonna', capture: 'word' }],
        [{ literal: 'wanna', capture: 'word' }],
      ],
      reportCapture: 'word',
      message: 'Use a less informal phrasing here.',
      replacements: (match) => [match.captures.word[0]?.value ?? ''],
    })

    const matches = rule.check(
      buildRuleCheckContext('We are gonna leave and wanna help.'),
    )

    expect(matches).toHaveLength(2)
    expect(matches.map((match) => match.offset)).toEqual([7, 23])
  })
})
