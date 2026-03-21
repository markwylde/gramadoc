import { describe, expect, it } from 'vitest'
import { analyzeHtml } from '../../../utils'
import { runRule } from '../../testUtils'
import {
  missingSpaceAfterSentenceBoundaryRule,
  paragraphEndingPunctuationRule,
  questionMarkSentenceEndingRule,
  repeatedTerminalPunctuationRule,
  sentenceEndingPunctuationRule,
} from './rule'

describe('paragraphEndingPunctuationRule', () => {
  it('flags html paragraphs and blockquotes that end without punctuation', () => {
    const matches = analyzeHtml(
      '<p>This paragraph is missing a final mark</p><blockquote>This quote also misses one</blockquote>',
    ).warnings.matches.filter(
      (match) => match.rule.id === paragraphEndingPunctuationRule.id,
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Paragraphs should end with terminal punctuation.',
      replacements: [{ value: 'mark.' }],
    })
  })

  it('does not flag heading or list item blocks that intentionally omit punctuation', () => {
    const matches = analyzeHtml(
      '<h2>Release Notes</h2><ul><li>First step</li></ul>',
    ).warnings.matches.filter(
      (match) => match.rule.id === paragraphEndingPunctuationRule.id,
    )

    expect(matches).toEqual([])
  })

  it('anchors the replacement span to the trailing year when a paragraph ends with digits', () => {
    const matches = runRule(
      paragraphEndingPunctuationRule,
      'Watch: archive interview with Marta Alvarez reflecting on her first tour in 1985',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      offset: 76,
      length: 4,
      replacements: [{ value: '1985.' }],
    })
  })
})

describe('sentenceEndingPunctuationRule', () => {
  it('flags lines missing ending punctuation', () => {
    const matches = runRule(
      sentenceEndingPunctuationRule,
      'This sentence is missing ending punctuation\nAnother line is fine.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Sentence should end with punctuation.',
      offset: 32,
      length: 11,
      replacements: [{ value: 'punctuation.' }],
      sentence: 'This sentence is missing ending punctuation',
    })
  })

  it('ignores blank lines and lines that already end correctly', () => {
    expect(
      runRule(
        sentenceEndingPunctuationRule,
        'This line ends correctly.\n\nDoes this question end correctly?',
      ),
    ).toEqual([])
  })

  it('ignores lines that only contain symbols or whitespace', () => {
    expect(
      runRule(
        sentenceEndingPunctuationRule,
        '...\n   \n***\nThis line ends correctly.',
      ),
    ).toEqual([])
  })

  it('accepts closing quotes, parentheses, and ellipses as valid endings', () => {
    expect(
      runRule(
        sentenceEndingPunctuationRule,
        'She said, "Wait."\n(That was unexpected.)\nMaybe...',
      ),
    ).toEqual([])
  })

  it('accepts curly closing quotation marks as valid endings', () => {
    expect(
      runRule(
        sentenceEndingPunctuationRule,
        'She said, “Wait.”\nHe replied, ‘Fine!’',
      ),
    ).toEqual([])
  })

  it('accepts headings that intentionally end with a colon', () => {
    expect(
      runRule(
        sentenceEndingPunctuationRule,
        'Things I want to do:\n- Walk to the shop.\n- Sing a song.',
      ),
    ).toEqual([])
  })

  it('still flags quoted lines when terminal punctuation is missing', () => {
    const matches = runRule(
      sentenceEndingPunctuationRule,
      'She said "hello"\nThis line is fine.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Sentence should end with punctuation.',
      replacements: [{ value: 'hello.' }],
    })
  })

  it('uses the Unicode-aware token stream when choosing the replacement span', () => {
    const matches = runRule(sentenceEndingPunctuationRule, 'Café naïve')

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Sentence should end with punctuation.',
      replacements: [{ value: 'naïve.' }],
    })
  })

  it('anchors sentence-ending fixes to a trailing year instead of the previous word', () => {
    const matches = runRule(
      sentenceEndingPunctuationRule,
      'Watch: archive interview with Marta Alvarez reflecting on her first tour in 1985',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      offset: 76,
      length: 4,
      replacements: [{ value: '1985.' }],
    })
  })

  it('ignores heading blocks when analyzing html', () => {
    const matches = analyzeHtml(
      '<h1>New Document</h1><p>This sentence is missing ending punctuation</p>',
    ).warnings.matches.filter(
      (match) => match.rule.id === sentenceEndingPunctuationRule.id,
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      sentence: 'This sentence is missing ending punctuation',
      replacements: [{ value: 'punctuation.' }],
    })
  })

  it('still checks heading text with other rules such as spelling', () => {
    const matches = analyzeHtml('<h1>New Doccument</h1>').warnings.matches

    expect(matches.map((match) => match.rule.id)).toContain('EXTRA_LETTERS')
    expect(matches.map((match) => match.rule.id)).not.toContain(
      sentenceEndingPunctuationRule.id,
    )
  })
})

