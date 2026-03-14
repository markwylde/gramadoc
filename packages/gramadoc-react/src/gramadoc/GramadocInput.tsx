import { htmlToPlainText } from '@markwylde/gramadoc'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  buildDomTextIndex,
  findTextRange,
  getSelectionOffsets,
} from './plainTextIndex'
import type {
  EditorBlockType,
  GramadocEditorHandle,
  GramadocEditorState,
  GramadocInputProps,
  Match,
  UnderlineColorResolver,
  UnderlinePosition,
} from './types'
import './GramadocInput.css'

const ALLOWED_BLOCK_TAGS = new Set([
  'blockquote',
  'h1',
  'h2',
  'h3',
  'hr',
  'li',
  'ol',
  'p',
  'ul',
])
const ALLOWED_INLINE_TAGS = new Set(['a', 'br', 'em', 's', 'strong', 'u'])
const INLINE_OR_TEXT_SELECTOR = 'a, br, em, s, strong, u'
const TAG_NAME_MAP: Record<string, string> = {
  b: 'strong',
  div: 'p',
  i: 'em',
  strike: 's',
}

interface PopupPosition {
  top: number
  left: number
}

interface PopupAnchor {
  top: number
  left: number
  bottom: number
}

interface UnderlineData extends UnderlinePosition {
  textTop: number
  textHeight: number
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function defaultUnderlineColor(match: Match): string {
  const category = match.rule.category.id.toLowerCase()
  const issueType = match.rule.issueType.toLowerCase()

  if (category.includes('grammar') || issueType.includes('grammar')) {
    return '#f4b400'
  }
  if (category.includes('typo') || category.includes('spell')) {
    return '#e53935'
  }
  if (category.includes('style') || issueType.includes('style')) {
    return '#fb8c00'
  }
  if (category.includes('clarity') || issueType.includes('clarity')) {
    return '#3e6cf4'
  }
  return '#3e6cf4'
}

function getEditorHtml(editor: HTMLDivElement) {
  const isVisuallyEmpty = editor.childNodes.length === 0
  return isVisuallyEmpty ? '' : normalizeEditorHtml(editor.innerHTML)
}

function normalizePlainTextLineEndings(text: string) {
  return text.replace(/\r\n?/gu, '\n')
}

function escapeHtmlText(text: string) {
  return text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
}

export function plainTextToEditorHtml(text: string) {
  const normalizedText = normalizePlainTextLineEndings(text)

  if (!normalizedText.trim()) {
    return ''
  }

  const paragraphs = normalizedText.split(/\n{2,}/u)
  return paragraphs
    .map((paragraphText) => {
      const lines = paragraphText.split('\n')
      const html = lines.map((line) => escapeHtmlText(line)).join('<br>')

      return `<p>${html || '<br>'}</p>`
    })
    .join('')
}

function focusEditorAtEnd(editor: HTMLDivElement) {
  const selection = window.getSelection()
  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
  editor.focus()
}

const EMPTY_EDITOR_STATE: GramadocEditorState = {
  canUndo: false,
  canRedo: false,
  hasSelection: false,
  isSelectionCollapsed: true,
  activeBlock: 'paragraph',
  marks: {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    link: false,
  },
}

function areEditorStatesEqual(
  left: GramadocEditorState,
  right: GramadocEditorState,
) {
  return (
    left.canUndo === right.canUndo &&
    left.canRedo === right.canRedo &&
    left.hasSelection === right.hasSelection &&
    left.isSelectionCollapsed === right.isSelectionCollapsed &&
    left.activeBlock === right.activeBlock &&
    left.marks.bold === right.marks.bold &&
    left.marks.italic === right.marks.italic &&
    left.marks.underline === right.marks.underline &&
    left.marks.strikethrough === right.marks.strikethrough &&
    left.marks.link === right.marks.link
  )
}

function replaceElementTag(element: Element, nextTagName: string) {
  const replacement = document.createElement(nextTagName)

  for (const child of Array.from(element.childNodes)) {
    replacement.appendChild(child)
  }

  element.replaceWith(replacement)
  return replacement
}

function unwrapElement(element: Element) {
  const parent = element.parentNode
  if (!parent) {
    return
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }

  parent.removeChild(element)
}

function wrapInlineSiblingsInParagraph(
  root: HTMLElement,
  nodes: Node[],
  insertBefore: Node | null,
) {
  const paragraph = document.createElement('p')

  for (const node of nodes) {
    paragraph.appendChild(node)
  }

  root.insertBefore(paragraph, insertBefore)
}

function normalizeNodeTree(element: Element) {
  const originalTag = element.tagName.toLowerCase()
  const tagName = TAG_NAME_MAP[originalTag] ?? originalTag
  let workingElement = element

  if (tagName !== originalTag) {
    workingElement = replaceElementTag(element, tagName)
  }

  if (
    !ALLOWED_BLOCK_TAGS.has(tagName) &&
    !ALLOWED_INLINE_TAGS.has(tagName) &&
    tagName !== 'span'
  ) {
    unwrapElement(workingElement)
    return
  }

  if (tagName === 'span') {
    unwrapElement(workingElement)
    return
  }

  for (const child of Array.from(workingElement.children)) {
    normalizeNodeTree(child)
  }

  for (const attribute of Array.from(workingElement.attributes)) {
    const shouldKeepAnchorAttribute =
      tagName === 'a' && ['href', 'rel', 'target'].includes(attribute.name)

    if (!shouldKeepAnchorAttribute) {
      workingElement.removeAttribute(attribute.name)
    }
  }

  if (tagName === 'a') {
    const href = workingElement.getAttribute('href')?.trim() ?? ''

    if (!href) {
      unwrapElement(workingElement)
      return
    }

    workingElement.setAttribute('href', href)
    workingElement.setAttribute('rel', 'noopener noreferrer')
    workingElement.setAttribute('target', '_blank')

    for (const nestedAnchor of Array.from(
      workingElement.querySelectorAll('a'),
    )) {
      if (nestedAnchor !== workingElement) {
        unwrapElement(nestedAnchor)
      }
    }
  }

  if (tagName === 'blockquote') {
    const blockquote = workingElement as HTMLElement
    const inlineNodes = Array.from(blockquote.childNodes).filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return Boolean(node.textContent?.trim())
      }

      return (
        node instanceof Element &&
        (ALLOWED_INLINE_TAGS.has(node.tagName.toLowerCase()) ||
          node.matches(INLINE_OR_TEXT_SELECTOR))
      )
    })

    if (inlineNodes.length > 0) {
      wrapInlineSiblingsInParagraph(
        blockquote,
        inlineNodes,
        inlineNodes[0] ?? null,
      )
    }
  }

  if (tagName === 'ol' || tagName === 'ul') {
    for (const child of Array.from(workingElement.childNodes)) {
      if (child instanceof HTMLLIElement) {
        continue
      }

      if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) {
        child.remove()
        continue
      }

      const listItem = document.createElement('li')
      listItem.appendChild(child)
      workingElement.appendChild(listItem)
    }
  }
}

