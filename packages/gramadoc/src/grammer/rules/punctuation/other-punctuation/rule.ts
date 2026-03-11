import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const LIGATURE_REPLACEMENTS: Record<string, string> = {
  ﬀ: 'ff',
  ﬁ: 'fi',
  ﬂ: 'fl',
  ﬃ: 'ffi',
  ﬄ: 'ffl',
}

export const repeatedSemicolonRule: GrammerRule = {
  id: 'REPEATED_SEMICOLON',
  name: 'Repeated Semicolon',
  description: 'Flags repeated semicolons such as ";;" in running prose.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  examples: {
    good: [{ text: 'Bring apples; oranges; and bananas.' }],
    bad: [{ text: 'Bring apples;; oranges.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/;;+/g)) {
      if (match.index === undefined) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Use a single semicolon here.',
          replacements: [';'],
          rule: repeatedSemicolonRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedColonRule: GrammerRule = {
  id: 'REPEATED_COLON',
  name: 'Repeated Colon',
  description:
    'Flags repeated colons such as "::" when they are not part of a time-like expression.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  examples: {
    good: [{ text: 'Remember this: bring ID and notes.' }],
    bad: [{ text: 'Remember this:: bring ID and notes.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/(?<!\d)::+(?!\d)/g)) {
      if (match.index === undefined) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Use a single colon here.',
          replacements: [':'],
          rule: repeatedColonRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedDashSeparatorRule: GrammerRule = {
  id: 'REPEATED_DASH_SEPARATOR',
  name: 'Repeated Dash Separator',
  description:
    'Flags runs of three or more hyphens used as an inline separator, such as "wait---really".',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  examples: {
    good: [{ text: 'Wait -- really?' }],
    bad: [{ text: 'Wait---really?' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/(?<=\S)---+(?=\S)/g)) {
      if (match.index === undefined) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Use a consistent dash separator here.',
          replacements: ['--'],
          rule: repeatedDashSeparatorRule,
        }),
      )
    }

    return matches
  },
}

export const tightDoubleDashRule: GrammerRule = {
  id: 'TIGHT_DOUBLE_DASH',
  name: 'Tight Double Dash',
  description:
    'Flags double dashes used as parenthetical breaks without surrounding spaces.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  examples: {
    good: [{ text: 'Wait -- really?' }],
    bad: [{ text: 'Wait--really?' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/(?<=\p{L})--(?=\p{L})/gu)) {
      if (match.index === undefined) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Add spaces around this dash separator.',
          replacements: [' -- '],
          rule: tightDoubleDashRule,
        }),
      )
    }

    return matches
  },
}

export const hyphenUsedAsDashRule: GrammerRule = {
  id: 'HYPHEN_USED_AS_DASH',
  name: 'Hyphen Used As Dash',
  description:
    'Flags single hyphens used as parenthetical dash separators in running prose.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  examples: {
    good: [{ text: 'The release -- after review -- shipped.' }],
    bad: [{ text: 'The release - after review - shipped.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/(?<=\p{L})[ \t]+-[ \t]+(?=\p{L})/gu)) {
      if (match.index === undefined) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Use a double dash for this parenthetical break.',
          replacements: [' -- '],
          rule: hyphenUsedAsDashRule,
        }),
      )
    }

    return matches
  },
}

function shouldNormalizeEllipsis(text: string, offset: number, length: number) {
  const previousCharacter = text[offset - 1] ?? ''
  const nextCharacter = text[offset + length] ?? ''

  return !/\d/u.test(previousCharacter) && !/\d/u.test(nextCharacter)
}

export const ellipsisNormalizationRule: GrammerRule = {
  id: 'ELLIPSIS_NORMALIZATION',
  name: 'Ellipsis Normalization',
  description:
    'Flags nonstandard ellipsis forms like ".." or ". . ." in running prose.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  scope: {
    blockKinds: ['paragraph', 'blockquote'],
  },
  examples: {
    good: [{ text: 'I was waiting... and then it loaded.' }],
    bad: [
      { text: 'I was waiting.. and then it loaded.' },
      { text: 'I was waiting . . . and then it loaded.' },
    ],
  },
  check({ text }) {
    const matches: Match[] = []
    const seenOffsets = new Set<number>()

    for (const pattern of [/(?<!\.)\.\.(?!\.)/gu, /\.\s+\.\s+\./gu]) {
      for (const match of text.matchAll(pattern)) {
        if (
          match.index === undefined ||
          seenOffsets.has(match.index) ||
          !shouldNormalizeEllipsis(text, match.index, match[0].length)
        ) {
          continue
        }

        seenOffsets.add(match.index)
        matches.push(
          createMatch({
            text,
            offset: match.index,
            length: match[0].length,
            message: 'Use a standard ellipsis here.',
            replacements: ['...'],
            rule: ellipsisNormalizationRule,
          }),
        )
      }
    }

    return matches
  },
}

const LOWERCASE_FILE_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'gif',
  'gz',
  'jpeg',
  'jpg',
  'json',
  'md',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'svg',
  'tar',
  'txt',
  'xls',
  'xlsx',
  'zip',
])