describe('missingSpaceAfterSentenceBoundaryRule', () => {
  it('flags missing spaces between adjacent sentences', () => {
    const matches = runRule(
      missingSpaceAfterSentenceBoundaryRule,
      'We finished.Then we left!Are you coming?',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Add a space after sentence-ending punctuation.',
      replacements: [{ value: '. ' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: '! ' }],
    })
  })

  it('flags missing spaces when a closing quote ends the sentence', () => {
    const matches = runRule(
      missingSpaceAfterSentenceBoundaryRule,
      'He asked, "Ready?"She nodded.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      length: 2,
      replacements: [{ value: '?" ' }],
    })
  })

  it('handles curly closing quotes and Unicode uppercase letters after the boundary', () => {
    const matches = runRule(
      missingSpaceAfterSentenceBoundaryRule,
      'He asked, “Ready?”Élodie nodded.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      length: 2,
      replacements: [{ value: '?” ' }],
    })
  })

  it('ignores decimals, abbreviations, and already spaced boundaries', () => {
    expect(
      runRule(
        missingSpaceAfterSentenceBoundaryRule,
        'The price is 3.14. Dr.Smith arrived. We finished. Then we left.',
      ),
    ).toEqual([])
  })

  it('flags missing spaces after curly-quoted sentence endings too', () => {
    const matches = runRule(
      missingSpaceAfterSentenceBoundaryRule,
      'He asked, “Ready?”She nodded.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: '?” ' }],
    })
  })
})

