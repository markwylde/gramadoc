import { describe, expect, it } from 'vitest'
import { analyzeHtml } from '@markwylde/gramadoc'
import { plainTextToEditorHtml } from './GramadocInput'

describe('plainTextToEditorHtml', () => {
  it('splits blank-line separated pasted text into paragraphs', () => {
    expect(
      plainTextToEditorHtml('First paragraph.\n\nSecond paragraph.'),
    ).toBe('<p>First paragraph.</p><p>Second paragraph.</p>')
  })

  it('preserves single line breaks within a paragraph', () => {
    expect(plainTextToEditorHtml('First line.\nSecond line.')).toBe(
      '<p>First line.<br>Second line.</p>',
    )
  })

  it('normalizes windows line endings during paste conversion', () => {
    expect(
      plainTextToEditorHtml('First paragraph.\r\n\r\nSecond paragraph.'),
    ).toBe('<p>First paragraph.</p><p>Second paragraph.</p>')
  })

  it('escapes pasted html-looking text instead of treating it as markup', () => {
    expect(plainTextToEditorHtml('<strong>Plain text</strong>')).toBe(
      '<p>&lt;strong&gt;Plain text&lt;/strong&gt;</p>',
    )
  })

  it('keeps the wildfire paste repro from collapsing into one long paragraph issue', () => {
    const sample = [
      'Wildfires have been breaking out in several regions over the past few days, causing major concern among local residents and emergency responders. Authorities say the fires started late Monday afternoon, but the exact cause is still under investigation and officials have not provided a clear explanation yet.',
      'Several neighborhoods were evacuated as the flames spread quickly due to dry weather and strong winds. Firefighters from multiple departments have been working around the clock, trying to contain the blaze before it reaches more homes and businesses.',
      'Many residents are frustrated with the response from authorities, saying warnings did not come early enough. Some families said they had only minutes to leave their homes before the fire approached, and many are still waiting to learn whether their houses are standing.',
    ].join('\n\n')

    const brokenHtml = `<p>${sample.replace(/\n\n/gu, '<br><br>')}</p>`
    const fixedHtml = plainTextToEditorHtml(sample)

    const brokenLongParagraphMatches = analyzeHtml(brokenHtml).warnings.matches
      .filter((match) => match.rule.id === 'LONG_PARAGRAPH')
    const fixedLongParagraphMatches = analyzeHtml(fixedHtml).warnings.matches
      .filter((match) => match.rule.id === 'LONG_PARAGRAPH')

    expect(brokenLongParagraphMatches).toHaveLength(1)
    expect(fixedLongParagraphMatches).toHaveLength(0)
  })
})
