import { describe, expect, it } from 'vitest'
import { analyzeHtml, analyzeText } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  unitConversionEditorialPacks,
  unitConversionSuggestionRule,
  unitConversionsRules,
} from './rule'

describe('unitConversionSuggestionRule', () => {
  it('stays disabled by default', () => {
    expect(
      runRule(unitConversionSuggestionRule, 'The route covers 5 km.'),
    ).toEqual([])
  })

  it('flags the base editorial conversion tranche in prose', () => {
    const matches = runRule(
      unitConversionSuggestionRule,
      'The route covers 5 km and the package weighs 10 kg.',
      {
        enabledRulePacks: [unitConversionEditorialPacks.base],
      },
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      rule: { id: 'UNIT_CONVERSION_SUGGESTION' },
      replacements: [{ value: '5 km (≈ 3.1 mi)' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: '10 kg (≈ 22 lb)' }],
    })
  })

  it('supports table-like content and locale-specific target packs', () => {
    const analysis = analyzeHtml(
      '<table><tr><td>Temperature</td><td>21°C</td></tr><tr><td>Volume</td><td>10 litres</td></tr></table>',
      {
        enabledRulePacks: [unitConversionEditorialPacks.us],
      },
    )

    expect(analysis.warnings.matches).toHaveLength(2)
    expect(analysis.warnings.matches[0]?.replacements).toEqual([
      { value: '21°C (≈ 70 °F)' },
    ])
    expect(analysis.warnings.matches[1]?.replacements).toEqual([
      { value: '10 litres (≈ 2.6 US gallons)' },
    ])
  })

  it('ignores already-converted values and code-adjacent literals', () => {
    const matches = runRule(
      unitConversionSuggestionRule,
      'The route covers 5 km (≈ 3.1 mi). Set `distance = 5 km` in the fixture.',
      {
        enabledRulePacks: [unitConversionEditorialPacks.base],
      },
    )

    expect(matches).toEqual([])
  })

  it('lets the analyzer keep the pack optional while surfacing variant-aware conversions when enabled', () => {
    const baseline = analyzeText('The route covers 5 km and the room is 21°C.')
    const configured = analyzeText(
      'The route covers 5 km and the room is 21°C.',
      {
        enabledRulePacks: [unitConversionEditorialPacks.us],
      },
    )

    expect(
      baseline.warnings.matches.map((match) => match.rule.id),
    ).not.toContain('UNIT_CONVERSION_SUGGESTION')
    expect(configured.warnings.matches.map((match) => match.rule.id)).toContain(
      'UNIT_CONVERSION_SUGGESTION',
    )
    expect(
      configured.warnings.matches
        .filter((match) => match.rule.id === 'UNIT_CONVERSION_SUGGESTION')
        .map((match) => match.replacements[0]?.value),
    ).toEqual(['5 km (≈ 3.1 mi)', '21°C (≈ 70 °F)'])
  })

  it('supports measurement preferences and language-based fallbacks without requiring explicit packs', () => {
    const imperial = analyzeText(
      'The route covers 5 km and the package weighs 10 kg.',
      {
        measurementPreference: 'imperial',
      },
    )
    const british = analyzeText('The room is 21°C and the route covers 5 km.', {
      enabledRulePacks: [unitConversionEditorialPacks.base],
      languageCode: 'en-GB',
    })

    expect(
      imperial.warnings.matches
        .filter((match) => match.rule.id === 'UNIT_CONVERSION_SUGGESTION')
        .map((match) => match.replacements[0]?.value),
    ).toEqual(['5 km (≈ 3.1 mi)', '10 kg (≈ 22 lb)'])
    expect(
      british.warnings.matches
        .filter((match) => match.rule.id === 'UNIT_CONVERSION_SUGGESTION')
        .map((match) => match.replacements[0]?.value),
    ).toEqual(['5 km (≈ 3.1 mi)'])
  })

  it('skips conversions in structured text, preformatted blocks, and identifier-like unit suffixes', () => {
    const htmlAnalysis = analyzeHtml(
      '<pre>distance = 5 km</pre><p>Use `5 km` in the fixture and record 5 km/h in logs.</p><p>The room is 21°C.</p>',
      {
        enabledRulePacks: [unitConversionEditorialPacks.base],
      },
    )

    expect(
      htmlAnalysis.warnings.matches
        .filter((match) => match.rule.id === 'UNIT_CONVERSION_SUGGESTION')
        .map((match) => match.replacements[0]?.value),
    ).toEqual([])
  })
})

describe('unitConversionsRules', () => {
  it('exports the grouped unit conversion rule pack', () => {
    expect(unitConversionsRules).toEqual([unitConversionSuggestionRule])
  })
})
