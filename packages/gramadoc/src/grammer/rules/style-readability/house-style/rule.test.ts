import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import { houseStyleRules, houseStyleTermsRule } from './rule'

describe('houseStyleTermsRule', () => {
  it('flags preferred brand casing and product naming conventions', () => {
    const matches = runRule(
      houseStyleTermsRule,
      'Github Actions runs our Typescript checks with Javascript helpers.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Use the product name "GitHub Actions".',
      replacements: [{ value: 'GitHub Actions' }],
    })
    expect(matches[1]?.replacements).toEqual([{ value: 'TypeScript' }])
    expect(matches[2]?.replacements).toEqual([{ value: 'JavaScript' }])
  })

  it('flags legacy names and special numeral formats', () => {
    const matches = runRule(
      houseStyleTermsRule,
      'Our old G Suite notes still mention google data studio and ipv6 routing.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]?.replacements).toEqual([{ value: 'Google Workspace' }])
    expect(matches[1]?.replacements).toEqual([{ value: 'Looker Studio' }])
    expect(matches[2]?.replacements).toEqual([{ value: 'IPv6' }])
  })

  it('does not flag already preferred forms or quoted literal mentions', () => {
    expect(
      runRule(
        houseStyleTermsRule,
        'GitHub Actions works with TypeScript on IPv6. The migration guide mentions "G Suite" as the former name.',
      ),
    ).toEqual([])
  })

  it('supports regional and organization-specific house-style terms through analysis options', () => {
    const matches = runRule(
      houseStyleTermsRule,
      'The color tokens live in GramaDoc Cloud.',
      {
        languageCode: 'en-GB',
        houseStyleTerms: [
          {
            phrase: 'color',
            preferred: 'colour',
            kind: 'special-numeral-format',
            message: 'Prefer the regional form "colour".',
            languageCodes: ['en-GB'],
            scope: 'regional',
          },
          {
            phrase: 'gramadoc cloud',
            preferred: 'Gramadoc Cloud',
            kind: 'product-name',
            message: 'Use the organization product name "Gramadoc Cloud".',
            scope: 'organization',
          },
        ],
      },
    )

    expect(matches).toHaveLength(2)
    expect(matches.map((match) => match.replacements[0]?.value)).toEqual(
      expect.arrayContaining(['Gramadoc Cloud', 'colour']),
    )
  })

  it('keeps regional overrides scoped to their configured language', () => {
    expect(
      runRule(houseStyleTermsRule, 'The color tokens live here.', {
        languageCode: 'en-US',
        houseStyleTerms: [
          {
            phrase: 'color',
            preferred: 'colour',
            kind: 'special-numeral-format',
            message: 'Prefer the regional form "colour".',
            languageCodes: ['en-GB'],
            scope: 'regional',
          },
        ],
      }),
    ).toEqual([])
  })
})

describe('houseStyleRules', () => {
  it('exports the grouped house-style rules', () => {
    expect(houseStyleRules).toEqual([houseStyleTermsRule])
  })
})
