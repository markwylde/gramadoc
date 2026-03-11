interface CharacterMapEntry {
  node: Text
  startOffset: number
  endOffset: number
}

interface DomTextIndexState {
  plainText: string
  characters: Array<CharacterMapEntry | null>
}

export interface DomTextIndex {
  plainText: string
  characters: Array<CharacterMapEntry | null>
}

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

const PRESERVE_WHITESPACE_TAGS = new Set(['code', 'pre'])

function appendCharacter(
  state: DomTextIndexState,
  character: string,
  entry: CharacterMapEntry | null,
) {
  state.plainText += character
  state.characters.push(entry)
}

function appendSyntheticText(state: DomTextIndexState, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    appendCharacter(state, value[index] ?? '', null)
  }
}

function trimTrailingInlineWhitespace(state: DomTextIndexState) {
  while (/[ \t]/u.test(state.plainText.at(-1) ?? '')) {
    state.plainText = state.plainText.slice(0, -1)
    state.characters.pop()
  }
}

function ensureBoundaryBreak(state: DomTextIndexState) {
  if (state.plainText.length === 0) {
    return
  }

  trimTrailingInlineWhitespace(state)

  if (state.plainText.endsWith('\n')) {
    return
  }

  appendSyntheticText(state, '\n')
}

function getCollapsedCharacterEntries(value: string) {
  const entries: Array<{
    character: string
    startOffset: number
    endOffset: number
  }> = []
  let index = 0

  while (index < value.length) {
    const character = value[index] ?? ''

    if (/\s/u.test(character)) {
      const startOffset = index
      index += 1

      while (index < value.length && /\s/u.test(value[index] ?? '')) {
        index += 1
      }

      entries.push({
        character: ' ',
        startOffset,
        endOffset: index,
      })
      continue
    }

    entries.push({
      character,
      startOffset: index,
      endOffset: index + 1,
    })
    index += 1
  }

  return entries
}

function appendCollapsedText(
  state: DomTextIndexState,
  node: Text,
  value: string,
) {
  if (!value) {
    return
  }

  const collapsedEntries = getCollapsedCharacterEntries(value)
  const firstContentIndex = collapsedEntries.findIndex(
    (entry) => entry.character !== ' ',
  )

  if (firstContentIndex < 0) {
    if (state.plainText.length === 0 || /\s$/u.test(state.plainText)) {
      return
    }

    const whitespaceEntry = collapsedEntries[0]
    appendCharacter(state, ' ', {
      node,
      startOffset: whitespaceEntry.startOffset,
      endOffset: whitespaceEntry.endOffset,
    })
    return
  }

  let lastContentIndex = firstContentIndex

  for (let index = collapsedEntries.length - 1; index >= 0; index -= 1) {
    if (collapsedEntries[index]?.character !== ' ') {
      lastContentIndex = index
      break
    }
  }
  const hasLeadingWhitespace = collapsedEntries[0]?.character === ' '
  const hasTrailingWhitespace =
    collapsedEntries[collapsedEntries.length - 1]?.character === ' '

  if (
    hasLeadingWhitespace &&
    state.plainText.length > 0 &&
    !/\s$/u.test(state.plainText)
  ) {
    const leadingEntry = collapsedEntries[0]
    appendCharacter(state, ' ', {
      node,
      startOffset: leadingEntry.startOffset,
      endOffset: leadingEntry.endOffset,
    })
  }

  for (let index = firstContentIndex; index <= lastContentIndex; index += 1) {
    const entry = collapsedEntries[index]
    appendCharacter(state, entry.character, {
      node,
      startOffset: entry.startOffset,
      endOffset: entry.endOffset,
    })
  }

  if (hasTrailingWhitespace) {
    const trailingEntry = collapsedEntries[collapsedEntries.length - 1]
    appendCharacter(state, ' ', {
      node,
      startOffset: trailingEntry.startOffset,
      endOffset: trailingEntry.endOffset,
    })
  }
}

function appendTextNode(
  state: DomTextIndexState,
  node: Text,
  preserveWhitespace: boolean,
) {
  const value = node.textContent ?? ''

  if (!value) {
    return
  }

  if (preserveWhitespace) {
    for (let index = 0; index < value.length; index += 1) {
      appendCharacter(state, value[index] ?? '', {
        node,
        startOffset: index,
        endOffset: index + 1,
      })
    }
    return
  }

  appendCollapsedText(state, node, value)
}

