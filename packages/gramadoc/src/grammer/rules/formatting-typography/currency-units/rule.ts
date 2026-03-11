import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const CURRENCY_CODES = new Set(['USD', 'EUR', 'GBP'])
const UNIT_SYMBOLS = new Set(['kg', 'km', 'cm', 'mm', 'm', 'lb', 'lbs'])

export const currencyCodeSpacingRule: GrammerRule = {
  id: 'CURRENCY_CODE_SPACING',
  name: 'Currency Code Spacing',
  description:
    'Flags currency codes written directly against numbers, such as "USD20".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'CURRENCY_UNITS',
    name: 'Currency & Units',
  },
  examples: {
    good: [{ text: 'The refund was USD 20.' }],
    bad: [{ text: 'The refund was USD20.' }],
  },
  check({ text }) {
    const matches: Match[] = []

    for (const match of text.matchAll(/\b([A-Z]{3})(\d+(?:\.\d+)?)\b/g)) {
      if (match.index === undefined || !CURRENCY_CODES.has(match[1])) {
        continue
      }

      const offset = match.index + match[1].length

      matches.push(
        createMatch({
          text,
          offset,
          length: 0,
          message: 'Add a space between the currency code and the amount.',
          replacements: [' '],
          rule: currencyCodeSpacingRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedUnitSymbolRule: GrammerRule = {
  id: 'REPEATED_UNIT_SYMBOL',
  name: 'Repeated Unit Symbol',
  description: 'Flags doubled unit symbols such as "10 kg kg" or "5 km km".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'CURRENCY_UNITS',
    name: 'Currency & Units',
  },
  examples: {
    good: [{ text: 'The package weighed 10 kg.' }],
    bad: [{ text: 'The package weighed 10 kg kg.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex = /\b\d+(?:\.\d+)?\s+([A-Za-z]{1,3})\s+\1\b/g

    for (const match of text.matchAll(regex)) {
      if (
        match.index === undefined ||
        !UNIT_SYMBOLS.has(match[1].toLowerCase())
      ) {
        continue
      }

      const full = match[0]
      const secondUnitIndex = full.lastIndexOf(match[1])
      const offset = match.index + secondUnitIndex

      matches.push(
        createMatch({
          text,
          offset,
          length: match[1].length,
          message: 'Use the unit symbol only once here.',
          replacements: [''],
          rule: repeatedUnitSymbolRule,
        }),
      )
    }

    return matches
  },
}

export const numberUnitSpacingRule: GrammerRule = {
  id: 'NUMBER_UNIT_SPACING',
  name: 'Number Unit Spacing',
  description:
    'Flags simple number-plus-unit combinations that are missing a space, such as "10kg".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'CURRENCY_UNITS',
    name: 'Currency & Units',
  },
  examples: {
    good: [{ text: 'The package weighed 10 kg.' }],
    bad: [{ text: 'The package weighed 10kg.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex = /\b(\d+(?:\.\d+)?)(kg|km|cm|mm|m|lb|lbs)\b/gi

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const offset = match.index + match[1].length

      matches.push(
        createMatch({
          text,
          offset,
          length: 0,
          message: 'Add a space between the number and the unit.',
          replacements: [' '],
          rule: numberUnitSpacingRule,
        }),
      )
    }

    return matches
  },
}

export const currencyUnitsRules = [
  currencyCodeSpacingRule,
  repeatedUnitSymbolRule,
  numberUnitSpacingRule,
]
