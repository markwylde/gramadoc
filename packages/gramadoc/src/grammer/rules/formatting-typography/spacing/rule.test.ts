import { describe, expect, it } from 'vitest'
import { analyzeHtml, analyzeText } from '../../../utils'
import { missingSpaceAfterSentenceBoundaryRule } from '../../punctuation/periods-sentence-boundaries/rule'
import { runRule } from '../../testUtils'
import {
  excessiveParagraphBreakRule,
  leadingParagraphWhitespaceRule,
  missingSpaceAfterPunctuationRule,
  multipleSpacesRule,
  spaceBeforePunctuationRule,
  trailingParagraphWhitespaceRule,
  whitespaceOnlyBlankLineRule,
} from './rule'

describe('multipleSpacesRule', () => {
  it('flags repeated spaces between words', () => {
    const matches = runRule(
      multipleSpacesRule,
      'This sentence has  two spaces.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use a single space here.',
      replacements: [{ value: ' ' }],
      sentence: 'This sentence has  two spaces',
    })
  })

  it('does not flag leading indentation or trailing spaces', () => {
    expect(runRule(multipleSpacesRule, '  Indented line\nWord   ')).toEqual([])
  })
})

describe('spaceBeforePunctuationRule', () => {
  it('flags spaces before punctuation marks', () => {
    const matches = runRule(
      spaceBeforePunctuationRule,
      'Hello , world ! This is wrong .',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Remove the space before this punctuation mark.',
      replacements: [{ value: ',' }],
    })
    expect(matches[1].replacements).toEqual([{ value: '!' }])
    expect(matches[2].replacements).toEqual([{ value: '.' }])
  })

  it('does not flag punctuation that is already spaced correctly', () => {
    expect(
      runRule(spaceBeforePunctuationRule, 'Meet at 10:30 sharp, please.'),
    ).toEqual([])
  })
})

describe('missingSpaceAfterPunctuationRule', () => {
  it('flags commas, colons, and semicolons that are missing a following space', () => {
    const matches = runRule(
      missingSpaceAfterPunctuationRule,
      'Bring apples,oranges;bananas and three options:plan ahead.',
    )

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      message: 'Add a space after this punctuation mark.',
      replacements: [{ value: ', ' }],
    })
    expect(matches[1].replacements).toEqual([{ value: '; ' }])
    expect(matches[2].replacements).toEqual([{ value: ': ' }])
  })

  it('does not flag numbers, times, or punctuation already followed by whitespace', () => {
    expect(
      runRule(
        missingSpaceAfterPunctuationRule,
        'The value is 1,000 and the time is 10:30.\nBring apples, oranges.',
      ),
    ).toEqual([])
  })

  it('does not flag punctuation followed by a line break', () => {
    expect(
      runRule(
        missingSpaceAfterPunctuationRule,
        'Things I want to do:\nWalk to the shop.',
      ),
    ).toEqual([])
  })

  it('flags missing spaces before Unicode words and opening quotes too', () => {
    const matches = runRule(
      missingSpaceAfterPunctuationRule,
      'Résumé:élan. He said:“bonjour.”',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0].replacements).toEqual([{ value: ': ' }])
    expect(matches[1].replacements).toEqual([{ value: ': ' }])
  })

  it('does not flag a colon before an html list block', () => {
    const matches = analyzeHtml(
      '<div>Things I want to do:<ul><li>Walk to the shop.</li><li>Sing a song.</li></ul></div>',
    ).warnings.matches

    expect(
      matches.filter(
        (match) => match.rule.id === missingSpaceAfterPunctuationRule.id,
      ),
    ).toEqual([])
  })

  it('does not flag punctuation before a closing quote in dialogue and attribution', () => {
    expect(
      runRule(
        missingSpaceAfterPunctuationRule,
        [
          '"While our hearts are broken, we are deeply grateful for the life he lived and for the unforgettable moments we were blessed to share with him," they wrote.',
          '"They were everywhere," Goodwin said of the online gags.',
          '"Chuck Norris can send texts on a rotary phone," reads a meme the page posted on Thursday.',
        ].join(' '),
      ),
    ).toEqual([])
  })
})