export const fileExtensionCasingRule: GrammerRule = {
  id: 'FILE_EXTENSION_CASING',
  name: 'File Extension Casing',
  description:
    'Flags common file extensions written with inconsistent casing in running prose.',
  shortMessage: 'Formatting',
  issueType: 'style',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  scope: {
    blockKinds: ['paragraph', 'blockquote', 'list-item'],
  },
  examples: {
    good: [{ text: 'Upload the report.pdf file.' }],
    bad: [{ text: 'Upload the report.PDF file.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(
      /\b([\p{L}\p{N}_-]+)\.([\p{L}\p{N}]+)\b/gu,
    )) {
      if (match.index === undefined) {
        continue
      }

      const extension = match[2]

      if (
        extension === extension.toLowerCase() ||
        !LOWERCASE_FILE_EXTENSIONS.has(extension.toLowerCase())
      ) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index + match[1].length + 1,
          length: extension.length,
          message: 'Use lowercase for common file extensions in prose.',
          replacements: [extension.toLowerCase()],
          rule: fileExtensionCasingRule,
        }),
      )
    }

    return matches
  },
}

export const ligatureNormalizationRule: GrammerRule = {
  id: 'LIGATURE_NORMALIZATION',
  name: 'Ligature Normalization',
  description:
    'Flags uncommon ligature characters such as "ﬁ" or "ﬂ" in running prose.',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  scope: {
    blockKinds: ['paragraph', 'blockquote', 'list-item'],
  },
  examples: {
    good: [{ text: 'This profile includes an efficient workflow.' }],
    bad: [{ text: 'This proﬁle includes an efﬁcient workﬂow.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/[ﬀﬁﬂﬃﬄ]/gu)) {
      if (match.index === undefined) {
        continue
      }

      const replacement = LIGATURE_REPLACEMENTS[match[0]]

      if (!replacement) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: match.index,
          length: match[0].length,
          message: 'Replace this ligature with standard letters in prose.',
          replacements: [replacement],
          rule: ligatureNormalizationRule,
        }),
      )
    }

    return matches
  },
}

export const hashOfAbbreviationRule: GrammerRule = {
  id: 'HASH_OF_ABBREVIATION',
  name: 'Hash Of Abbreviation',
  description:
    'Flags "# of" when it is used as shorthand for "number of" in running prose.',
  shortMessage: 'Style',
  issueType: 'style',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  scope: {
    blockKinds: ['paragraph', 'blockquote', 'list-item'],
  },
  examples: {
    good: [{ text: 'Track the number of active users each week.' }],
    bad: [{ text: 'Track the # of active users each week.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/(^|[\s([{"'“‘])#\s+of\b/gu)) {
      if (match.index === undefined) {
        continue
      }

      const hashOffset = match.index + match[1].length

      matches.push(
        createMatch({
          text,
          offset: hashOffset,
          length: match[0].length - match[1].length,
          message: 'Spell out "number of" instead of "# of" in prose.',
          replacements: ['number of'],
          rule: hashOfAbbreviationRule,
        }),
      )
    }

    return matches
  },
}

const BRACKET_PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
}
const CLOSING_BRACKETS = new Set(Object.values(BRACKET_PAIRS))

export const unmatchedBracketRule: GrammerRule = {
  id: 'UNMATCHED_BRACKET',
  name: 'Unmatched Bracket',
  description:
    'Flags simple cases where a bracket is opened or closed without its matching pair.',
  shortMessage: 'Punctuation',
  issueType: 'typographical',
  category: {
    id: 'OTHER_PUNCTUATION',
    name: 'Other Punctuation',
  },
  examples: {
    good: [{ text: 'Use the function call (value) here.' }],
    bad: [{ text: 'Use the function call (value here.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const stack: Array<{ value: string; offset: number }> = []

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index]

      if (character in BRACKET_PAIRS) {
        stack.push({ value: character, offset: index })
        continue
      }

      if (!CLOSING_BRACKETS.has(character)) {
        continue
      }

      const openBracket = stack.at(-1)

      if (!openBracket || BRACKET_PAIRS[openBracket.value] !== character) {
        matches.push(
          createMatch({
            text,
            offset: index,
            length: 1,
            message: 'This closing bracket does not have a matching opener.',
            replacements: [character],
            rule: unmatchedBracketRule,
          }),
        )
        continue
      }

      stack.pop()
    }

    for (const openBracket of stack) {
      matches.push(
        createMatch({
          text,
          offset: openBracket.offset,
          length: 1,
          message:
            'This opening bracket appears to be missing its closing pair.',
          replacements: [openBracket.value],
          rule: unmatchedBracketRule,
        }),
      )
    }

    return matches
  },
}

export const otherPunctuationRules = [
  repeatedSemicolonRule,
  repeatedColonRule,
  repeatedDashSeparatorRule,
  tightDoubleDashRule,
  hyphenUsedAsDashRule,
  ellipsisNormalizationRule,
  fileExtensionCasingRule,
  ligatureNormalizationRule,
  hashOfAbbreviationRule,
  unmatchedBracketRule,
]
