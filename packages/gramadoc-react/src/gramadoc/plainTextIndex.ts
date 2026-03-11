interface CharacterMapEntry {
  node: Text
  startOffset: number
  endOffset: number
}

interface DomTextIndexState {
  plainText: string
  characters: Array<CharacterMapEntry | null>
  selectionPoint?: { node: Node; offset: number }
  selectionOffset?: number
}

export interface DomTextIndex {
  plainText: string
  characters: Array<CharacterMapEntry | null>
  selectionOffset?: number
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
  if (
    state.selectionPoint &&
    state.selectionOffset === undefined &&
    entry &&
    state.selectionPoint.node === entry.node &&
    state.selectionPoint.offset >= entry.startOffset &&
    state.selectionPoint.offset < entry.endOffset
  ) {
    state.selectionOffset = state.plainText.length
  }

  state.plainText += character
  state.characters.push(entry)
}

function checkSelection(state: DomTextIndexState, node: Node, offset?: number) {
  if (
    state.selectionPoint &&
    state.selectionOffset === undefined &&
    state.selectionPoint.node === node &&
    (offset === undefined || state.selectionPoint.offset === offset)
  ) {
    state.selectionOffset = state.plainText.length
  }
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
    if (entry) {
      appendCharacter(state, entry.character, {
        node,
        startOffset: entry.startOffset,
        endOffset: entry.endOffset,
      })
    }
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
    checkSelection(state, node, 0)
    return
  }

  if (preserveWhitespace) {
    for (let index = 0; index < value.length; index += 1) {
      checkSelection(state, node, index)
      appendCharacter(state, value[index] ?? '', {
        node,
        startOffset: index,
        endOffset: index + 1,
      })
    }
    checkSelection(state, node, value.length)
    return
  }

  // For collapsed text, it's trickier because multiple DOM characters map to one plain text character
  // and some are omitted. We'll check selection at the start and end of appendCollapsedText for now.
  checkSelection(state, node, 0)
  appendCollapsedText(state, node, value)
  checkSelection(state, node, value.length)
}

function walkNode(
  node: Node,
  state: DomTextIndexState,
  preserveWhitespace = false,
) {
  checkSelection(state, node, 0)

  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text
    const value = textNode.textContent ?? ''

    appendTextNode(state, textNode, preserveWhitespace)
    checkSelection(state, node, value.length)
    return
  }

  if (!(node instanceof Element)) {
    return
  }

  const tagName = node.tagName.toLowerCase()

  if (tagName === 'br') {
    ensureBoundaryBreak(state)
    checkSelection(state, node, 1)
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

  for (let i = 0; i < node.childNodes.length; i++) {
    const childNode = node.childNodes[i]
    if (childNode) {
      walkNode(childNode, state, nextPreserveWhitespace)
    }
    checkSelection(state, node, i + 1)
  }

  if (!isBlock) {
    return
  }

  trimTrailingInlineWhitespace(state)
  ensureBoundaryBreak(state)
  checkSelection(state, node, node.childNodes.length)
}

function getBoundaryPointForOffset(
  index: DomTextIndex,
  offset: number,
  mode: 'start' | 'end',
) {
  if (mode === 'start') {
    // Try to find the first real character at or after this offset
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

    // If we're at the very end, try to find the last real character
    for (
      let cursor = Math.min(offset, index.characters.length) - 1;
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
  } else {
    // Try to find the first real character at or before this offset
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

    // Fallback to start of the first character
    for (
      let cursor = Math.max(0, offset);
      cursor < index.characters.length;
      cursor++
    ) {
      const entry = index.characters[cursor]
      if (entry) {
        return {
          node: entry.node,
          offset: entry.startOffset,
        }
      }
    }
  }

  return null
}

export function buildDomTextIndex(
  container: HTMLElement,
  selectionPoint?: { node: Node; offset: number },
): DomTextIndex {
  const state: DomTextIndexState = {
    plainText: '',
    characters: [],
    selectionPoint,
  }

  checkSelection(state, container, 0)

  for (let i = 0; i < container.childNodes.length; i++) {
    const childNode = container.childNodes[i]
    if (childNode) {
      walkNode(childNode, state)
    }
    checkSelection(state, container, i + 1)
  }

  trimTrailingInlineWhitespace(state)

  return {
    plainText: state.plainText,
    characters: state.characters.slice(0, state.plainText.length),
    selectionOffset: state.selectionOffset,
  }
}

export function findTextRange(
  index: DomTextIndex,
  offset: number,
  length: number,
) {
  if (index.characters.length === 0) {
    return null
  }

  const start = getBoundaryPointForOffset(index, offset, 'start')
  const end = getBoundaryPointForOffset(index, offset + length, 'end')

  if (!start || !end) {
    return null
  }

  const range = document.createRange()
  try {
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)
    return range
  } catch {
    return null
  }
}

export function getSelectionOffsets(
  container: HTMLElement,
  _index: DomTextIndex,
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

  const startIndex = buildDomTextIndex(container, {
    node: range.startContainer,
    offset: range.startOffset,
  })
  const endIndex = buildDomTextIndex(container, {
    node: range.endContainer,
    offset: range.endOffset,
  })

  if (
    startIndex.selectionOffset === undefined ||
    endIndex.selectionOffset === undefined
  ) {
    return null
  }

  return {
    start: startIndex.selectionOffset,
    end: endIndex.selectionOffset,
  }
}