describe('missingSpaceAfterSentenceBoundaryRule', () => {
  it('flags adjacent sentences that run together', () => {
    const matches = runRule(
      missingSpaceAfterSentenceBoundaryRule,
      'First sentence.Second sentence.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Add a space after sentence-ending punctuation.',
      replacements: [{ value: '. ' }],
    })
  })

  it('does not flag sentence boundaries that already contain whitespace', () => {
    expect(
      runRule(
        missingSpaceAfterSentenceBoundaryRule,
        'First sentence.\nSecond sentence. Third sentence.',
      ),
    ).toEqual([])
  })

  it('works through html paragraph, list, and blockquote content', () => {
    const matches = analyzeHtml(
      '<p>First sentence.Second sentence.</p><ul><li>List item.One more sentence.</li></ul><blockquote>Quoted thought.Another thought.</blockquote>',
    ).warnings.matches

    expect(
      matches.filter(
        (match) => match.rule.id === missingSpaceAfterSentenceBoundaryRule.id,
      ),
    ).toHaveLength(3)
  })
})

describe('excessiveParagraphBreakRule', () => {
  it('flags more than one blank line between paragraphs', () => {
    const matches = runRule(
      excessiveParagraphBreakRule,
      'First paragraph.\n\n\nSecond paragraph.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Use a single blank line between paragraphs.',
      replacements: [{ value: '\n\n' }],
    })
  })

  it('does not flag a normal paragraph break', () => {
    expect(
      runRule(
        excessiveParagraphBreakRule,
        'First paragraph.\n\nSecond paragraph.',
      ),
    ).toEqual([])
  })
})

describe('leadingParagraphWhitespaceRule', () => {
  it('flags indentation at the start of a prose paragraph', () => {
    const matches = runRule(
      leadingParagraphWhitespaceRule,
      'First paragraph.\n\n  Second paragraph.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Remove indentation at the start of this paragraph.',
      replacements: [{ value: '' }],
    })
  })

  it('ignores quoted and code-like indentation', () => {
    expect(
      runRule(
        leadingParagraphWhitespaceRule,
        '    const value = 1;\n\n  > Quoted paragraph.',
      ),
    ).toEqual([])
  })
})

describe('whitespaceOnlyBlankLineRule', () => {
  it('flags spaces on blank separator lines', () => {
    const matches = runRule(
      whitespaceOnlyBlankLineRule,
      'First paragraph.\n  \nSecond paragraph.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Remove indentation from this blank line.',
      replacements: [{ value: '' }],
    })
  })
})

describe('trailingParagraphWhitespaceRule', () => {
  it('flags trailing whitespace at the end of a prose paragraph', () => {
    const matches = runRule(
      trailingParagraphWhitespaceRule,
      'First paragraph.  \n\nSecond paragraph.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Remove trailing whitespace at the end of this paragraph.',
      replacements: [{ value: '' }],
    })
  })

  it('ignores code-like paragraphs with intentional indentation', () => {
    expect(
      runRule(
        trailingParagraphWhitespaceRule,
        '    const value = 1;   \n\nNext paragraph.',
      ),
    ).toEqual([])
  })
})

describe('spacing analyzer integration', () => {
  it('keeps paragraph-boundary checks from colliding with punctuation rules', () => {
    const matches = analyzeText(
      'First sentence.Second sentence.\n\n  Third paragraph.  ',
    ).warnings.matches

    expect(matches.map((match) => match.rule.id)).toEqual([
      'MISSING_SPACE_AFTER_SENTENCE_BOUNDARY',
      'LEADING_PARAGRAPH_WHITESPACE',
      'TRAILING_PARAGRAPH_WHITESPACE',
    ])
  })

  it('stays quiet on normalized html block boundaries', () => {
    const matches = analyzeHtml(
      '<p>First sentence. Second sentence.</p><ul><li>List item.</li></ul><blockquote>Quoted thought.</blockquote>',
    ).warnings.matches

    expect(
      matches.filter((match) =>
        [
          leadingParagraphWhitespaceRule.id,
          trailingParagraphWhitespaceRule.id,
        ].includes(match.rule.id),
      ),
    ).toEqual([])
  })
})
