import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

function isDigit(value: string | undefined) {
  return value !== undefined && /\d/.test(value)
}

function isLikelyPunctuationFollower(value: string | undefined) {
  return value !== undefined && /[\p{L}\p{M}\p{N}"'“‘([{]/u.test(value)
}

function isClosingQuoteAfterPunctuation(text: string, index: number) {
  const quote = text[index + 1]

  if (!quote || !`"'”’`.includes(quote)) {
    return false
  }

  const afterQuote = text[index + 2]

  return afterQuote === undefined || /[\s,.;:!?)\]}]/u.test(afterQuote)
}

function getParagraphSegments(text: string) {
  const segments: Array<{ start: number; end: number; text: string }> = []
  let paragraphStart = 0

  for (const match of text.matchAll(/\n(?:[ \t]*\n)+/gu)) {
    const end = match.index ?? paragraphStart

    if (end > paragraphStart) {
      const paragraphText = text.slice(paragraphStart, end)

      if (/\S/u.test(paragraphText)) {
        segments.push({
          start: paragraphStart,
          end,
          text: paragraphText,
        })
      }
    }

    paragraphStart = (match.index ?? paragraphStart) + match[0].length
  }

  if (paragraphStart < text.length) {
    const paragraphText = text.slice(paragraphStart)

    if (/\S/u.test(paragraphText)) {
      segments.push({
        start: paragraphStart,
        end: text.length,
        text: paragraphText,
      })
    }
  }

  return segments
}

function isIntentionalIndentedParagraph(text: string) {
  const leadingWhitespace = text.match(/^[ \t]+/u)?.[0]

  if (!leadingWhitespace) {
    return false
  }

  const visibleText = text.slice(leadingWhitespace.length)

  return (
    visibleText.startsWith('>') ||
    leadingWhitespace.includes('\t') ||
    leadingWhitespace.length >= 4
  )
}

export const multipleSpacesRule: GrammerRule = {
  id: 'MULTIPLE_SPACES',
  name: 'Multiple Spaces',
  description:
    'Flags repeated spaces that appear between visible characters in running text.',
  shortMessage: 'Spacing',
  issueType: 'typographical',
  category: {
    id: 'SPACING',
    name: 'Spacing',
  },
  examples: {
    good: [
      { text: 'This sentence uses single spaces.' },
      { text: 'Indented text is handled separately.' },
    ],
    bad: [
      { text: 'This sentence has  two spaces.' },
      { text: 'Please keep words  evenly spaced.' },
    ],
  },
  check({ text }) {
    const matches: Match[] = []

    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== ' ' || text[index - 1] === ' ') {
        continue
      }

      let end = index

      while (text[end] === ' ') {
        end += 1
      }

      if (
        end - index > 1 &&
        /\S/.test(text[index - 1] ?? '') &&
        /\S/.test(text[end] ?? '')
      ) {
        matches.push(
          createMatch({
            text,
            offset: index,
            length: end - index,
            message: 'Use a single space here.',
            replacements: [' '],
            rule: multipleSpacesRule,
          }),
        )
      }
    }

    return matches
  },
}

export const spaceBeforePunctuationRule: GrammerRule = {
  id: 'SPACE_BEFORE_PUNCTUATION',
  name: 'Space Before Punctuation',
  description:
    'Flags spaces that appear immediately before common punctuation marks.',
  shortMessage: 'Spacing',
  issueType: 'typographical',
  category: {
    id: 'SPACING',
    name: 'Spacing',
  },
  examples: {
    good: [{ text: 'The sentence ends cleanly.' }, { text: 'Are you ready?' }],
    bad: [{ text: 'The sentence ends cleanly .' }, { text: 'Are you ready ?' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/\s+([,.;:!?])/g)) {
      const spaces = match[0].slice(0, -1)
      const punctuation = match[1]

      matches.push(
        createMatch({
          text,
          offset: match.index ?? 0,
          length: spaces.length + punctuation.length,
          message: 'Remove the space before this punctuation mark.',
          replacements: [punctuation],
          rule: spaceBeforePunctuationRule,
        }),
      )
    }

    return matches
  },
}

export const missingSpaceAfterPunctuationRule: GrammerRule = {
  id: 'MISSING_SPACE_AFTER_PUNCTUATION',
  name: 'Missing Space After Punctuation',
  description:
    'Flags commas, colons, and semicolons that are immediately followed by the next word without a space.',
  shortMessage: 'Spacing',
  issueType: 'typographical',
  category: {
    id: 'SPACING',
    name: 'Spacing',
  },
  examples: {
    good: [
      { text: 'Bring apples, oranges, and pears.' },
      { text: 'Three options: plan, build, and test.' },
    ],
    bad: [
      { text: 'Bring apples,oranges, and pears.' },
      { text: 'Three options:plan, build, and test.' },
    ],
  },
  check({ text }) {
    const matches: Match[] = []

    for (let index = 0; index < text.length - 1; index += 1) {
      const punctuation = text[index]

      if (!',:;'.includes(punctuation)) {
        continue
      }

      const nextCharacter = text[index + 1]

      if (!nextCharacter || /\s/.test(nextCharacter)) {
        continue
      }

      if (isClosingQuoteAfterPunctuation(text, index)) {
        continue
      }

      if (
        (punctuation === ',' || punctuation === ':') &&
        isDigit(text[index - 1]) &&
        isDigit(nextCharacter)
      ) {
        continue
      }

      if (!isLikelyPunctuationFollower(nextCharacter)) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: index,
          length: 1,
          message: 'Add a space after this punctuation mark.',
          replacements: [`${punctuation} `],
          rule: missingSpaceAfterPunctuationRule,
        }),
      )
    }

    return matches
  },
}