function normalizeTopLevelContent(root: HTMLElement) {
  const inlineBuffer: Node[] = []

  const flushInlineBuffer = (insertBefore: Node | null) => {
    if (inlineBuffer.length === 0) {
      return
    }

    wrapInlineSiblingsInParagraph(root, [...inlineBuffer], insertBefore)
    inlineBuffer.length = 0
  }

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      inlineBuffer.push(child)
      continue
    }

    if (!(child instanceof Element)) {
      child.remove()
      continue
    }

    const tagName = child.tagName.toLowerCase()
    if (ALLOWED_BLOCK_TAGS.has(tagName)) {
      flushInlineBuffer(child)
      continue
    }

    inlineBuffer.push(child)
  }

  flushInlineBuffer(null)

  // Ensure there's a paragraph to type in if the last element is an HR
  const lastChild = root.lastElementChild
  if (lastChild?.tagName.toLowerCase() === 'hr') {
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    root.appendChild(p)
  }
}

function normalizeEditorHtml(html: string) {
  if (!html.trim()) {
    return ''
  }

  const root = document.createElement('div')
  root.innerHTML = html

  for (const element of Array.from(root.children)) {
    normalizeNodeTree(element)
  }

  normalizeTopLevelContent(root)

  const normalized = root.innerHTML.trim()
  return root.innerHTML.trim() ? normalized : ''
}

