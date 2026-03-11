import { describe, expect, it } from 'vitest'
import {
  analyzeHtml,
  analyzeText,
  buildRuleCheckContext,
  getRuleMatchMetrics,
  htmlToPlainText,
} from './utils'

describe('htmlToPlainText', () => {
  it('extracts parser-based block text and list metadata safely', () => {
    const html =
      '<section><h1>Résumé</h1><p>José wrote an example.</p><ul><li>First item</li><li>Second item</li></ul></section>'
    const plainText = htmlToPlainText(html)

    expect(plainText).toContain('Résumé')
    expect(plainText).toContain('José wrote an example.')
    expect(plainText).toContain('- First item')
    expect(plainText).toContain('- Second item')
  })
})

describe('tokenizeText', () => {
  it('tokenizes Unicode words and tracks sentence metadata', () => {
    const context = buildRuleCheckContext(
      'José wrote a naïve résumé. Ångström agreed.',
    )

    expect(context.tokens.map((token) => token.value)).toEqual([
      'José',
      'wrote',
      'a',
      'naïve',
      'résumé',
      'Ångström',
      'agreed',
    ])
    expect(context.tokens[0]).toMatchObject({
      isSentenceStart: true,
      sentenceIndex: 0,
    })
    expect(context.tokens[5]).toMatchObject({
      isSentenceStart: true,
      sentenceIndex: 1,
    })
  })

  it('keeps common contractions as single tokens for downstream annotation', () => {
    const context = buildRuleCheckContext(
      "I can't go. We don't agree. I'm ready. We're late. She won't listen.",
    )

    expect(context.tokens.map((token) => token.value)).toEqual([
      'I',
      "can't",
      'go',
      'We',
      "don't",
      'agree',
      "I'm",
      'ready',
      "We're",
      'late',
      'She',
      "won't",
      'listen',
    ])
  })

  it('preserves heading block metadata for downstream rules', () => {
    const analysis = analyzeHtml('<h1>Doccument</h1><p>Normal paragraph.</p>')
    const context = buildRuleCheckContext(analysis.plainText, {
      blockRanges: [
        {
          index: 0,
          start: 0,
          end: 9,
          tagName: 'h1',
          kind: 'heading',
          text: 'Doccument',
        },
      ],
    })

    expect(context.tokens[0]?.blockIndex).toBe(0)
  })

  it('extracts shared structured-text spans for urls, emails, and identifiers', () => {
    const context = buildRuleCheckContext(
      'Email support@example.com, visit www.example.com/docs, open https:/broken.example.com, use ABC--123, and reference TASK_ 45.',
    )

    expect(
      context.structuredTextSpans.map((span) => ({
        kind: span.kind,
        subtype: span.subtype,
        text: span.text,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          kind: 'email',
          subtype: 'email-candidate',
          text: 'support@example.com',
        },
        {
          kind: 'url',
          subtype: 'bare-www-url',
          text: 'www.example.com/docs',
        },
        {
          kind: 'url',
          subtype: 'malformed-url-protocol',
          text: 'https:/broken.example.com',
        },
        {
          kind: 'identifier',
          subtype: 'repeated-identifier-separator',
          text: '--',
        },
        {
          kind: 'identifier',
          subtype: 'split-identifier-number',
          text: ' ',
        },
      ]),
    )
  })
})

describe('getRuleMatchMetrics', () => {
  it('tracks top-firing rules, annotation confidence, and overlapping match groups', () => {
    const analysis = analyzeText(
      'The color palette helped us organise the centre display.',
      {
        languageCode: 'en-US',
      },
    )

    const metrics =
      analysis.metrics ?? getRuleMatchMetrics(analysis.warnings.matches)

    expect(metrics.ruleMatchCounts.MIXED_LANGUAGE_VARIANTS).toBeGreaterThan(0)
    expect(
      metrics.ruleMatchCounts.DOCUMENT_VARIANT_CONSISTENCY,
    ).toBeGreaterThan(0)
    expect(
      metrics.annotation.highConfidenceTokenCount +
        metrics.annotation.mediumConfidenceTokenCount +
        metrics.annotation.lowConfidenceTokenCount,
    ).toBeGreaterThan(0)
    expect(metrics.annotation.fallbackGuessTokenCount).toBeGreaterThan(0)
    expect(metrics.topFiringRuleIds.length).toBeGreaterThan(0)
    expect(metrics.overlappingMatchGroups.length).toBeGreaterThan(0)
  })
})
