import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const MISSPELLED_NAMES: Record<string, string> = {
  jonh: 'John',
  micheal: 'Michael',
  saraa: 'Sarah',
}

const INCORRECT_ACRONYMS: Record<string, string> = {
  api: 'API',
  htlm: 'HTML',
  josn: 'JSON',
  slq: 'SQL',
}

const KNOWN_ACRONYMS: Record<string, string> = {
  API: 'application programming interface',
  HTML: 'hypertext markup language',
  JSON: 'javascript object notation',
  SQL: 'structured query language',
}

const ACRONYM_CAPITALIZATION = new Set(Object.keys(KNOWN_ACRONYMS))

const ABBREVIATION_PATTERNS = [
  {
    regex: /\be\.g\b(?!\.)/gi,
    replacement: 'e.g.',
    message: 'Use the abbreviation form "e.g.".',
  },
  {
    regex: /\bi\.e\b(?!\.)/gi,
    replacement: 'i.e.',
    message: 'Use the abbreviation form "i.e.".',
  },
  {
    regex: /\bvs\b(?!\.)/gi,
    replacement: 'vs.',
    message: 'Use the abbreviation form "vs.".',
  },
]

function hasDefinitionBefore(
  text: string,
  offset: number,
  acronym: string,
  expansion: string,
) {
  const prefix = text.slice(0, offset).toLowerCase()

  return (
    prefix.includes(`${expansion} (${acronym.toLowerCase()})`) ||
    prefix.includes(expansion)
  )
}

export const misspelledNamesRule: GrammerRule = {
  id: 'MISSPELLED_NAMES',
  name: 'Misspelled Names',
  description:
    'Flags a small demo set of misspelled names and suggests their standard spelling.',
  shortMessage: 'Spelling',
  issueType: 'misspelling',
  category: {
    id: 'NAMES_ACRONYMS_SPECIALIZED_TERMS',
    name: 'Names, Acronyms & Specialized Terms',
  },
  examples: {
    good: [{ text: 'John emailed Michael.' }],
    bad: [{ text: 'Jonh emailed Micheal.' }],
  },
  check({ text, tokens }) {
    return tokens.flatMap((token) => {
      const replacement = MISSPELLED_NAMES[token.normalized]

      if (!replacement) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use the standard spelling "${replacement}" for this name.`,
          replacements: [replacement],
          rule: misspelledNamesRule,
        }),
      ]
    })
  },
}

export const incorrectAcronymsRule: GrammerRule = {
  id: 'INCORRECT_ACRONYMS',
  name: 'Incorrect Acronyms',
  description: 'Flags a small set of common acronym misspellings.',
  shortMessage: 'Spelling',
  issueType: 'misspelling',
  category: {
    id: 'NAMES_ACRONYMS_SPECIALIZED_TERMS',
    name: 'Names, Acronyms & Specialized Terms',
  },
  examples: {
    good: [{ text: 'The HTML and JSON output looked fine.' }],
    bad: [{ text: 'The HTLM and JOSN output looked fine.' }],
  },
  check({ text, tokens }) {
    return tokens.flatMap((token) => {
      const replacement = INCORRECT_ACRONYMS[token.normalized]

      if (!replacement || token.value.toUpperCase() === replacement) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Use the acronym "${replacement}".`,
          replacements: [replacement],
          rule: incorrectAcronymsRule,
        }),
      ]
    })
  },
}

export const acronymCapitalizationRule: GrammerRule = {
  id: 'ACRONYM_CAPITALIZATION',
  name: 'Acronym Capitalization',
  description:
    'Flags known acronyms when they are written in lowercase or mixed case.',
  shortMessage: 'Capitalization',
  issueType: 'capitalization',
  category: {
    id: 'NAMES_ACRONYMS_SPECIALIZED_TERMS',
    name: 'Names, Acronyms & Specialized Terms',
  },
  examples: {
    good: [{ text: 'The API returned JSON.' }],
    bad: [{ text: 'The api returned Json.' }],
  },
  check({ text, tokens }) {
    return tokens.flatMap((token) => {
      const upper = token.value.toUpperCase()

      if (!ACRONYM_CAPITALIZATION.has(upper) || token.value === upper) {
        return []
      }

      return [
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Capitalize the acronym as "${upper}".`,
          replacements: [upper],
          rule: acronymCapitalizationRule,
        }),
      ]
    })
  },
}

export const undefinedAcronymsRule: GrammerRule = {
  id: 'UNDEFINED_ACRONYMS',
  name: 'Undefined Acronyms',
  description:
    'Flags the first use of selected acronyms when they appear without a prior definition.',
  shortMessage: 'Clarity',
  issueType: 'clarity',
  category: {
    id: 'NAMES_ACRONYMS_SPECIALIZED_TERMS',
    name: 'Names, Acronyms & Specialized Terms',
  },
  examples: {
    good: [
      { text: 'The Application Programming Interface (API) returned quickly.' },
    ],
    bad: [{ text: 'The API returned quickly.' }],
  },
  check({ text, tokens }) {
    const matches: Match[] = []
    const seen = new Set<string>()

    for (const token of tokens) {
      const acronym = token.value.toUpperCase()
      const expansion = KNOWN_ACRONYMS[acronym]

      if (!expansion || seen.has(acronym)) {
        continue
      }

      seen.add(acronym)

      if (hasDefinitionBefore(text, token.offset, acronym, expansion)) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: token.offset,
          length: token.length,
          message: `Define "${acronym}" before using it.`,
          replacements: [],
          rule: undefinedAcronymsRule,
        }),
      )
    }

    return matches
  },
}

export const incorrectAbbreviationFormsRule: GrammerRule = {
  id: 'INCORRECT_ABBREVIATION_FORMS',
  name: 'Incorrect Abbreviation Forms',
  description:
    'Flags a few common abbreviations when they are missing their expected punctuation.',
  shortMessage: 'Spelling',
  issueType: 'misspelling',
  category: {
    id: 'NAMES_ACRONYMS_SPECIALIZED_TERMS',
    name: 'Names, Acronyms & Specialized Terms',
  },
  examples: {
    good: [{ text: 'Bring fruit, e.g. apples.' }],
    bad: [{ text: 'Bring fruit, e.g apples.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const pattern of ABBREVIATION_PATTERNS) {
      for (const match of text.matchAll(pattern.regex)) {
        matches.push(
          createMatch({
            text,
            offset: match.index ?? 0,
            length: match[0].length,
            message: pattern.message,
            replacements: [pattern.replacement],
            rule: incorrectAbbreviationFormsRule,
          }),
        )
      }
    }

    return matches
  },
}

export const namesAcronymsSpecializedTermsRules = [
  misspelledNamesRule,
  incorrectAcronymsRule,
  acronymCapitalizationRule,
  undefinedAcronymsRule,
  incorrectAbbreviationFormsRule,
]