function selectionBelongsToEditor(editor: HTMLDivElement) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return false
  }

  const anchorNode = selection.anchorNode
  const focusNode = selection.focusNode

  return Boolean(
    anchorNode &&
      focusNode &&
      editor.contains(anchorNode) &&
      editor.contains(focusNode),
  )
}

function getActiveBlock(): EditorBlockType {
  const selection = window.getSelection()
  const anchorNode = selection?.anchorNode

  if (!anchorNode) {
    return 'paragraph'
  }

  const element =
    anchorNode instanceof Element ? anchorNode : anchorNode.parentElement

  if (!element) {
    return 'paragraph'
  }

  const blockElement = element.closest('h1, h2, h3, blockquote, ol, ul, p')

  if (!blockElement) {
    return 'paragraph'
  }

  switch (blockElement.tagName.toLowerCase()) {
    case 'h1':
      return 'heading-1'
    case 'h2':
      return 'heading-2'
    case 'h3':
      return 'heading-3'
    case 'blockquote':
      return 'blockquote'
    case 'ol':
      return 'ordered-list'
    case 'ul':
      return 'unordered-list'
    case 'p':
      return 'paragraph'
    default:
      return 'other'
  }
}

function getEditorState(editor: HTMLDivElement): GramadocEditorState {
  if (!selectionBelongsToEditor(editor)) {
    return EMPTY_EDITOR_STATE
  }

  const selection = window.getSelection()

  return {
    canUndo: document.queryCommandEnabled('undo'),
    canRedo: document.queryCommandEnabled('redo'),
    hasSelection: Boolean(selection && !selection.isCollapsed),
    isSelectionCollapsed: selection?.isCollapsed ?? true,
    activeBlock: getActiveBlock(),
    marks: {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      link: document.queryCommandState('createLink'),
    },
  }
}