export const excessiveParagraphBreakRule: GrammerRule = {
  id: 'EXCESSIVE_PARAGRAPH_BREAK',
  name: 'Excessive Paragraph Break',
  description: 'Flags runs of three or more line breaks between paragraphs.',
  shortMessage: 'Spacing',
  issueType: 'typographical',
  category: {
    id: 'SPACING',
    name: 'Spacing',
  },
  examples: {
    good: [{ text: 'First paragraph.\n\nSecond paragraph.' }],
    bad: [{ text: 'First paragraph.\n\n\nSecond paragraph.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/\n{3,}/gu)) {
      if (match.index === undefined) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Use a single blank line between paragraphs.',
          replacements: ['\n\n'],
          rule: excessiveParagraphBreakRule,
        }),
      )
    }

    return matches
  },
}

export const leadingParagraphWhitespaceRule: GrammerRule = {
  id: 'LEADING_PARAGRAPH_WHITESPACE',
  name: 'Leading Paragraph Whitespace',
  description:
    'Flags spaces or tabs that indent the start of a prose paragraph.',
  shortMessage: 'Spacing',
  issueType: 'typographical',
  category: {
    id: 'SPACING',
    name: 'Spacing',
  },
  examples: {
    good: [{ text: 'First paragraph.\n\nSecond paragraph.' }],
    bad: [{ text: 'First paragraph.\n\n  Second paragraph.' }],
  },
  check({ text }) {
    return getParagraphSegments(text).flatMap((paragraph) => {
      const leadingWhitespace = paragraph.text.match(/^[ \t]+/u)?.[0]

      if (
        !leadingWhitespace ||
        isIntentionalIndentedParagraph(paragraph.text)
      ) {
        return []
      }

      return [
        createMatch({
          text,
          offset: paragraph.start,
          length: leadingWhitespace.length,
          message: 'Remove indentation at the start of this paragraph.',
          replacements: [''],
          rule: leadingParagraphWhitespaceRule,
        }),
      ]
    })
  },
}

export const whitespaceOnlyBlankLineRule: GrammerRule = {
  id: 'WHITESPACE_ONLY_BLANK_LINE',
  name: 'Whitespace-Only Blank Line',
  description:
    'Flags blank lines that contain spaces or tabs instead of being truly empty.',
  shortMessage: 'Spacing',
  issueType: 'typographical',
  category: {
    id: 'SPACING',
    name: 'Spacing',
  },
  examples: {
    good: [{ text: 'First paragraph.\n\nSecond paragraph.' }],
    bad: [{ text: 'First paragraph.\n  \nSecond paragraph.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/(?:^|\n)([ \t]+)(?=\n)/gu)) {
      const spaces = match[1]
      const offset = (match.index ?? 0) + match[0].length - spaces.length

      matches.push(
        createMatch({
          text,
          offset,
          length: spaces.length,
          message: 'Remove indentation from this blank line.',
          replacements: [''],
          rule: whitespaceOnlyBlankLineRule,
        }),
      )
    }

    return matches
  },
}

export const trailingParagraphWhitespaceRule: GrammerRule = {
  id: 'TRAILING_PARAGRAPH_WHITESPACE',
  name: 'Trailing Paragraph Whitespace',
  description:
    'Flags spaces or tabs that appear at the end of a prose paragraph.',
  shortMessage: 'Spacing',
  issueType: 'typographical',
  category: {
    id: 'SPACING',
    name: 'Spacing',
  },
  examples: {
    good: [{ text: 'First paragraph.\n\nSecond paragraph.' }],
    bad: [{ text: 'First paragraph.  \n\nSecond paragraph.' }],
  },
  check({ text }) {
    return getParagraphSegments(text).flatMap((paragraph) => {
      if (isIntentionalIndentedParagraph(paragraph.text)) {
        return []
      }

      const trailingWhitespace = paragraph.text.match(/[ \t]+$/u)?.[0]

      if (!trailingWhitespace) {
        return []
      }

      return [
        createMatch({
          text,
          offset: paragraph.end - trailingWhitespace.length,
          length: trailingWhitespace.length,
          message: 'Remove trailing whitespace at the end of this paragraph.',
          replacements: [''],
          rule: trailingParagraphWhitespaceRule,
        }),
      ]
    })
  },
}

export const spacingRules = [
  multipleSpacesRule,
  spaceBeforePunctuationRule,
  missingSpaceAfterPunctuationRule,
  excessiveParagraphBreakRule,
  leadingParagraphWhitespaceRule,
  whitespaceOnlyBlankLineRule,
  trailingParagraphWhitespaceRule,
]
