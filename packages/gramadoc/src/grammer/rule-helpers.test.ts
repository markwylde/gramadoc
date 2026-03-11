import { describe, expect, it } from 'vitest'
import {
  type LexicalTokenRuleResource,
  validateLexicalRuleResources,
} from './resources/lexical-rules'
import {
  findLexicalPhraseMatches,
  findLexicalTokenMatches,
  findTokenPhraseMatches,
  parseTokenPhrase,
} from './rule-helpers'
import { buildRuleCheckContext } from './utils'

describe('parseTokenPhrase', () => {
  it('tracks whether phrase gaps are spaces or hyphens', () => {
    expect(parseTokenPhrase('web site')).toMatchObject({
      words: ['web', 'site'],
      gaps: ['space'],
    })
    expect(parseTokenPhrase('web-site')).toMatchObject({
      words: ['web', 'site'],
      gaps: ['hyphen'],
    })
  })
})

describe('findTokenPhraseMatches', () => {
  it('matches phrases with the expected separators only', () => {
    const context = buildRuleCheckContext(
      'The web site, web-site, and website versions all appeared.',
    )

    const openMatches = findTokenPhraseMatches(context, [
      { phrase: 'web site' },
    ])
    const hyphenMatches = findTokenPhraseMatches(context, [
      { phrase: 'web-site' },
    ])

    expect(openMatches).toHaveLength(1)
    expect(openMatches[0]?.tokens.map((token) => token.value)).toEqual([
      'web',
      'site',
    ])
    expect(hyphenMatches).toHaveLength(1)
    expect(hyphenMatches[0]?.tokens.map((token) => token.value)).toEqual([
      'web',
      'site',
    ])
  })
})

describe('lexical rule infrastructure', () => {
  it('validates shared lexical resource metadata', () => {
    const issues = validateLexicalRuleResources([
      {
        id: 'KEEP_EMPTY',
        message: '',
        metadata: {
          category: '',
          severity: 'warning',
          allowlist: [''],
          antiPatterns: [''],
          variantRestrictions: ['en-AU' as 'en'],
          exampleCoverage: {
            good: [],
            bad: ['bad'],
          },
        },
      },
      {
        id: 'KEEP_EMPTY',
        message: 'Repeated id',
        metadata: {
          category: 'replacement',
          severity: 'suggestion',
          exampleCoverage: {
            good: ['good'],
            bad: ['bad'],
          },
        },
      },
    ])

    expect(issues.map((issue) => issue.message)).toEqual([
      'Lexical rule messages must not be blank.',
      'Lexical rule metadata requires a category.',
      'Allowlist entries must not be blank.',
      'Anti-pattern entries must not be blank.',
      'Variant restrictions must use supported English codes.',
      'Example coverage must include at least one good and one bad example.',
      'Lexical rule ids must be unique within a pack.',
    ])
  })

  it('supports guarded phrase-level lexical matches', () => {
    const context = buildRuleCheckContext(
      'We log in to the platform. Log in before you deploy.',
    )

    const matches = findLexicalPhraseMatches(context, [
      {
        id: 'LOGIN_COMMAND',
        phrase: 'log in',
        message: 'Use "log in" for the verb.',
        replacements: ['log in'],
        metadata: {
          category: 'replacement',
          severity: 'warning',
          variantRestrictions: ['en'],
          exampleCoverage: {
            good: ['Log in before you deploy.'],
            bad: ['Use the login page link.'],
          },
        },
        guard: {
          nextTokenValues: ['before'],
        },
      },
    ])

    expect(matches).toHaveLength(1)
    expect(matches[0]?.entry.id).toBe('LOGIN_COMMAND')
    expect(matches[0]?.tokens.map((token) => token.value)).toEqual([
      'Log',
      'in',
    ])
  })

  it('supports single-token lexical matches with variant restrictions', () => {
    const gbContext = buildRuleCheckContext(
      'We practise functional TypeScript every day.',
      { languageCode: 'en-GB' },
    )
    const usContext = buildRuleCheckContext(
      'We practise functional TypeScript every day.',
      { languageCode: 'en-US' },
    )

    const entries = [
      {
        id: 'PRACTISE_US',
        token: 'practise',
        message: 'Prefer the US spelling in this mode.',
        replacements: ['practice'],
        metadata: {
          category: 'replacement',
          severity: 'warning',
          variantRestrictions: ['en-US'],
          exampleCoverage: {
            good: ['We practice every day.'],
            bad: ['We practise every day.'],
          },
        },
      },
    ] satisfies LexicalTokenRuleResource[]

    expect(findLexicalTokenMatches(gbContext, entries)).toEqual([])
    expect(findLexicalTokenMatches(usContext, entries)).toHaveLength(1)
  })
})
