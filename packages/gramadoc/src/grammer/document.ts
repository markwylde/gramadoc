import { type DefaultTreeAdapterMap, parseFragment } from 'parse5'
import { buildClauseGroups } from './clause.js'
import { applyContextualPosDisambiguation } from './disambiguation.js'
import { getTokenAnnotation, isPluralLike } from './linguistics.js'
import { buildPhraseHints } from './phrase-hints.js'
import { extractStructuredTextSpans } from './structured-text.js'
import type {
  DocumentLanguage,
  DocumentStats,
  GrammerLanguageCode,
  GrammerOptionalRulePack,
  MeasurementPreference,
  NativeLanguageProfile,
  ParagraphRange,
  SentenceRange,
  TextBlockKind,
  TextBlockRange,
  Token,
} from './types.js'

type HtmlChildNode = DefaultTreeAdapterMap['childNode']
type HtmlElement = DefaultTreeAdapterMap['element']
type HtmlTextNode = DefaultTreeAdapterMap['textNode']

const STRUCTURAL_BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'td',
  'th',
  'tr',
  'ul',
])
const PARAGRAPH_TAGS = new Set(['blockquote', 'li', 'p', 'pre'])
const PRESERVE_WHITESPACE_TAGS = new Set(['code', 'pre'])
const LETTER_REGEX = /[\p{L}\p{M}]/u
const TOKEN_NORMALIZATION_REGEX = /[’]/gu
const wordSegmenter = new Intl.Segmenter('en', { granularity: 'word' })
const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' })

function isElementNode(node: HtmlChildNode): node is HtmlElement {
  return 'tagName' in node
}

function isTextNode(node: HtmlChildNode): node is HtmlTextNode {
  return node.nodeName === '#text'
}

function getBlockKind(tagName: string): TextBlockKind {
  if (/^h[1-6]$/.test(tagName)) {
    return 'heading'
  }

  switch (tagName) {
    case 'blockquote':
      return 'blockquote'
    case 'li':
      return 'list-item'
    case 'p':
      return 'paragraph'
    default:
      return 'other'
  }
}

function trimTrailingInlineWhitespace(value: string) {
  return value.replace(/[ \t]+$/u, '')
}

function trimSentenceRange(text: string, start: number, end: number) {
  let nextStart = start
  let nextEnd = end

  while (nextStart < nextEnd && /\s/u.test(text[nextStart] ?? '')) {
    nextStart += 1
  }

  while (nextEnd > nextStart && /\s/u.test(text[nextEnd - 1] ?? '')) {
    nextEnd -= 1
  }

  return { start: nextStart, end: nextEnd }
}

export function getDocumentLanguage(
  code: GrammerLanguageCode = 'en',
): DocumentLanguage {
  return {
    code,
    baseCode: 'en',
  }
}

export function segmentSentences(text: string): SentenceRange[] {
  const ranges: SentenceRange[] = []

  for (const segment of sentenceSegmenter.segment(text)) {
    const { start, end } = trimSentenceRange(
      text,
      segment.index,
      segment.index + segment.segment.length,
    )

    if (start >= end) {
      continue
    }

    ranges.push({
      index: ranges.length,
      start,
      end,
      text: text.slice(start, end),
    })
  }

  if (ranges.length > 0) {
    return ranges
  }

  const { start, end } = trimSentenceRange(text, 0, text.length)
  return start < end
    ? [
        {
          index: 0,
          start,
          end,
          text: text.slice(start, end),
        },
      ]
    : []
}

export function getParagraphRanges(
  text: string,
  blockRanges: TextBlockRange[],
): ParagraphRange[] {
  const paragraphBlocks = blockRanges.filter((blockRange) =>
    ['blockquote', 'list-item', 'paragraph'].includes(blockRange.kind),
  )

  if (paragraphBlocks.length > 0) {
    return paragraphBlocks.map((blockRange, index) => ({
      index,
      start: blockRange.start,
      end: blockRange.end,
      text: blockRange.text,
    }))
  }

  return text
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => {
      const start = text.indexOf(paragraph)
      return {
        index,
        start,
        end: start + paragraph.length,
        text: paragraph,
      }
    })
}

