import type { Match } from '../../../../types.js'
import type { GrammerRule } from '../../../types.js'
import { createMatch } from '../../../utils.js'

const BULLET_REGEX = /^[ \t]*([-*])\s+(.+)$/gm
const NUMBERED_LIST_REGEX = /^[ \t]*(\d+)\.\s+(.+)$/gm

export const mixedBulletMarkerRule: GrammerRule = {
  id: 'MIXED_BULLET_MARKER',
  name: 'Mixed Bullet Marker',
  description:
    'Flags simple lists that mix "-" and "*" markers within the same block.',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'LISTS_LAYOUT',
    name: 'Lists & Layout',
  },
  examples: {
    good: [{ text: '- First item\n- Second item' }],
    bad: [{ text: '- First item\n* Second item' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const bulletLines = [...text.matchAll(BULLET_REGEX)]

    if (bulletLines.length < 2) {
      return matches
    }

    const firstMarker = bulletLines[0][1]

    for (const line of bulletLines.slice(1)) {
      if (line.index === undefined || line[1] === firstMarker) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: line.index + line[0].indexOf(line[1]),
          length: 1,
          message: 'Use a consistent bullet marker throughout the list.',
          replacements: [firstMarker],
          rule: mixedBulletMarkerRule,
        }),
      )
    }

    return matches
  },
}

export const inconsistentNumberedListRule: GrammerRule = {
  id: 'INCONSISTENT_NUMBERED_LIST',
  name: 'Inconsistent Numbered List',
  description:
    'Flags numbered lists that restart or skip unexpectedly within a simple consecutive block.',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'LISTS_LAYOUT',
    name: 'Lists & Layout',
  },
  examples: {
    good: [{ text: '1. First item\n2. Second item\n3. Third item' }],
    bad: [{ text: '1. First item\n3. Second item' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const numberedLines = [...text.matchAll(NUMBERED_LIST_REGEX)]

    if (numberedLines.length < 2) {
      return matches
    }

    for (let index = 1; index < numberedLines.length; index += 1) {
      const previous = numberedLines[index - 1]
      const current = numberedLines[index]

      if (previous.index === undefined || current.index === undefined) {
        continue
      }

      const expected = Number(previous[1]) + 1
      const actual = Number(current[1])

      if (actual === expected) {
        continue
      }

      matches.push(
        createMatch({
          text,
          offset: current.index + current[0].indexOf(current[1]),
          length: current[1].length,
          message: 'Use sequential numbering in this list.',
          replacements: [String(expected)],
          rule: inconsistentNumberedListRule,
        }),
      )
    }

    return matches
  },
}

export const missingSpaceAfterListMarkerRule: GrammerRule = {
  id: 'MISSING_SPACE_AFTER_LIST_MARKER',
  name: 'Missing Space After List Marker',
  description:
    'Flags list markers that run directly into the content, such as "-Item" or "1.Item".',
  shortMessage: 'Formatting',
  issueType: 'typographical',
  category: {
    id: 'LISTS_LAYOUT',
    name: 'Lists & Layout',
  },
  examples: {
    good: [{ text: '- Item\n1. Item' }],
    bad: [{ text: '-Item\n1.Item' }],
  },
  check({ text }) {
    const matches: Match[] = []
    const regex = /^(?:[ \t]*([-*]|\d+\.))(\S.*)$/gm

    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) {
        continue
      }

      const marker = match[1]
      const offset = match.index + match[0].indexOf(marker) + marker.length

      matches.push(
        createMatch({
          text,
          offset,
          length: 0,
          message: 'Add a space after this list marker.',
          replacements: [' '],
          rule: missingSpaceAfterListMarkerRule,
        }),
      )
    }

    return matches
  },
}

export const listsLayoutRules = [
  mixedBulletMarkerRule,
  inconsistentNumberedListRule,
  missingSpaceAfterListMarkerRule,
]