function walkNode(
  node: Node,
  state: DomTextIndexState,
  preserveWhitespace = false,
) {
  if (node.nodeType === Node.TEXT_NODE) {
    appendTextNode(state, node as Text, preserveWhitespace)
    return
  }

  if (!(node instanceof Element)) {
    return
  }

  const tagName = node.tagName.toLowerCase()

  if (tagName === 'br') {
    ensureBoundaryBreak(state)
    return
  }

  const isBlock = STRUCTURAL_BLOCK_TAGS.has(tagName)
  const nextPreserveWhitespace =
    preserveWhitespace || PRESERVE_WHITESPACE_TAGS.has(tagName)

  if (isBlock) {
    ensureBoundaryBreak(state)

    if (tagName === 'li') {
      appendSyntheticText(state, '- ')
    }
  }

  for (const childNode of Array.from(node.childNodes)) {
    walkNode(childNode, state, nextPreserveWhitespace)
  }

  if (!isBlock) {
    return
  }

  trimTrailingInlineWhitespace(state)
  ensureBoundaryBreak(state)
}

function getBoundaryPointForOffset(
  index: DomTextIndex,
  offset: number,
  mode: 'start' | 'end',
) {
  if (mode === 'start') {
    for (
      let cursor = Math.max(0, offset);
      cursor < index.characters.length;
      cursor += 1
    ) {
      const entry = index.characters[cursor]

      if (entry) {
        return {
          node: entry.node,
          offset: entry.startOffset,
        }
      }
    }
  } else {
    for (
      let cursor = Math.min(offset - 1, index.characters.length - 1);
      cursor >= 0;
      cursor -= 1
    ) {
      const entry = index.characters[cursor]

      if (entry) {
        return {
          node: entry.node,
          offset: entry.endOffset,
        }
      }
    }
  }

  return null
}

export function buildDomTextIndex(container: HTMLElement): DomTextIndex {
  const state: DomTextIndexState = {
    plainText: '',
    characters: [],
  }

  for (const childNode of Array.from(container.childNodes)) {
    walkNode(childNode, state)
  }

  trimTrailingInlineWhitespace(state)

  return {
    plainText: state.plainText,
    characters: state.characters.slice(0, state.plainText.length),
  }
}

export function findTextRange(
  index: DomTextIndex,
  offset: number,
  length: number,
) {
  if (
    index.characters.length === 0 ||
    (length === 0 && offset > index.characters.length)
  ) {
    return null
  }

  const start = getBoundaryPointForOffset(index, offset, 'start')
  const end = getBoundaryPointForOffset(index, offset + length, 'end')

  if (!start || !end) {
    return null
  }

  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  return range
}

export function getSelectionOffsets(
  container: HTMLElement,
  index: DomTextIndex,
): { start: number; end: number } | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  ) {
    return null
  }

  let start = -1
  let end = -1

  for (let i = 0; i < index.characters.length; i++) {
    const entry = index.characters[i]
    if (!entry) {
      continue
    }

    if (
      start === -1 &&
      entry.node === range.startContainer &&
      entry.startOffset <= range.startOffset &&
      entry.endOffset >= range.startOffset
    ) {
      start = i + (range.startOffset - entry.startOffset)
    }

    if (
      end === -1 &&
      entry.node === range.endContainer &&
      entry.startOffset <= range.endOffset &&
      entry.endOffset >= range.endOffset
    ) {
      end = i + (range.endOffset - entry.startOffset)
    }
  }

  // Fallback for when selection is at the very end of a text node
  if (start === -1 || end === -1) {
    for (let i = index.characters.length - 1; i >= 0; i--) {
      const entry = index.characters[i]
      if (!entry) {
        continue
      }

      if (
        start === -1 &&
        entry.node === range.startContainer &&
        entry.endOffset === range.startOffset
      ) {
        start = i + 1
      }

      if (
        end === -1 &&
        entry.node === range.endContainer &&
        entry.endOffset === range.endOffset
      ) {
        end = i + 1
      }
    }
  }

  if (start === -1 || end === -1) {
    return null
  }

  return { start, end }
}
