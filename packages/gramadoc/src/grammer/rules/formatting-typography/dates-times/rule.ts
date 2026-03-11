import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

export const duplicateMeridiemRule: GrammerRule = {
  id: 'DUPLICATE_MERIDIEM',
  name: 'Duplicate Meridiem',
  description: 'Flags times that repeat AM/PM markers, such as "10 a.m. pm".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'DATES_TIMES',
    name: 'Dates & Times',
  },
  examples: {
    good: [{ text: 'Meet at 10 a.m. tomorrow.' }, { text: 'Meet at 3pm.' }],
    bad: [{ text: 'Meet at 10 a.m. pm tomorrow.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex =
      /\b(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\s+(a\.?m\.?|p\.?m\.?)\b/gi

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const duplicate = match[2]
      const offset = match.index + match[0].length - duplicate.length

      matches.push(
        createMatch({
          text,
          offset,
          length: duplicate.length,
          message: 'Use only one AM/PM marker for this time.',
          replacements: [''],
          rule: duplicateMeridiemRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedTimeSeparatorRule: GrammerRule = {
  id: 'REPEATED_TIME_SEPARATOR',
  name: 'Repeated Time Separator',
  description:
    'Flags time-like expressions that repeat separators, such as "10::30".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'DATES_TIMES',
    name: 'Dates & Times',
  },
  examples: {
    good: [{ text: 'The call starts at 10:30.' }],
    bad: [{ text: 'The call starts at 10::30.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex = /\b\d{1,2}([:.])\1\d{2}\b/g

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const separatorOffset = match.index + String(match[0]).indexOf(match[1])

      matches.push(
        createMatch({
          text,
          offset: separatorOffset,
          length: 2,
          message: 'Use a single separator in this time.',
          replacements: [match[1]],
          rule: repeatedTimeSeparatorRule,
        }),
      )
    }

    return matches
  },
}

export const repeatedDateSeparatorRule: GrammerRule = {
  id: 'REPEATED_DATE_SEPARATOR',
  name: 'Repeated Date Separator',
  description:
    'Flags dates that repeat slashes or hyphens between parts, such as "03//09//2026".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'DATES_TIMES',
    name: 'Dates & Times',
  },
  examples: {
    good: [{ text: 'The deadline is 03/09/2026.' }],
    bad: [{ text: 'The deadline is 03//09//2026.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex = /\b\d{1,4}([/-])\1\d{1,2}\1\1\d{1,4}\b/g

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const repeatedSeparator = `${match[1]}${match[1]}`
      const firstOffset =
        match.index + String(match[0]).indexOf(repeatedSeparator)
      const secondOffset =
        match.index + String(match[0]).lastIndexOf(repeatedSeparator)

      for (const offset of [firstOffset, secondOffset]) {
        matches.push(
          createMatch({
            text,
            offset,
            length: 2,
            message: 'Use a single separator in this date.',
            replacements: [match[1]],
            rule: repeatedDateSeparatorRule,
          }),
        )
      }
    }

    return matches
  },
}

export const twentyFourHourMeridiemRule: GrammerRule = {
  id: 'TWENTY_FOUR_HOUR_MERIDIEM',
  name: '24-Hour Time With Meridiem',
  description:
    'Flags 24-hour times that also include AM/PM markers, such as "18:30 pm".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'DATES_TIMES',
    name: 'Dates & Times',
  },
  examples: {
    good: [
      { text: 'The call starts at 18:30.' },
      { text: 'The call starts at 6:30 p.m.' },
    ],
    bad: [{ text: 'The call starts at 18:30 pm.' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex = /\b((?:1[3-9]|2[0-3])(?::[0-5]\d)?)\s*(a\.?m\.?|p\.?m\.?)\b/gi

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const meridiem = match[2]
      const offset = match.index + match[0].length - meridiem.length

      matches.push(
        createMatch({
          text,
          offset,
          length: meridiem.length,
          message: 'Do not combine a 24-hour time with an AM/PM marker.',
          replacements: [''],
          rule: twentyFourHourMeridiemRule,
        }),
      )
    }

    return matches
  },
}

export const datesTimesRules = [
  duplicateMeridiemRule,
  repeatedTimeSeparatorRule,
  repeatedDateSeparatorRule,
  twentyFourHourMeridiemRule,
]