function collapseWhitespace(text: string) {
  return text.replace(/\s+/gu, ' ')
}

function normalizeTokenValue(value: string) {
  return value.toLowerCase().replace(TOKEN_NORMALIZATION_REGEX, "'")
}

function getContainingRangeIndex(
  offset: number,
  ranges: Array<{ start: number; end: number }>,
  initialIndex = 0,
) {
  let index = initialIndex

  while (index < ranges.length && offset >= ranges[index].end) {
    index += 1
  }

  if (index >= ranges.length) {
    return { index: ranges.length - 1, cursor: index }
  }

  if (offset < ranges[index].start) {
    return { index: Math.max(index - 1, 0), cursor: index }
  }

  return { index, cursor: index }
}

export function tokenizeText(
  text: string,
  sentenceRanges = segmentSentences(text),
  blockRanges: TextBlockRange[] = [],
) {
  const tokens: Token[] = []
  const wordCounts: Record<string, number> = {}
  let sentenceCursor = 0
  let blockCursor = 0

  for (const segment of wordSegmenter.segment(text)) {
    if (!segment.isWordLike || !LETTER_REGEX.test(segment.segment)) {
      continue
    }

    const value = segment.segment
    const offset = segment.index
    const normalized = normalizeTokenValue(value)
    const annotation = getTokenAnnotation(normalized)
    const sentenceRangeInfo = getContainingRangeIndex(
      offset,
      sentenceRanges,
      sentenceCursor,
    )
    const blockRangeInfo = blockRanges.length
      ? getContainingRangeIndex(offset, blockRanges, blockCursor)
      : { index: -1, cursor: 0 }
    const blockIndex =
      blockRanges.length > 0 &&
      blockRangeInfo.index >= 0 &&
      offset >= blockRanges[blockRangeInfo.index].start &&
      offset < blockRanges[blockRangeInfo.index].end
        ? blockRanges[blockRangeInfo.index].index
        : null

    sentenceCursor = Math.max(sentenceRangeInfo.cursor, 0)
    blockCursor = Math.max(blockRangeInfo.cursor, 0)

    tokens.push({
      value,
      normalized,
      lemma: annotation.lemma,
      lemmaSource: annotation.lemmaSource,
      lexicalPosHints: annotation.lexicalPosHints,
      morphologyPosHints: annotation.morphologyPosHints,
      fallbackPosHints: annotation.fallbackPosHints,
      contextualPosHints: [],
      posReadings: annotation.posReadings,
      posHints: annotation.posHints,
      posHintConfidence: annotation.posHintConfidence,
      usedFallbackPosGuess: annotation.usedFallbackPosGuess,
      isOpenClassUnknown: annotation.isOpenClassUnknown,
      isPosAmbiguous: annotation.isPosAmbiguous,
      disambiguationProvenance: [],
      offset,
      length: value.length,
      index: tokens.length,
      sentenceIndex:
        sentenceRangeInfo.index >= 0
          ? (sentenceRanges[sentenceRangeInfo.index]?.index ?? 0)
          : 0,
      clauseIndex: -1,
      blockIndex,
      leadingText: '',
      trailingText: '',
      isSentenceStart: false,
      isSentenceEnd: false,
      isCapitalized: /^\p{Lu}/u.test(value),
      isPluralLike: isPluralLike(normalized),
      isNumberLike: /^\p{N}+$/u.test(value),
      clausePart: 'subject',
    })

    wordCounts[normalized] = (wordCounts[normalized] ?? 0) + 1
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index]
    const previous = tokens[index - 1]
    const next = tokens[index + 1]

    current.leadingText = text.slice(
      previous ? previous.offset + previous.length : 0,
      current.offset,
    )
    current.trailingText = text.slice(
      current.offset + current.length,
      next ? next.offset : text.length,
    )
    current.isSentenceStart =
      previous === undefined || previous.sentenceIndex !== current.sentenceIndex
    current.isSentenceEnd =
      next === undefined || next.sentenceIndex !== current.sentenceIndex
  }

  return { tokens, wordCounts }
}