function selectAllEditorContent(editor: HTMLDivElement) {
  const selection = window.getSelection()
  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(editor)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * A contenteditable React input that renders grammar underlines and replacement
 * suggestions over arbitrary HTML content.
 */
export const GramadocInput = forwardRef<
  GramadocEditorHandle,
  GramadocInputProps
>(function GramadocInput(
  {
    value,
    warnings,
    onChange,
    onMatchSelect,
    onReplacementApply,
    className,
    editorClassName,
    placeholder,
    readOnly = false,
    autoFocus = false,
    minHeight,
    getUnderlineColor = defaultUnderlineColor,
    analysisPlainText,
    onStateChange,
    layoutVersion,
  },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<number | null>(null)
  const syncFrameRef = useRef<number | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const matchesRef = useRef(warnings.matches)
  const selectionRangeRef = useRef<Range | null>(null)
  const selectionOffsetsRef = useRef<{ start: number; end: number } | null>(
    null,
  )
  const editorStateRef = useRef<GramadocEditorState>(EMPTY_EDITOR_STATE)
  const [underlines, setUnderlines] = useState<UnderlineData[]>([])
  const [hoveredMatch, setHoveredMatch] = useState<Match | null>(null)
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor | null>(null)
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null)
  const [isMobilePopup, setIsMobilePopup] = useState(false)
  const currentPlainText = htmlToPlainText(value)
  const isWarningsCurrent =
    analysisPlainText === undefined || analysisPlainText === currentPlainText
  const shouldShowWarnings = isWarningsCurrent && warnings.matches.length > 0
  const visibleUnderlines = shouldShowWarnings ? underlines : []

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const updateIsMobilePopup = (event?: MediaQueryListEvent) => {
      setIsMobilePopup(event?.matches ?? mediaQuery.matches)
    }

    updateIsMobilePopup()
    mediaQuery.addEventListener('change', updateIsMobilePopup)

    return () => {
      mediaQuery.removeEventListener('change', updateIsMobilePopup)
    }
  }, [])

  useEffect(() => {
    matchesRef.current = warnings.matches
  }, [warnings.matches])

  const emitEditorState = useCallback(() => {
    const editor = editorRef.current
    if (!editor) {
      return EMPTY_EDITOR_STATE
    }

    const nextState = getEditorState(editor)
    if (areEditorStatesEqual(editorStateRef.current, nextState)) {
      return nextState
    }

    editorStateRef.current = nextState
    onStateChange?.(nextState)
    return nextState
  }, [onStateChange])

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!editor || !selection) {
      return
    }

    const range = selectionRangeRef.current
    const offsets = selectionOffsetsRef.current

    if (offsets) {
      const textIndex = buildDomTextIndex(editor)
      const restoredRange = findTextRange(
        textIndex,
        offsets.start,
        offsets.end - offsets.start,
      )

      if (restoredRange) {
        selection.removeAllRanges()
        selection.addRange(restoredRange)
        return
      }
    }

    if (range && editor.contains(range.startContainer)) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }, [])

  const captureSelection = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0 ||
      !selectionBelongsToEditor(editor)
    ) {
      return
    }

    const range = selection.getRangeAt(0)
    selectionRangeRef.current = range.cloneRange()

    const textIndex = buildDomTextIndex(editor)
    selectionOffsetsRef.current = getSelectionOffsets(editor, textIndex)
  }, [])

  const calculateUnderlines = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !isWarningsCurrent) {
      return
    }

    const editorRect = editor.getBoundingClientRect()
    const textIndex = buildDomTextIndex(editor)
    const nextUnderlines: UnderlineData[] = []

    for (const match of matchesRef.current) {
      const range = findTextRange(textIndex, match.offset, match.length)
      if (!range) {
        continue
      }

      for (const rect of Array.from(range.getClientRects())) {
        nextUnderlines.push({
          top: rect.top - editorRect.top + rect.height - 2,
          left: rect.left - editorRect.left,
          width: rect.width,
          height: 5,
          textTop: rect.top - editorRect.top,
          textHeight: rect.height,
          match,
        })
      }
    }

    setUnderlines(nextUnderlines)
  }, [isWarningsCurrent])

  const closePopup = useCallback(() => {
    setActiveMatch(null)
    setPopupAnchor(null)
    setPopupPosition(null)
  }, [])

  useEffect(() => {
    if (shouldShowWarnings) {
      return
    }

    overlayRef.current?.replaceChildren()
    setUnderlines([])
    setHoveredMatch(null)
    closePopup()
  }, [closePopup, shouldShowWarnings])

  const selectMatch = useCallback(
    (match: Match) => {
      const editor = editorRef.current
      if (!editor) {
        return
      }

      const textIndex = buildDomTextIndex(editor)
      const range = findTextRange(textIndex, match.offset, match.length)
      if (range) {
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
          editor.focus()
          // Ensure we capture this new selection state
          captureSelection()
          emitEditorState()
        }
      }
    },
    [captureSelection, emitEditorState],
  )

  const openPopup = useCallback(
    (
      match: Match,
      rect: { top: number; left: number; bottom: number },
      shouldSelect = false,
    ) => {
      const editor = editorRef.current
      if (!editor) {
        return
      }

      const editorRect = editor.getBoundingClientRect()
      setActiveMatch(match)
      setPopupAnchor(rect)
      setPopupPosition({
        top: rect.bottom - editorRect.top + 8,
        left: rect.left - editorRect.left,
      })
      onMatchSelect?.(match)

      if (shouldSelect) {
        // Explicitly select the word and focus the editor
        selectMatch(match)
      }
    },
    [onMatchSelect, selectMatch],
  )

  const emitChange = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !onChange) {
      return
    }

    onChange(getEditorHtml(editor))
  }, [onChange])

  const syncEditorFromDom = useCallback(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const normalizedHtml = normalizeEditorHtml(editor.innerHTML)

    if (editor.innerHTML !== normalizedHtml) {
      captureSelection()
      editor.innerHTML = normalizedHtml
      restoreSelection()
    }

    captureSelection()
    emitChange()
    emitEditorState()
    window.requestAnimationFrame(() => {
      calculateUnderlines()
    })
  }, [
    calculateUnderlines,
    captureSelection,
    emitChange,
    emitEditorState,
    restoreSelection,
  ])

  const scheduleEditorSync = useCallback(() => {
    if (syncFrameRef.current !== null) {
      window.cancelAnimationFrame(syncFrameRef.current)
    }

    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = null
      syncEditorFromDom()
    })
  }, [syncEditorFromDom])

  const runEditorCommand = useCallback(
    (command: string, valueArg?: string) => {
      const editor = editorRef.current
      if (!editor || readOnly) {
        return false
      }

      editor.focus()
      restoreSelection()

      const didRun = document.execCommand(command, false, valueArg)
      if (!didRun) {
        return false
      }

      captureSelection()

      const normalizedHtml = normalizeEditorHtml(editor.innerHTML)
      if (editor.innerHTML !== normalizedHtml) {
        editor.innerHTML = normalizedHtml
        restoreSelection()
      }

      editor.normalize()
      closePopup()
      setHoveredMatch(null)
      setUnderlines([])
      emitChange()
      window.requestAnimationFrame(() => {
        calculateUnderlines()
        emitEditorState()
      })
      return true
    },
    [
      calculateUnderlines,
      captureSelection,
      closePopup,
      emitChange,
      emitEditorState,
      readOnly,
      restoreSelection,
    ],
  )

  const insertPlainText = useCallback(
    (text: string) => {
      if (!text) {
        return
      }

      const normalizedText = normalizePlainTextLineEndings(text)
      const command = normalizedText.includes('\n')
        ? 'insertHTML'
        : 'insertText'
      const valueArg =
        command === 'insertHTML'
          ? plainTextToEditorHtml(normalizedText)
          : normalizedText

      runEditorCommand(command, valueArg)
    },
    [runEditorCommand],
  )

  const applyReplacement = useCallback(
    (replacement: string) => {
      const editor = editorRef.current
      if (!editor || !activeMatch) {
        return
      }

      const textIndex = buildDomTextIndex(editor)
      const range = findTextRange(
        textIndex,
        activeMatch.offset,
        activeMatch.length,
      )
      if (!range) {
        return
      }

      range.deleteContents()
      range.insertNode(document.createTextNode(replacement))

      const normalizedHtml = normalizeEditorHtml(editor.innerHTML)
      if (editor.innerHTML !== normalizedHtml) {
        editor.innerHTML = normalizedHtml
      }

      editor.normalize()

      const newIndex = buildDomTextIndex(editor)
      const restoredRange = findTextRange(
        newIndex,
        activeMatch.offset + replacement.length,
        0,
      )
      if (restoredRange) {
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(restoredRange)
        }
      }
      editor.focus()

      const nextValue = getEditorHtml(editor)
      onChange?.(nextValue)
      onReplacementApply?.({
        match: activeMatch,
        replacement,
        value: nextValue,
      })

      closePopup()
      calculateUnderlines()
    },
    [
      activeMatch,
      calculateUnderlines,
      closePopup,
      onChange,
      onReplacementApply,
    ],
  )

  const handleEditorMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const editor = editorRef.current
      if (!editor) {
        return
      }

      const editorRect = editor.getBoundingClientRect()
      const mouseX = event.clientX - editorRect.left
      const mouseY = event.clientY - editorRect.top

      let foundMatch: Match | null = null
      let foundRect: { top: number; left: number; bottom: number } | null = null

      for (const underline of visibleUnderlines) {
        if (
          mouseX >= underline.left &&
          mouseX <= underline.left + underline.width &&
          mouseY >= underline.textTop &&
          mouseY <= underline.textTop + underline.textHeight
        ) {
          foundMatch = underline.match
          foundRect = {
            top: editorRect.top + underline.textTop,
            left: editorRect.left + underline.left,
            bottom: editorRect.top + underline.textTop + underline.textHeight,
          }
          break
        }
      }

      if (foundMatch === hoveredMatch) {
        return
      }

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }

      setHoveredMatch(foundMatch)

      if (foundMatch && foundRect) {
        hoverTimeoutRef.current = window.setTimeout(() => {
          openPopup(foundMatch, foundRect)
        }, 300)
      }
    },
    [hoveredMatch, openPopup, visibleUnderlines],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (readOnly) {
        return
      }

      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'b':
            event.preventDefault()
            runEditorCommand('bold')
            break
          case 'i':
            event.preventDefault()
            runEditorCommand('italic')
            break
          case 'u':
            event.preventDefault()
            runEditorCommand('underline')
            break
          case 'z':
            event.preventDefault()
            if (event.shiftKey) {
              runEditorCommand('redo')
              break
            }
            runEditorCommand('undo')
            break
        }

        return
      }

      if (event.key === 'Enter') {
        captureSelection()
        scheduleEditorSync()
      }
    },
    [readOnly, runEditorCommand, scheduleEditorSync, captureSelection],
  )

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const currentHtml = getEditorHtml(editor)

    if (currentHtml !== value) {
      captureSelection()
      editor.innerHTML = normalizeEditorHtml(value)
      restoreSelection()

      if (autoFocus && !selectionRangeRef.current) {
        focusEditorAtEnd(editor)
      }
    }
  }, [autoFocus, value, captureSelection, restoreSelection])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !autoFocus) {
      return
    }

    focusEditorAtEnd(editor)
  }, [autoFocus])

  useEffect(() => {
    emitEditorState()
  }, [emitEditorState])

  useEffect(() => {
    if (!shouldShowWarnings) {
      setUnderlines([])
      return
    }

    const frameId = window.requestAnimationFrame(calculateUnderlines)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [calculateUnderlines, shouldShowWarnings])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(calculateUnderlines)
    const handleResize = () => calculateUnderlines()

    observerRef.current?.disconnect()
    observerRef.current = new MutationObserver(calculateUnderlines)

    const observer = observerRef.current
    observer.observe(editorRef.current as Node, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    window.addEventListener('resize', handleResize)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [calculateUnderlines])

  useEffect(() => {
    void layoutVersion

    const frameId = window.requestAnimationFrame(() => {
      calculateUnderlines()
      emitEditorState()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [calculateUnderlines, emitEditorState, layoutVersion])

  useLayoutEffect(() => {
    const editor = editorRef.current
    const popup = popupRef.current
    if (!editor || !popup || !popupAnchor || !activeMatch) {
      return
    }

    const editorRect = editor.getBoundingClientRect()
    const popupRect = popup.getBoundingClientRect()
    const gutter = 8
    const spaceBelow = window.innerHeight - popupAnchor.bottom
    const spaceAbove = popupAnchor.top
    const shouldFlipAbove =
      popupRect.height + gutter > spaceBelow && spaceAbove > spaceBelow

    const maxLeft = Math.max(0, editorRect.width - popupRect.width)
    const desiredLeft = popupAnchor.left - editorRect.left
    const clampedLeft = Math.min(Math.max(0, desiredLeft), maxLeft)

    const top = shouldFlipAbove
      ? popupAnchor.top - editorRect.top - popupRect.height - gutter
      : popupAnchor.bottom - editorRect.top + gutter

    setPopupPosition({
      top: Math.max(0, top),
      left: clampedLeft,
    })
  }, [activeMatch, popupAnchor])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest('.gramadoc-input__popup') &&
        !target.closest('.gramadoc-input__underline')
      ) {
        closePopup()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [closePopup])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }

      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = editorRef.current
      if (!editor) {
        return
      }

      if (selectionBelongsToEditor(editor)) {
        captureSelection()
      }

      emitEditorState()
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange)
  }, [captureSelection, emitEditorState])

  useImperativeHandle(
    ref,
    (): GramadocEditorHandle => ({
      focus: () => {
        const editor = editorRef.current
        if (!editor) {
          return
        }

        editor.focus()
        captureSelection()
        emitEditorState()
      },
      refreshLayout: () => {
        window.requestAnimationFrame(() => {
          calculateUnderlines()
          emitEditorState()
        })
      },
      undo: () => {
        runEditorCommand('undo')
      },
      redo: () => {
        runEditorCommand('redo')
      },
      cut: () => {
        runEditorCommand('cut')
      },
      copy: () => {
        runEditorCommand('copy')
      },
      selectAll: () => {
        const editor = editorRef.current
        if (!editor) {
          return
        }

        editor.focus()
        selectAllEditorContent(editor)
        captureSelection()
        emitEditorState()
      },
      insertText: (text) => {
        if (!text) {
          return
        }

        insertPlainText(text)
      },
      toggleBold: () => {
        runEditorCommand('bold')
      },
      toggleItalic: () => {
        runEditorCommand('italic')
      },
      toggleUnderline: () => {
        runEditorCommand('underline')
      },
      toggleStrikethrough: () => {
        runEditorCommand('strikeThrough')
      },
      setParagraph: () => {
        runEditorCommand('formatBlock', 'p')
      },
      setHeading: (level) => {
        runEditorCommand('formatBlock', `h${level}`)
      },
      toggleBlockquote: () => {
        const editor = editorRef.current
        if (!editor) {
          return
        }

        if (getEditorState(editor).activeBlock === 'blockquote') {
          runEditorCommand('formatBlock', 'p')
          return
        }

        runEditorCommand('formatBlock', 'blockquote')
      },
      toggleOrderedList: () => {
        runEditorCommand('insertOrderedList')
      },
      toggleUnorderedList: () => {
        runEditorCommand('insertUnorderedList')
      },
      createLink: (url) => {
        if (!url.trim()) {
          return
        }

        runEditorCommand('createLink', url)
      },
      removeLink: () => {
        runEditorCommand('unlink')
      },
      insertHorizontalRule: () => {
        runEditorCommand('insertHorizontalRule')
      },
      clearFormatting: () => {
        runEditorCommand('removeFormat')
      },
      showMatch: (match) => {
        const underline = underlines.find(
          (u) =>
            u.match.offset === match.offset &&
            u.match.length === match.length &&
            u.match.rule.id === match.rule.id,
        )

        if (!underline) {
          return
        }

        const editor = editorRef.current
        if (!editor) {
          return
        }

        const scrollContainer = editor.closest('.document-scroller') || window
        const editorRect = editor.getBoundingClientRect()
        const containerRect =
          scrollContainer instanceof HTMLElement
            ? scrollContainer.getBoundingClientRect()
            : { top: 0, left: 0 }

        const viewHeight =
          scrollContainer === window
            ? window.innerHeight
            : (scrollContainer as HTMLElement).clientHeight

        const offset = viewHeight * 0.3

        // Calculate position relative to container's scrollable content
        const matchViewportTop = editorRect.top + underline.textTop
        const matchRelativeTop = matchViewportTop - containerRect.top
        const currentScroll =
          scrollContainer === window
            ? window.scrollY
            : (scrollContainer as HTMLElement).scrollTop

        const targetTop = currentScroll + matchRelativeTop - offset

        scrollContainer.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        })

        // Delay opening the popup slightly to let the scroll start and avoid immediate closing
        // from the click outside listener if propagation wasn't fully stopped.
        window.setTimeout(() => {
          const freshEditorRect = editor.getBoundingClientRect()
          setActiveMatch(underline.match)
          setPopupAnchor({
            top: freshEditorRect.top + underline.textTop,
            left: freshEditorRect.left + underline.left,
            bottom:
              freshEditorRect.top + underline.textTop + underline.textHeight,
          })
          // Pre-calculate position relative to the editor container so it stays "roughly"
          // correct while the smooth scroll animation is ongoing.
          setPopupPosition({
            top: underline.textTop + underline.textHeight + 8,
            left: underline.left,
          })

          onMatchSelect?.(underline.match)
          selectMatch(underline.match)
        }, 50)
      },
      getState: () => editorStateRef.current,
    }),
    [
      calculateUnderlines,
      captureSelection,
      emitEditorState,
      insertPlainText,
      runEditorCommand,
      underlines,
      onMatchSelect,
      selectMatch,
    ],
  )

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper tracks hover state across the editor and overlay surfaces
    <div
      className={cx('gramadoc-input', className)}
      onMouseMove={handleEditorMouseMove}
      onMouseLeave={() => {
        setHoveredMatch(null)

        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = null
        }
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: contentEditable is the intended interactive editing surface */}
      <div
        ref={editorRef}
        className={cx('gramadoc-input__editor', editorClassName)}
        contentEditable={!readOnly}
        spellCheck={false}
        data-placeholder={placeholder}
        onBlur={() => {
          emitEditorState()
        }}
        onFocus={() => {
          captureSelection()
          emitEditorState()
        }}
        onInput={() => {
          captureSelection()
          closePopup()
          setHoveredMatch(null)
          scheduleEditorSync()
        }}
        onPaste={(event) => {
          if (readOnly) {
            return
          }

          const clipboardData = event.clipboardData
          const html = clipboardData?.getData('text/html').trim() ?? ''
          const text = clipboardData?.getData('text/plain') ?? ''

          if (!html && !text) {
            return
          }

          event.preventDefault()

          if (html) {
            runEditorCommand('insertHTML', html)
            return
          }

          insertPlainText(text)
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          captureSelection()
          emitEditorState()
        }}
        onMouseUp={() => {
          captureSelection()
          emitEditorState()
        }}
        style={{
          minHeight,
        }}
        suppressContentEditableWarning
      />

      <div ref={overlayRef} className="gramadoc-input__overlay">
        {visibleUnderlines.map((underline) => (
          <button
            type="button"
            key={`${underline.match.rule.id}-${underline.match.offset}-${underline.match.length}-${underline.top}-${underline.left}-${underline.width}-${underline.height}`}
            aria-label={`Show details for ${underline.match.shortMessage || underline.match.rule.category.name}`}
            className={cx(
              'gramadoc-input__underline',
              hoveredMatch === underline.match &&
                'gramadoc-input__underline--hovered',
            )}
            style={{
              top: underline.top,
              left: underline.left,
              width: underline.width,
              height: underline.height,
              backgroundColor: (getUnderlineColor as UnderlineColorResolver)(
                underline.match,
              ),
            }}
            onClick={(event) => {
              event.stopPropagation()

              const editorRect = editorRef.current?.getBoundingClientRect()
              if (!editorRect) {
                return
              }

              openPopup(
                underline.match,
                {
                  top: editorRect.top + underline.textTop,
                  left: editorRect.left + underline.left,
                  bottom:
                    editorRect.top + underline.textTop + underline.textHeight,
                },
                true,
              )
            }}
            onTouchEnd={(event) => {
              // Only handle if it's a direct touch on the underline
              event.preventDefault()
              event.stopPropagation()

              const editorRect = editorRef.current?.getBoundingClientRect()
              if (!editorRect) {
                return
              }

              openPopup(
                underline.match,
                {
                  top: editorRect.top + underline.textTop,
                  left: editorRect.left + underline.left,
                  bottom:
                    editorRect.top + underline.textTop + underline.textHeight,
                },
                true,
              )
            }}
          />
        ))}
      </div>

      {activeMatch && popupPosition && (
        <div
          ref={popupRef}
          className="gramadoc-input__popup"
          role="dialog"
          style={
            isMobilePopup
              ? undefined
              : {
                  top: popupPosition.top,
                  left: popupPosition.left,
                }
          }
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current)
            }
          }}
          onMouseLeave={() => {
            if (!hoveredMatch) {
              closePopup()
            }
          }}
        >
          <div className="gramadoc-input__popup-header">
            <span className="gramadoc-input__popup-title">
              {activeMatch.shortMessage || activeMatch.rule.category.name}
            </span>
            <button
              type="button"
              className="gramadoc-input__popup-close"
              onClick={closePopup}
            >
              ×
            </button>
          </div>
          <div className="gramadoc-input__popup-message">
            {activeMatch.message}
          </div>
          {activeMatch.replacements.length > 0 && (
            <div className="gramadoc-input__popup-replacements">
              {activeMatch.replacements.slice(0, 5).map((replacement) => (
                <button
                  type="button"
                  key={replacement.value}
                  className={
                    replacement.value === ''
                      ? 'gramadoc-input__popup-replacement gramadoc-input__popup-replacement--remove'
                      : 'gramadoc-input__popup-replacement'
                  }
                  onClick={() => applyReplacement(replacement.value)}
                >
                  {replacement.value === '' ? 'Remove' : replacement.value}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="gramadoc-input__popup-dismiss"
            onClick={closePopup}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
})

export default GramadocInput