describe('questionMarkSentenceEndingRule', () => {
  it('flags likely direct questions that end with a period', () => {
    const matches = runRule(
      questionMarkSentenceEndingRule,
      'Why walk down the street, when you can run.\nWould walking down the street be better than running.\nCan we leave now.\nWhy not run.',
    )

    expect(matches).toHaveLength(4)
    expect(matches[0]).toMatchObject({
      message: 'Questions should end with a question mark.',
      replacements: [{ value: 'run?' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'running?' }],
    })
    expect(matches[2]).toMatchObject({
      replacements: [{ value: 'now?' }],
    })
    expect(matches[3]).toMatchObject({
      replacements: [{ value: 'run?' }],
    })
  })

  it('flags a wider range of auxiliary-led and wh-led question forms', () => {
    const matches = runRule(
      questionMarkSentenceEndingRule,
      [
        'Is this the right train.',
        'Are they ready to leave.',
        'Do you want tea.',
        'Did she call yesterday.',
        'Should we wait here.',
        'What are you doing.',
        'Where did they go.',
        'How could this happen.',
        'Who are you calling.',
      ].join('\n'),
    )

    expect(matches).toHaveLength(9)
    for (const match of matches) {
      expect(match).toMatchObject({
        message: 'Questions should end with a question mark.',
      })
      expect(match.replacements[0]?.value.endsWith('?')).toBe(true)
    }
  })

  it('still flags direct "do" questions that end with periods', () => {
    const matches = runRule(
      questionMarkSentenceEndingRule,
      ['Do you want tea.', 'Do they know the route.', 'Do we leave now.'].join(
        '\n',
      ),
    )

    expect(matches).toHaveLength(3)
    for (const match of matches) {
      expect(match).toMatchObject({
        message: 'Questions should end with a question mark.',
      })
      expect(match.replacements[0]?.value.endsWith('?')).toBe(true)
    }
  })

  it('flags why-questions that use do-support', () => {
    const matches = runRule(
      questionMarkSentenceEndingRule,
      'Why do I not go to the shops.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Questions should end with a question mark.',
      replacements: [{ value: 'shops?' }],
    })
  })

  it('flags elliptical "why" question patterns', () => {
    const matches = runRule(
      questionMarkSentenceEndingRule,
      [
        'Why walk down the street, when you can run.',
        'Why go home so early.',
        'Why not wait a little longer.',
      ].join('\n'),
    )

    expect(matches).toHaveLength(3)
    for (const match of matches) {
      expect(match.replacements[0]?.value.endsWith('?')).toBe(true)
    }
  })

  it('ignores lines that already end with a question mark', () => {
    expect(
      runRule(
        questionMarkSentenceEndingRule,
        [
          'Is this the right train?',
          'Why not run?',
          'How could this happen?',
        ].join('\n'),
      ),
    ).toEqual([])
  })

  it('does not flag statements or indirect why-clauses', () => {
    expect(
      runRule(
        questionMarkSentenceEndingRule,
        [
          'Why he left was obvious.',
          'Walking down the street would be better than running.',
          'I asked why he left.',
          'The question is why people panic.',
          'What he said was surprising.',
          'Who they invited remains unclear.',
          'Why walk down the street, when you can run?',
        ].join('\n'),
      ),
    ).toEqual([])
  })

  it('handles standalone quoted and parenthetical questions that incorrectly end with periods', () => {
    const matches = runRule(
      questionMarkSentenceEndingRule,
      ['"Can we leave now."', '(Why not stay a bit longer.)'].join('\n'),
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]?.replacements[0]?.value).toBe('now?"')
    expect(matches[1]?.replacements[0]?.value).toBe('longer?)')
  })

  it('flags embedded direct questions inside reporting clauses', () => {
    const matches = runRule(
      questionMarkSentenceEndingRule,
      'She asked, "Are we ready."',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.replacements[0]?.value).toBe('ready?"')
  })

  it('ignores non-question imperatives and plain statements ending with periods', () => {
    expect(
      runRule(
        questionMarkSentenceEndingRule,
        [
          'Do a little dance.',
          'Do the dishes before dinner.',
          'Do not enter.',
          '- Do a little dance.',
          'Step to the right.',
          'Clap your hands.',
          'People are scared of spiders.',
          'This is the right train.',
          'We should leave now.',
        ].join('\n'),
      ),
    ).toEqual([])
  })
})

describe('repeatedTerminalPunctuationRule', () => {
  it('flags repeated terminal exclamation points and question marks', () => {
    const matches = runRule(
      repeatedTerminalPunctuationRule,
      'This is exciting!! Are you sure??',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'Use a single terminal punctuation mark here.',
      replacements: [{ value: '!' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: '?' }],
    })
  })

  it('ignores ellipses and punctuation used inside a sentence', () => {
    expect(
      runRule(
        repeatedTerminalPunctuationRule,
        'Wait... I shouted "Go!" before leaving.',
      ),
    ).toEqual([])
  })

  it('flags repeated punctuation that closes before curly quotes too', () => {
    const matches = runRule(
      repeatedTerminalPunctuationRule,
      'He shouted “Really!!” before leaving.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      replacements: [{ value: '!' }],
    })
  })
})