function appendWithCollapsedWhitespace(
  currentText: string,
  value: string,
  preserveWhitespace: boolean,
) {
  if (!value) {
    return currentText
  }

  if (preserveWhitespace) {
    return `${currentText}${value}`
  }

  const collapsed = collapseWhitespace(value)

  if (!collapsed.trim()) {
    return /\s$/u.test(currentText) || currentText.length === 0
      ? currentText
      : `${currentText} `
  }

  const needsLeadingSpace = /^\s/u.test(collapsed) && !/\s$/u.test(currentText)
  const normalized = collapsed.trim()
  const nextText = needsLeadingSpace
    ? `${currentText} ${normalized}`
    : `${currentText}${normalized}`

  return /\s$/u.test(collapsed) ? `${nextText} ` : nextText
}

function ensureBoundaryBreak(currentText: string) {
  if (currentText.length === 0) {
    return currentText
  }

  const trimmed = trimTrailingInlineWhitespace(currentText)
  return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`
}

function walkHtmlNode(
  node: HtmlChildNode,
  state: {
    text: string
    blockRanges: TextBlockRange[]
    openBlocks: Array<{ tagName: string; kind: TextBlockKind; start: number }>
  },
  preserveWhitespace = false,
) {
  if (isTextNode(node)) {
    state.text = appendWithCollapsedWhitespace(
      state.text,
      node.value,
      preserveWhitespace,
    )
    return
  }

  if (!isElementNode(node)) {
    return
  }

  const tagName = node.tagName.toLowerCase()

  if (tagName === 'br') {
    state.text = ensureBoundaryBreak(state.text)
    return
  }

  const isBlock = STRUCTURAL_BLOCK_TAGS.has(tagName)
  const nextPreserveWhitespace =
    preserveWhitespace || PRESERVE_WHITESPACE_TAGS.has(tagName)

  if (isBlock) {
    state.text = ensureBoundaryBreak(state.text)

    if (tagName === 'li') {
      state.text = `${state.text}- `
    }

    state.openBlocks.push({
      tagName,
      kind: getBlockKind(tagName),
      start: state.text.length,
    })
  }

  for (const childNode of node.childNodes) {
    walkHtmlNode(childNode, state, nextPreserveWhitespace)
  }

  if (!isBlock) {
    return
  }

  const openBlock = state.openBlocks.pop()

  if (!openBlock) {
    return
  }

  const end = trimTrailingInlineWhitespace(state.text).length

  if (end > openBlock.start) {
    state.blockRanges.push({
      index: state.blockRanges.length,
      start: openBlock.start,
      end,
      tagName,
      kind: openBlock.kind,
      text: state.text.slice(openBlock.start, end),
    })
  }

  state.text = ensureBoundaryBreak(state.text)
}

export function extractHtmlDocument(html: string) {
  const fragment = parseFragment(html)
  const state = {
    text: '',
    blockRanges: [] as TextBlockRange[],
    openBlocks: [] as Array<{
      tagName: string
      kind: TextBlockKind
      start: number
    }>,
  }

  for (const childNode of fragment.childNodes) {
    walkHtmlNode(childNode, state)
  }

  const plainText = trimTrailingInlineWhitespace(state.text)
  const blockRanges = state.blockRanges
    .map((blockRange) => ({
      ...blockRange,
      end: Math.min(blockRange.end, plainText.length),
      text: plainText.slice(
        blockRange.start,
        Math.min(blockRange.end, plainText.length),
      ),
    }))
    .filter((blockRange) => blockRange.end > blockRange.start)

  return {
    plainText,
    blockRanges,
    paragraphRanges: getParagraphRanges(plainText, blockRanges),
  }
}

export function getDocumentStats(options: {
  blockRanges: TextBlockRange[]
  paragraphRanges: ParagraphRange[]
  sentenceRanges: SentenceRange[]
  tokens: Token[]
}) {
  const { blockRanges, paragraphRanges, sentenceRanges, tokens } = options

  return {
    blockCount: blockRanges.length,
    paragraphCount: paragraphRanges.length,
    sentenceCount: sentenceRanges.length,
    tokenCount: tokens.length,
    wordCount: tokens.length,
  } satisfies DocumentStats
}

function buildSentenceTokenGroups(
  tokens: Token[],
  sentenceRanges: SentenceRange[],
) {
  const sentenceTokens = sentenceRanges.map(() => [] as Token[])

  for (const token of tokens) {
    sentenceTokens[token.sentenceIndex]?.push(token)
  }

  return sentenceTokens
}

function buildParagraphTokenGroups(
  tokens: Token[],
  paragraphRanges: ParagraphRange[],
) {
  const paragraphTokens = paragraphRanges.map(() => [] as Token[])
  let paragraphIndex = 0

  for (const token of tokens) {
    while (
      paragraphIndex < paragraphRanges.length &&
      token.offset >= paragraphRanges[paragraphIndex].end
    ) {
      paragraphIndex += 1
    }

    const paragraphRange = paragraphRanges[paragraphIndex]

    if (
      paragraphRange &&
      token.offset >= paragraphRange.start &&
      token.offset + token.length <= paragraphRange.end
    ) {
      paragraphTokens[paragraphIndex]?.push(token)
    }
  }

  return paragraphTokens
}

export function buildTextDocument(
  text: string,
  options?: {
    blockRanges?: TextBlockRange[]
    paragraphRanges?: ParagraphRange[]
    language?: DocumentLanguage
    enabledRulePacks?: readonly GrammerOptionalRulePack[]
    nativeLanguageProfile?: NativeLanguageProfile
    measurementPreference?: MeasurementPreference
  },
) {
  const blockRanges = options?.blockRanges ?? []
  const sentenceRanges = segmentSentences(text)
  const paragraphRanges =
    options?.paragraphRanges ?? getParagraphRanges(text, blockRanges)
  const structuredTextSpans = extractStructuredTextSpans(
    text,
    sentenceRanges,
    blockRanges,
  )
  const { tokens, wordCounts } = tokenizeText(text, sentenceRanges, blockRanges)
  const sentenceTokens = buildSentenceTokenGroups(tokens, sentenceRanges)
  applyContextualPosDisambiguation(sentenceTokens)
  const { clauseRanges, clauseTokens } = buildClauseGroups(
    text,
    sentenceRanges,
    sentenceTokens,
  )
  const phraseHints = buildPhraseHints({ sentenceTokens })
  const paragraphTokens = buildParagraphTokenGroups(tokens, paragraphRanges)
  const language = options?.language ?? getDocumentLanguage()
  const documentStats = getDocumentStats({
    blockRanges,
    paragraphRanges,
    sentenceRanges,
    tokens,
  })
  const enabledRulePacks = options?.enabledRulePacks ?? []

  return {
    text,
    tokens,
    sentenceTokens,
    clauseTokens,
    paragraphTokens,
    wordCounts,
    structuredTextSpans,
    blockRanges,
    sentenceRanges,
    clauseRanges,
    phraseHints,
    paragraphRanges,
    language,
    documentStats,
    enabledRulePacks,
    nativeLanguageProfile: options?.nativeLanguageProfile,
    measurementPreference: options?.measurementPreference,
  }
}

export function isParagraphLikeBlock(kind: TextBlockKind) {
  return kind === 'blockquote' || kind === 'list-item' || kind === 'paragraph'
}

export function hasParagraphLikeBlocks(blockRanges: TextBlockRange[]) {
  return blockRanges.some((blockRange) => PARAGRAPH_TAGS.has(blockRange.kind))
}
