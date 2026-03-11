import type {
  SentenceRange,
  StructuredTextSpan,
  TextBlockRange,
} from './types.js'

const EMAIL_CANDIDATE_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\b/g
const DOUBLE_AT_EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@@[A-Za-z0-9.-]+\b/g
const ABSOLUTE_URL_REGEX = /\bhttps?:\/\/[^\s]+/g
const BARE_WWW_URL_REGEX =
  /\bwww\.[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:\/[^\s]*)?/g
const MALFORMED_PROTOCOL_URL_REGEX =
  /\bhttps?:\/\/[^\s]*|\bhttps?:\/(?!\/)[^\s]*|\bhttps?\/\/[^\s]*/g
const UUID_LIKE_REGEX =
  /\b[0-9a-f]{7,9}-[0-9a-f]{3,5}-[0-9a-f]{3,5}-[0-9a-f]{3,5}-[0-9a-f]{11,13}\b/gi
const REPEATED_IDENTIFIER_SEPARATOR_REGEX =
  /\b[A-Z]{2,}[A-Z0-9]*([_-])\1[A-Z0-9]+\b/g
const SPLIT_IDENTIFIER_NUMBER_REGEX = /\b[A-Z]{2,}[A-Z0-9]*([_-])\s+(\d+)\b/g

export function stripTrailingSentencePunctuation(value: string) {
  return value.replace(/[)"'\]}),.!?;:]+$/u, '')
}

export function isValidEmail(candidate: string) {
  const [local, domain] = candidate.split('@')

  if (!local || !domain || candidate.includes('@@')) {
    return false
  }

  if (
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return false
  }

  const domainParts = domain.split('.')

  if (
    domainParts.length < 2 ||
    domainParts.some((part) => part.length === 0) ||
    (domainParts.at(-1)?.length ?? 0) < 2
  ) {
    return false
  }

  return true
}

export function getMalformedUrlSuggestion(candidate: string) {
  if (candidate.startsWith('http:/') && !candidate.startsWith('http://')) {
    return candidate.replace('http:/', 'http://')
  }

  if (candidate.startsWith('https:/') && !candidate.startsWith('https://')) {
    return candidate.replace('https:/', 'https://')
  }

  if (candidate.startsWith('http//')) {
    return candidate.replace('http//', 'http://')
  }

  if (candidate.startsWith('https//')) {
    return candidate.replace('https//', 'https://')
  }

  return null
}

export function isValidUuid(candidate: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    candidate,
  )
}

function getContainingRangeIndex(
  start: number,
  end: number,
  ranges: Array<{ index: number; start: number; end: number }>,
) {
  const containingRange = ranges.find(
    (range) => start >= range.start && end <= range.end,
  )

  return containingRange?.index ?? null
}

function createStructuredTextSpan(options: {
  text: string
  start: number
  end: number
  kind: StructuredTextSpan['kind']
  subtype: StructuredTextSpan['subtype']
  sentenceRanges: SentenceRange[]
  blockRanges: TextBlockRange[]
  details?: Record<string, string>
}) {
  const {
    text,
    start,
    end,
    kind,
    subtype,
    sentenceRanges,
    blockRanges,
    details,
  } = options

  if (end <= start) {
    return null
  }

  return {
    kind,
    subtype,
    start,
    end,
    text: text.slice(start, end),
    sentenceIndex: getContainingRangeIndex(start, end, sentenceRanges),
    blockIndex: getContainingRangeIndex(start, end, blockRanges),
    details,
  } satisfies StructuredTextSpan
}

function addStructuredTextSpan(
  spans: StructuredTextSpan[],
  nextSpan: StructuredTextSpan | null,
) {
  if (!nextSpan) {
    return
  }

  const existingSpan = spans.find(
    (span) =>
      span.kind === nextSpan.kind &&
      span.subtype === nextSpan.subtype &&
      span.start === nextSpan.start &&
      span.end === nextSpan.end,
  )

  if (!existingSpan) {
    spans.push(nextSpan)
  }
}

export function extractStructuredTextSpans(
  text: string,
  sentenceRanges: SentenceRange[],
  blockRanges: TextBlockRange[] = [],
) {
  const spans: StructuredTextSpan[] = []

  for (const match of text.matchAll(DOUBLE_AT_EMAIL_REGEX)) {
    const start = match.index ?? 0
    const candidate = stripTrailingSentencePunctuation(match[0])

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + candidate.length,
        kind: 'email',
        subtype: 'double-at-email',
        sentenceRanges,
        blockRanges,
      }),
    )
  }

  for (const match of text.matchAll(EMAIL_CANDIDATE_REGEX)) {
    const start = match.index ?? 0
    const candidate = stripTrailingSentencePunctuation(match[0])

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + candidate.length,
        kind: 'email',
        subtype: 'email-candidate',
        sentenceRanges,
        blockRanges,
      }),
    )
  }

  for (const match of text.matchAll(ABSOLUTE_URL_REGEX)) {
    const start = match.index ?? 0
    const candidate = stripTrailingSentencePunctuation(match[0])

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + candidate.length,
        kind: 'url',
        subtype: 'absolute-url',
        sentenceRanges,
        blockRanges,
      }),
    )
  }

  for (const match of text.matchAll(BARE_WWW_URL_REGEX)) {
    const start = match.index ?? 0
    const candidate = stripTrailingSentencePunctuation(match[0])
    const prefix = text.slice(Math.max(0, start - 8), start).toLowerCase()

    if (prefix.endsWith('://')) {
      continue
    }

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + candidate.length,
        kind: 'url',
        subtype: 'bare-www-url',
        sentenceRanges,
        blockRanges,
      }),
    )
  }

  for (const match of text.matchAll(MALFORMED_PROTOCOL_URL_REGEX)) {
    const start = match.index ?? 0
    const candidate = stripTrailingSentencePunctuation(match[0])
    const suggestion = getMalformedUrlSuggestion(candidate)

    if (!suggestion || suggestion === candidate) {
      continue
    }

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + candidate.length,
        kind: 'url',
        subtype: 'malformed-url-protocol',
        sentenceRanges,
        blockRanges,
        details: {
          suggestion,
        },
      }),
    )
  }

  for (const match of text.matchAll(UUID_LIKE_REGEX)) {
    const start = match.index ?? 0

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + match[0].length,
        kind: 'identifier',
        subtype: 'uuid-like',
        sentenceRanges,
        blockRanges,
      }),
    )
  }

  for (const match of text.matchAll(REPEATED_IDENTIFIER_SEPARATOR_REGEX)) {
    if (match.index === undefined) {
      continue
    }

    const repeatedSeparator = `${match[1]}${match[1]}`
    const start = match.index + match[0].indexOf(repeatedSeparator)

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + repeatedSeparator.length,
        kind: 'identifier',
        subtype: 'repeated-identifier-separator',
        sentenceRanges,
        blockRanges,
        details: {
          replacement: match[1],
        },
      }),
    )
  }

  for (const match of text.matchAll(SPLIT_IDENTIFIER_NUMBER_REGEX)) {
    if (match.index === undefined) {
      continue
    }

    const identifier = match[0].replace(/\s+/gu, '')
    const start = match.index + match[0].indexOf(match[1]) + 1
    const whitespaceLength = match[0].length - identifier.length

    addStructuredTextSpan(
      spans,
      createStructuredTextSpan({
        text,
        start,
        end: start + whitespaceLength,
        kind: 'identifier',
        subtype: 'split-identifier-number',
        sentenceRanges,
        blockRanges,
        details: {
          replacement: '',
        },
      }),
    )
  }

  return spans.sort(
    (left, right) => left.start - right.start || left.end - right.end,
  )
}
