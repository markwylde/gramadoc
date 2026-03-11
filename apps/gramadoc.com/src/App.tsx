import {
  type GramadocEditorHandle,
  type GramadocEditorState,
  GramadocInput,
  useGrammerAnalysis,
} from '@markwylde/gramadoc-react'
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import '@markwylde/gramadoc-react/styles.css'
import './App.css'

const TERMS_URL = 'https://puzed.com/legal/terms'
const RELEASES_URL = 'https://github.com/markwylde/gramadoc/releases'
const RELEASE_TAG = import.meta.env.VITE_RELEASE_TAG || 'dev'
const RELEASE_URL =
  import.meta.env.VITE_RELEASE_URL ||
  (RELEASE_TAG.startsWith('v')
    ? `${RELEASES_URL}/tag/${RELEASE_TAG}`
    : RELEASES_URL)

type Theme =
  | 'light-default'
  | 'light-sepia'
  | 'light-solarized'
  | 'light-contrast'
  | 'light-minimal'
  | 'dark-default'
  | 'dark-deep'
  | 'dark-solarized'
  | 'dark-nord'
  | 'dark-midnight'

type MenuKey =
  | 'file'
  | 'edit'
  | 'insert'
  | 'format'
  | 'view'
  | 'theme'
  | 'tools'
  | 'help'

type DialogKey =
  | null
  | 'shortcuts'
  | 'word-count'
  | 'grammar'
  | 'link'
  | 'find'
  | 'replace'
  | 'confirm-new'
  | 'about'

type SaveState = 'idle' | 'saving' | 'saved' | 'shared' | 'error'

type AppCommand =
  | 'file.new'
  | 'file.duplicate'
  | 'file.download-html'
  | 'file.download-text'
  | 'file.share'
  | 'file.print'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.select-all'
  | 'edit.find'
  | 'edit.replace'
  | 'insert.link'
  | 'insert.horizontal-rule'
  | 'insert.unordered-list'
  | 'insert.ordered-list'
  | 'format.paragraph'
  | 'format.heading-1'
  | 'format.heading-2'
  | 'format.heading-3'
  | 'format.bold'
  | 'format.italic'
  | 'format.underline'
  | 'format.strikethrough'
  | 'format.blockquote'
  | 'format.clear'
  | 'view.zoom-in'
  | 'view.zoom-out'
  | 'view.zoom-reset'
  | 'view.toggle-status-bar'
  | 'view.toggle-focus-mode'
  | 'tools.word-count'
  | 'tools.grammar-summary'
  | 'tools.toggle-issues'
  | 'help.shortcuts'
  | 'help.about'
  | 'help.feedback'

type MenuEntry =
  | {
      type: 'item'
      label: string
      command?: AppCommand
      shortcut?: string
      disabled?: boolean
      checked?: boolean
      onSelect?: () => void
    }
  | {
      type: 'separator'
    }
  | {
      type: 'section'
      label: string
    }

interface ThemeOption {
  id: Theme
  label: string
  group: 'light' | 'dark'
}

interface StoredDocument {
  id: string
  title: string
  content: string
  theme: Theme
  zoom: number
  showStatusBar: boolean
  focusMode: boolean
  showIssues: boolean
  createdAt: string
  updatedAt: string
}

interface ShortcutDefinition {
  label: string
  mac: string
  windows: string
}

const DEFAULT_CONTENT =
  '<h1>New Document</h1><p>Start writing something amazing here...</p>'
const STORAGE_KEY = 'gramadoc-current-document'
const API_BANNER_STORAGE_KEY = 'gramadoc-api-banner-dismissed'
const MENU_ORDER: MenuKey[] = [
  'file',
  'edit',
  'insert',
  'format',
  'view',
  'theme',
  'tools',
  'help',
]
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
const ZOOM_LEVELS = [75, 90, 100, 110, 125, 150]
const THEME_OPTIONS: ThemeOption[] = [
  { id: 'light-default', label: 'Default Light', group: 'light' },
  { id: 'light-sepia', label: 'Sepia Paper', group: 'light' },
  { id: 'light-solarized', label: 'Solarized Light', group: 'light' },
  { id: 'light-contrast', label: 'High Contrast', group: 'light' },
  { id: 'light-minimal', label: 'Minimal Gray', group: 'light' },
  { id: 'dark-default', label: 'Default Dark', group: 'dark' },
  { id: 'dark-deep', label: 'Deep Space', group: 'dark' },
  { id: 'dark-solarized', label: 'Solarized Dark', group: 'dark' },
  { id: 'dark-nord', label: 'Nord Blue', group: 'dark' },
  { id: 'dark-midnight', label: 'Midnight', group: 'dark' },
]
const SHORTCUTS: ShortcutDefinition[] = [
  { label: 'Bold', mac: 'Cmd+B', windows: 'Ctrl+B' },
  { label: 'Italic', mac: 'Cmd+I', windows: 'Ctrl+I' },
  { label: 'Underline', mac: 'Cmd+U', windows: 'Ctrl+U' },
  { label: 'Undo', mac: 'Cmd+Z', windows: 'Ctrl+Z' },
  { label: 'Redo', mac: 'Shift+Cmd+Z', windows: 'Ctrl+Shift+Z' },
  { label: 'Select all', mac: 'Cmd+A', windows: 'Ctrl+A' },
  { label: 'Find', mac: 'Cmd+F', windows: 'Ctrl+F' },
  { label: 'Replace', mac: 'Cmd+H', windows: 'Ctrl+H' },
]

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeFileName(value: string) {
  const cleaned = value.trim().replace(/[^a-z0-9-_]+/gi, '-')
  return (
    cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'gramadoc-document'
  )
}

function clampZoom(value: number) {
  return Math.max(75, Math.min(150, value))
}

function formatTime(iso: string | null) {
  if (!iso) {
    return 'Not saved yet'
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function getInitialTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark-default'
    : 'light-default'
}

function createDefaultDocument(): StoredDocument {
  const now = new Date().toISOString()

  return {
    id: createId(),
    title: 'Untitled Document',
    content: DEFAULT_CONTENT,
    theme: getInitialTheme(),
    zoom: 100,
    showStatusBar: true,
    focusMode: false,
    showIssues: true,
    createdAt: now,
    updatedAt: now,
  }
}

function readStoredDocument() {
  const fallback = createDefaultDocument()
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredDocument>
    return {
      ...fallback,
      ...parsed,
      content: parsed.content || fallback.content,
      title: parsed.title || fallback.title,
      theme: parsed.theme || fallback.theme,
      zoom: clampZoom(parsed.zoom ?? fallback.zoom),
      showStatusBar: parsed.showStatusBar ?? fallback.showStatusBar,
      focusMode: parsed.focusMode ?? fallback.focusMode,
      showIssues: parsed.showIssues ?? fallback.showIssues,
      createdAt: parsed.createdAt || fallback.createdAt,
      updatedAt: parsed.updatedAt || fallback.updatedAt,
    }
  } catch {
    return fallback
  }
}

function isApiBannerVisible() {
  return localStorage.getItem(API_BANNER_STORAGE_KEY) !== 'true'
}

function ensureUrlProtocol(value: string) {
  if (!value.trim()) {
    return ''
  }

  if (/^[a-z]+:\/\//i.test(value)) {
    return value
  }

  return `https://${value}`
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function runBrowserFind(value: string) {
  const finder = window as Window & {
    find?: (
      searchString: string,
      caseSensitive?: boolean,
      backwards?: boolean,
      wrapAround?: boolean,
    ) => boolean
  }

  return finder.find?.(value, false, false, true) ?? false
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]'),
  )
}

function App() {
  const editorRef = useRef<GramadocEditorHandle>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const menuButtonRefs = useRef<Record<MenuKey, HTMLButtonElement | null>>({
    file: null,
    edit: null,
    insert: null,
    format: null,
    view: null,
    theme: null,
    tools: null,
    help: null,
  })

  const [documentState, setDocumentState] = useState<StoredDocument>(() =>
    readStoredDocument(),
  )
  const [editorState, setEditorState] =
    useState<GramadocEditorState>(EMPTY_EDITOR_STATE)
  const [menuOpen, setMenuOpen] = useState<MenuKey | null>(null)
  const [activeDialog, setActiveDialog] = useState<DialogKey>(null)
  const [showWarningsSidebar, setShowWarningsSidebar] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    documentState.updatedAt,
  )
  const [linkUrl, setLinkUrl] = useState('https://')
  const [findQuery, setFindQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [findMessage, setFindMessage] = useState('')
  const [showApiBanner, setShowApiBanner] = useState(() => isApiBannerVisible())

  const analysis = useGrammerAnalysis({ value: documentState.content })
  const visibleWarnings = useMemo(
    () =>
      documentState.showIssues
        ? analysis.warnings
        : { ...analysis.warnings, matches: [] },
    [analysis.warnings, documentState.showIssues],
  )
  const wordEntries = useMemo(
    () =>
      Object.entries(analysis.wordCounts).sort(
        (left, right) => right[1] - left[1],
      ),
    [analysis.wordCounts],
  )
  const wordCount = useMemo(
    () => wordEntries.reduce((total, [, count]) => total + count, 0),
    [wordEntries],
  )
  const issueCount = visibleWarnings.matches.length
  const layoutVersion = `${documentState.zoom}:${documentState.showStatusBar}:${documentState.focusMode}:${menuOpen ?? 'none'}:${activeDialog ?? 'none'}`
  const currentThemeOption = THEME_OPTIONS.find(
    (option) => option.id === documentState.theme,
  )
  const focusEditor = useCallback(() => {
    editorRef.current?.focus()
  }, [])
  const closeDialog = useCallback(() => {
    setActiveDialog(null)
    window.requestAnimationFrame(() => {
      focusEditor()
    })
  }, [focusEditor])

  useEffect(() => {
    if (!isResizing) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX
      setSidebarWidth(Math.max(240, Math.min(600, nextWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', documentState.theme)
  }, [documentState.theme])

  useEffect(() => {
    document.title = `${documentState.title} - Gramadoc`
  }, [documentState.title])

  useEffect(() => {
    if (!dirty) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const updatedDocument = {
        ...documentState,
        updatedAt: new Date().toISOString(),
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocument))
        setDocumentState(updatedDocument)
        setDirty(false)
        setSaveState('saved')
        setLastSavedAt(updatedDocument.updatedAt)
      } catch {
        setSaveState('error')
      }
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [dirty, documentState])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        menuBarRef.current &&
        !menuBarRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeDialog && event.key === 'Escape') {
        event.preventDefault()
        closeDialog()
        return
      }

      const isModifierPressed = event.metaKey || event.ctrlKey
      if (!isModifierPressed) {
        if (event.key === 'Escape') {
          setMenuOpen(null)
          if (activeDialog) {
            closeDialog()
          }
        }
        return
      }

      if (isTextEntryTarget(event.target)) {
        return
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setActiveDialog('find')
        setMenuOpen(null)
      }

      if (event.key.toLowerCase() === 'h') {
        event.preventDefault()
        setActiveDialog('replace')
        setMenuOpen(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeDialog, closeDialog])

  useEffect(() => {
    if (!activeDialog) {
      previousFocusRef.current?.focus()
      return
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null

    const frameId = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'input, button, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
      )
      firstFocusable?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [activeDialog])

  function updateDocument(
    updater: (current: StoredDocument) => StoredDocument,
    markDirty = true,
  ) {
    setDocumentState((current) => {
      const next = updater(current)
      return next
    })

    if (markDirty) {
      setSaveState('saving')
      setDirty(true)
    }
  }

  function openDialog(dialog: Exclude<DialogKey, null>) {
    setMenuOpen(null)
    setActiveDialog(dialog)
  }

  function focusFirstMenuItem(menu: MenuKey) {
    window.requestAnimationFrame(() => {
      const item = menuBarRef.current?.querySelector<HTMLElement>(
        `[data-menu-panel="${menu}"] .menu-dropdown-item:not([disabled])`,
      )
      item?.focus()
    })
  }

  function openMenu(menu: MenuKey, focusFirst = false) {
    setMenuOpen(menu)
    if (focusFirst) {
      focusFirstMenuItem(menu)
    }
  }

  function moveToAdjacentMenu(current: MenuKey, direction: 1 | -1) {
    const index = MENU_ORDER.indexOf(current)
    const nextIndex =
      (index + direction + MENU_ORDER.length) % MENU_ORDER.length
    const nextMenu = MENU_ORDER[nextIndex]
    openMenu(nextMenu, true)
    menuButtonRefs.current[nextMenu]?.focus()
  }

  function handleContentChange(nextValue: string) {
    setDocumentState((current) => {
      if (current.content === nextValue) {
        return current
      }

      setSaveState('saving')
      setDirty(true)
      return {
        ...current,
        content: nextValue || '',
      }
    })
  }

  function handleTitleChange(nextValue: string) {
    updateDocument(
      (current) => ({
        ...current,
        title: nextValue,
      }),
      true,
    )
  }

  async function handlePasteFromClipboard() {
    const text = await navigator.clipboard.readText()
    editorRef.current?.insertText(text)
  }

  function handleNewDocumentConfirmed() {
    const fresh = createDefaultDocument()
    setDocumentState(fresh)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    setDirty(false)
    setSaveState('saved')
    setLastSavedAt(fresh.updatedAt)
    setActiveDialog(null)
  }

  function handleDuplicateDocument() {
    const now = new Date().toISOString()
    const duplicatedTitle = documentState.title.endsWith('Copy')
      ? documentState.title
      : `${documentState.title} Copy`

    setDocumentState((current) => ({
      ...current,
      id: createId(),
      title: duplicatedTitle,
      createdAt: now,
      updatedAt: now,
    }))
    setDirty(true)
  }

  function handleDownloadHtml() {
    downloadFile(
      `${sanitizeFileName(documentState.title)}.html`,
      documentState.content,
      'text/html;charset=utf-8',
    )
  }

  function handleDownloadText() {
    downloadFile(
      `${sanitizeFileName(documentState.title)}.txt`,
      analysis.plainText,
      'text/plain;charset=utf-8',
    )
  }

  function handlePrintDocument() {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      return
    }

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(documentState.title)}</title>
    <style>
      body {
        font-family: Georgia, serif;
        margin: 48px;
        color: #1f2937;
        line-height: 1.7;
      }
      h1, h2, h3 {
        line-height: 1.2;
      }
      blockquote {
        margin: 24px 0;
        padding-left: 16px;
        border-left: 3px solid #d1d5db;
        color: #4b5563;
      }
      hr {
        border: 0;
        border-top: 1px solid #d1d5db;
        margin: 24px 0;
      }
    </style>
  </head>
  <body>${documentState.content}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  async function handleShareDocument() {
    const sharePayload = {
      title: documentState.title,
      text: analysis.plainText.slice(0, 4000),
    }

    try {
      if (navigator.share) {
        await navigator.share(sharePayload)
      } else {
        await navigator.clipboard.writeText(
          `${documentState.title}\n\n${analysis.plainText}`,
        )
      }
      setSaveState('shared')
      window.setTimeout(() => {
        setSaveState('saved')
      }, 1500)
    } catch {
      setSaveState('error')
    }
  }

  function runFind(searchQuery: string) {
    const value = searchQuery.trim()
    if (!value) {
      setFindMessage('Enter text to find.')
      return
    }

    focusEditor()
    const found = runBrowserFind(value)
    setFindMessage(found ? `Found "${value}".` : `No matches for "${value}".`)
  }

  function runReplace() {
    const value = findQuery.trim()
    if (!value) {
      setFindMessage('Enter text to replace.')
      return
    }

    focusEditor()
    const selectionText = window.getSelection()?.toString() ?? ''
    const found = selectionText === value || runBrowserFind(value)

    if (!found) {
      setFindMessage(`No matches for "${value}".`)
      return
    }

    editorRef.current?.insertText(replaceText)
    setFindMessage(`Replaced "${value}".`)
  }

  function changeTheme(theme: Theme) {
    updateDocument(
      (current) => ({
        ...current,
        theme,
      }),
      true,
    )
  }

  function executeCommand(command: AppCommand) {
    setMenuOpen(null)

    switch (command) {
      case 'file.new':
        if (dirty) {
          setActiveDialog('confirm-new')
        } else {
          handleNewDocumentConfirmed()
        }
        break
      case 'file.duplicate':
        handleDuplicateDocument()
        break
      case 'file.download-html':
        handleDownloadHtml()
        break
      case 'file.download-text':
        handleDownloadText()
        break
      case 'file.share':
        void handleShareDocument()
        break
      case 'file.print':
        handlePrintDocument()
        break
      case 'edit.undo':
        editorRef.current?.undo()
        break
      case 'edit.redo':
        editorRef.current?.redo()
        break
      case 'edit.cut':
        editorRef.current?.cut()
        break
      case 'edit.copy':
        editorRef.current?.copy()
        break
      case 'edit.paste':
        void handlePasteFromClipboard()
        break
      case 'edit.select-all':
        editorRef.current?.selectAll()
        break
      case 'edit.find':
        openDialog('find')
        break
      case 'edit.replace':
        openDialog('replace')
        break
      case 'insert.link':
        setLinkUrl('https://')
        openDialog('link')
        break
      case 'insert.horizontal-rule':
        editorRef.current?.insertHorizontalRule()
        break
      case 'insert.unordered-list':
        editorRef.current?.toggleUnorderedList()
        break
      case 'insert.ordered-list':
        editorRef.current?.toggleOrderedList()
        break
      case 'format.paragraph':
        editorRef.current?.setParagraph()
        break
      case 'format.heading-1':
        editorRef.current?.setHeading(1)
        break
      case 'format.heading-2':
        editorRef.current?.setHeading(2)
        break
      case 'format.heading-3':
        editorRef.current?.setHeading(3)
        break
      case 'format.bold':
        editorRef.current?.toggleBold()
        break
      case 'format.italic':
        editorRef.current?.toggleItalic()
        break
      case 'format.underline':
        editorRef.current?.toggleUnderline()
        break
      case 'format.strikethrough':
        editorRef.current?.toggleStrikethrough()
        break
      case 'format.blockquote':
        editorRef.current?.toggleBlockquote()
        break
      case 'format.clear':
        editorRef.current?.clearFormatting()
        break
      case 'view.zoom-in':
        updateDocument(
          (current) => ({
            ...current,
            zoom: clampZoom(current.zoom + 10),
          }),
          true,
        )
        break
      case 'view.zoom-out':
        updateDocument(
          (current) => ({
            ...current,
            zoom: clampZoom(current.zoom - 10),
          }),
          true,
        )
        break
      case 'view.zoom-reset':
        updateDocument(
          (current) => ({
            ...current,
            zoom: 100,
          }),
          true,
        )
        break
      case 'view.toggle-status-bar':
        updateDocument(
          (current) => ({
            ...current,
            showStatusBar: !current.showStatusBar,
          }),
          true,
        )
        break
      case 'view.toggle-focus-mode':
        updateDocument(
          (current) => ({
            ...current,
            focusMode: !current.focusMode,
          }),
          true,
        )
        break
      case 'tools.word-count':
        openDialog('word-count')
        break
      case 'tools.grammar-summary':
        openDialog('grammar')
        break
      case 'tools.toggle-issues':
        updateDocument(
          (current) => ({
            ...current,
            showIssues: !current.showIssues,
          }),
          true,
        )
        break
      case 'help.shortcuts':
        openDialog('shortcuts')
        break
      case 'help.about':
        openDialog('about')
        break
      case 'help.feedback':
        window.open(TERMS_URL, '_blank', 'noopener,noreferrer')
        break
    }
  }

  const menuEntries: Record<MenuKey, MenuEntry[]> = {
    file: [
      {
        type: 'item',
        label: 'New document',
        command: 'file.new',
        shortcut: 'Cmd/Ctrl+N',
      },
      {
        type: 'item',
        label: 'Duplicate document',
        command: 'file.duplicate',
      },
      { type: 'separator' },
      { type: 'item', label: 'Download HTML', command: 'file.download-html' },
      {
        type: 'item',
        label: 'Download plain text',
        command: 'file.download-text',
      },
      {
        type: 'item',
        label: 'Share',
        command: 'file.share',
      },
      {
        type: 'item',
        label: 'Print',
        command: 'file.print',
        shortcut: 'Cmd/Ctrl+P',
      },
    ],
    edit: [
      {
        type: 'item',
        label: 'Undo',
        command: 'edit.undo',
        shortcut: 'Cmd/Ctrl+Z',
        disabled: !editorState.canUndo,
      },
      {
        type: 'item',
        label: 'Redo',
        command: 'edit.redo',
        shortcut: 'Shift+Cmd/Ctrl+Z',
        disabled: !editorState.canRedo,
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Cut',
        command: 'edit.cut',
        shortcut: 'Cmd/Ctrl+X',
        disabled: !editorState.hasSelection,
      },
      {
        type: 'item',
        label: 'Copy',
        command: 'edit.copy',
        shortcut: 'Cmd/Ctrl+C',
        disabled: !editorState.hasSelection,
      },
      {
        type: 'item',
        label: 'Paste',
        command: 'edit.paste',
        shortcut: 'Cmd/Ctrl+V',
      },
      {
        type: 'item',
        label: 'Select all',
        command: 'edit.select-all',
        shortcut: 'Cmd/Ctrl+A',
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Find',
        command: 'edit.find',
        shortcut: 'Cmd/Ctrl+F',
      },
      {
        type: 'item',
        label: 'Replace',
        command: 'edit.replace',
        shortcut: 'Cmd/Ctrl+H',
      },
    ],
    insert: [
      { type: 'item', label: 'Link', command: 'insert.link' },
      {
        type: 'item',
        label: 'Horizontal rule',
        command: 'insert.horizontal-rule',
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Bulleted list',
        command: 'insert.unordered-list',
      },
      {
        type: 'item',
        label: 'Numbered list',
        command: 'insert.ordered-list',
      },
    ],
    format: [
      {
        type: 'item',
        label: 'Paragraph',
        command: 'format.paragraph',
        checked: editorState.activeBlock === 'paragraph',
      },
      {
        type: 'item',
        label: 'Heading 1',
        command: 'format.heading-1',
        checked: editorState.activeBlock === 'heading-1',
      },
      {
        type: 'item',
        label: 'Heading 2',
        command: 'format.heading-2',
        checked: editorState.activeBlock === 'heading-2',
      },
      {
        type: 'item',
        label: 'Heading 3',
        command: 'format.heading-3',
        checked: editorState.activeBlock === 'heading-3',
      },
      {
        type: 'item',
        label: 'Blockquote',
        command: 'format.blockquote',
        checked: editorState.activeBlock === 'blockquote',
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Bold',
        command: 'format.bold',
        shortcut: 'Cmd/Ctrl+B',
        checked: editorState.marks.bold,
      },
      {
        type: 'item',
        label: 'Italic',
        command: 'format.italic',
        shortcut: 'Cmd/Ctrl+I',
        checked: editorState.marks.italic,
      },
      {
        type: 'item',
        label: 'Underline',
        command: 'format.underline',
        shortcut: 'Cmd/Ctrl+U',
        checked: editorState.marks.underline,
      },
      {
        type: 'item',
        label: 'Strikethrough',
        command: 'format.strikethrough',
        checked: editorState.marks.strikethrough,
      },
      { type: 'separator' },
      { type: 'item', label: 'Clear formatting', command: 'format.clear' },
    ],
    view: [
      {
        type: 'item',
        label: 'Zoom in',
        command: 'view.zoom-in',
        shortcut: 'Cmd/Ctrl++',
      },
      {
        type: 'item',
        label: 'Zoom out',
        command: 'view.zoom-out',
        shortcut: 'Cmd/Ctrl+-',
      },
      {
        type: 'item',
        label: 'Reset zoom',
        command: 'view.zoom-reset',
        shortcut: 'Cmd/Ctrl+0',
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Status bar',
        command: 'view.toggle-status-bar',
        checked: documentState.showStatusBar,
      },
      {
        type: 'item',
        label: 'Focus mode',
        command: 'view.toggle-focus-mode',
        checked: documentState.focusMode,
      },
    ],
    theme: [
      { type: 'section', label: 'Light themes' },
      ...THEME_OPTIONS.filter(
        (theme) => theme.group === 'light',
      ).map<MenuEntry>((theme) => ({
        type: 'item',
        label: theme.label,
        checked: documentState.theme === theme.id,
        onSelect: () => changeTheme(theme.id),
      })),
      { type: 'separator' },
      { type: 'section', label: 'Dark themes' },
      ...THEME_OPTIONS.filter((theme) => theme.group === 'dark').map<MenuEntry>(
        (theme) => ({
          type: 'item',
          label: theme.label,
          checked: documentState.theme === theme.id,
          onSelect: () => changeTheme(theme.id),
        }),
      ),
    ],
    tools: [
      { type: 'item', label: 'Word count', command: 'tools.word-count' },
      {
        type: 'item',
        label: 'Grammar summary',
        command: 'tools.grammar-summary',
      },
      {
        type: 'item',
        label: 'Issue underlines',
        command: 'tools.toggle-issues',
        checked: documentState.showIssues,
      },
    ],
    help: [
      {
        type: 'item',
        label: 'Keyboard shortcuts',
        command: 'help.shortcuts',
      },
      { type: 'item', label: 'About Gramadoc', command: 'help.about' },
      { type: 'item', label: 'Terms', command: 'help.feedback' },
    ],
  }

  return (
    <div
      className={`app-shell${documentState.focusMode ? ' app-shell--focus' : ''}`}
    >
      {showApiBanner && (
        <div className="app-banner" aria-live="polite">
          <div className="app-banner__content">
            <span className="app-banner__eyebrow">New</span>
            <p className="app-banner__message">
              We now have a free API at{' '}
              <a
                href="https://api.gramadoc.com"
                target="_blank"
                rel="noreferrer"
              >
                api.gramadoc.com
              </a>
              .
            </p>
          </div>
          <button
            type="button"
            className="app-banner__close"
            aria-label="Close API announcement"
            onClick={() => {
              localStorage.setItem(API_BANNER_STORAGE_KEY, 'true')
              setShowApiBanner(false)
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {!documentState.focusMode && (
        <nav className="menu-bar" ref={menuBarRef} aria-label="Editor menus">
          {MENU_ORDER.map((menu) => (
            <div key={menu} className="menu-root">
              <button
                ref={(node) => {
                  menuButtonRefs.current[menu] = node
                }}
                type="button"
                className={`menu-trigger${menuOpen === menu ? ' menu-trigger--active' : ''}`}
                aria-haspopup="true"
                aria-expanded={menuOpen === menu}
                onMouseEnter={() => {
                  if (menuOpen) {
                    openMenu(menu)
                  }
                }}
                onClick={() => {
                  if (menuOpen === menu) {
                    setMenuOpen(null)
                    return
                  }

                  openMenu(menu, true)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    openMenu(menu, true)
                  }

                  if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    moveToAdjacentMenu(menu, 1)
                  }

                  if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    moveToAdjacentMenu(menu, -1)
                  }
                }}
              >
                {menu.charAt(0).toUpperCase() + menu.slice(1)}
              </button>

              {menuOpen === menu && (
                <div
                  className="menu-dropdown"
                  role="menu"
                  data-menu-panel={menu}
                >
                  {menuEntries[menu].map((entry, index) => {
                    if (entry.type === 'separator') {
                      const separatorNumber = menuEntries[menu]
                        .slice(0, index + 1)
                        .filter(
                          (candidate) => candidate.type === 'separator',
                        ).length
                      return (
                        <div
                          key={`${menu}-separator-${separatorNumber}`}
                          className="menu-separator"
                        />
                      )
                    }

                    if (entry.type === 'section') {
                      return (
                        <div
                          key={`${menu}-section-${entry.label}`}
                          className="menu-section"
                        >
                          {entry.label}
                        </div>
                      )
                    }

                    return (
                      <button
                        key={`${menu}-${entry.label}`}
                        type="button"
                        className="menu-dropdown-item"
                        disabled={entry.disabled}
                        onClick={() => {
                          if (entry.onSelect) {
                            entry.onSelect()
                            setMenuOpen(null)
                            return
                          }

                          if (entry.command) {
                            executeCommand(entry.command)
                          }
                        }}
                        onKeyDown={(event) => {
                          const currentTarget = event.currentTarget
                          const items = Array.from(
                            currentTarget
                              .closest('.menu-dropdown')
                              ?.querySelectorAll<HTMLButtonElement>(
                                '.menu-dropdown-item:not(:disabled)',
                              ) ?? [],
                          )
                          const currentIndex = items.indexOf(currentTarget)

                          if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            items[(currentIndex + 1) % items.length]?.focus()
                          }

                          if (event.key === 'ArrowUp') {
                            event.preventDefault()
                            items[
                              (currentIndex - 1 + items.length) % items.length
                            ]?.focus()
                          }

                          if (event.key === 'ArrowRight') {
                            event.preventDefault()
                            moveToAdjacentMenu(menu, 1)
                          }

                          if (event.key === 'ArrowLeft') {
                            event.preventDefault()
                            moveToAdjacentMenu(menu, -1)
                          }

                          if (event.key === 'Escape') {
                            event.preventDefault()
                            setMenuOpen(null)
                            menuButtonRefs.current[menu]?.focus()
                          }
                        }}
                      >
                        <span className="menu-dropdown-check">
                          {entry.checked ? '✓' : ''}
                        </span>
                        <span className="menu-dropdown-label">
                          {entry.label}
                        </span>
                        <span className="menu-dropdown-shortcut">
                          {entry.shortcut}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      )}

      <header className="toolbar">
        <div className="toolbar-brand">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 12 C22 10 20 8 18 8 H10 C8 8 7 9 7 11 V21 C7 23 8 24 10 24 H18 C20 24 22 22 22 20 V16 H16" />
          </svg>
          <div className="toolbar-title-group">
            <input
              type="text"
              className="doc-title"
              value={documentState.title}
              onChange={(event) => {
                handleTitleChange(event.target.value)
              }}
              spellCheck={false}
            />
            <div className="doc-meta">
              <span>
                {saveState === 'saving'
                  ? 'Saving...'
                  : saveState === 'shared'
                    ? 'Shared'
                    : saveState === 'error'
                      ? 'Save error'
                      : dirty
                        ? 'Unsaved changes'
                        : 'Saved locally'}
              </span>
              <span>Last saved {formatTime(lastSavedAt)}</span>
            </div>
          </div>
        </div>

        <div className="toolbar-scroll">
          <div className="toolbar-group">
            <button
              type="button"
              className="toolbar-tool"
              title="Undo"
              aria-label="Undo"
              onClick={() => {
                executeCommand('edit.undo')
              }}
              disabled={!editorState.canUndo}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
              </svg>
            </button>
            <button
              type="button"
              className="toolbar-tool"
              title="Redo"
              aria-label="Redo"
              onClick={() => {
                executeCommand('edit.redo')
              }}
              disabled={!editorState.canRedo}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
              </svg>
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className="toolbar-tool"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => {
                executeCommand('view.zoom-out')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <select
              className="toolbar-select"
              aria-label="Zoom level"
              value={documentState.zoom}
              onChange={(event) => {
                updateDocument(
                  (current) => ({
                    ...current,
                    zoom: clampZoom(Number(event.target.value)),
                  }),
                  true,
                )
              }}
            >
              {ZOOM_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}%
                </option>
              ))}
            </select>
            <button
              type="button"
              className="toolbar-tool"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => {
                executeCommand('view.zoom-in')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <select
              className="toolbar-select toolbar-select--wide"
              aria-label="Block style"
              value={editorState.activeBlock}
              onChange={(event) => {
                switch (event.target.value) {
                  case 'paragraph':
                    executeCommand('format.paragraph')
                    break
                  case 'heading-1':
                    executeCommand('format.heading-1')
                    break
                  case 'heading-2':
                    executeCommand('format.heading-2')
                    break
                  case 'heading-3':
                    executeCommand('format.heading-3')
                    break
                  case 'blockquote':
                    executeCommand('format.blockquote')
                    break
                }
              }}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading-1">Heading 1</option>
              <option value="heading-2">Heading 2</option>
              <option value="heading-3">Heading 3</option>
              <option value="blockquote">Blockquote</option>
            </select>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-tool${editorState.marks.bold ? ' toolbar-tool--active' : ''}`}
              title="Bold"
              aria-label="Bold"
              aria-pressed={editorState.marks.bold}
              onClick={() => {
                executeCommand('format.bold')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              </svg>
            </button>
            <button
              type="button"
              className={`toolbar-tool${editorState.marks.italic ? ' toolbar-tool--active' : ''}`}
              title="Italic"
              aria-label="Italic"
              aria-pressed={editorState.marks.italic}
              onClick={() => {
                executeCommand('format.italic')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="19" y1="4" x2="10" y2="4" />
                <line x1="14" y1="20" x2="5" y2="20" />
                <line x1="15" y1="4" x2="9" y2="20" />
              </svg>
            </button>
            <button
              type="button"
              className={`toolbar-tool${editorState.marks.underline ? ' toolbar-tool--active' : ''}`}
              title="Underline"
              aria-label="Underline"
              aria-pressed={editorState.marks.underline}
              onClick={() => {
                executeCommand('format.underline')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
                <line x1="4" y1="21" x2="20" y2="21" />
              </svg>
            </button>
            <button
              type="button"
              className={`toolbar-tool${editorState.marks.strikethrough ? ' toolbar-tool--active' : ''}`}
              title="Strikethrough"
              aria-label="Strikethrough"
              aria-pressed={editorState.marks.strikethrough}
              onClick={() => {
                executeCommand('format.strikethrough')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 4H9a3 3 0 0 0-2.83 4" />
                <path d="M14 12a4 4 0 0 1 0 8H6" />
                <line x1="4" y1="12" x2="20" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              className="toolbar-tool"
              title="Clear formatting"
              aria-label="Clear formatting"
              onClick={() => {
                executeCommand('format.clear')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17.5 19 22 24" />
                <path d="m2 2 20 20" />
                <path d="M11 5 9.49 3.5a2.12 2.12 0 0 0-3 0L2.5 7.49a2.12 2.12 0 0 0 0 3L4 12" />
                <path d="M9.49 14.5 11 16" />
                <path d="m14 11 1.5-1.5a2.12 2.12 0 0 1 3 0l3.99 3.99a2.12 2.12 0 0 1 0 3L21 18" />
              </svg>
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-tool${editorState.activeBlock === 'unordered-list' ? ' toolbar-tool--active' : ''}`}
              title="Bulleted list"
              aria-label="Bulleted list"
              onClick={() => {
                executeCommand('insert.unordered-list')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`toolbar-tool${editorState.activeBlock === 'ordered-list' ? ' toolbar-tool--active' : ''}`}
              title="Numbered list"
              aria-label="Numbered list"
              onClick={() => {
                executeCommand('insert.ordered-list')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="10" y1="6" x2="21" y2="6" />
                <line x1="10" y1="12" x2="21" y2="12" />
                <line x1="10" y1="18" x2="21" y2="18" />
                <path d="M4 6h1v4" />
                <path d="M4 10h2" />
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
              </svg>
            </button>
            <button
              type="button"
              className={`toolbar-tool${editorState.activeBlock === 'blockquote' ? ' toolbar-tool--active' : ''}`}
              title="Blockquote"
              aria-label="Blockquote"
              onClick={() => {
                executeCommand('format.blockquote')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 21c3 0 7-1 7-8V5H3v8h4c0 2-2 4-4 4" />
                <path d="M14 21c3 0 7-1 7-8V5h-7v8h4c0 2-2 4-4 4" />
              </svg>
            </button>
            <button
              type="button"
              className={`toolbar-tool${editorState.marks.link ? ' toolbar-tool--active' : ''}`}
              title="Insert link"
              aria-label="Insert link"
              onClick={() => {
                executeCommand('insert.link')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
            <button
              type="button"
              className="toolbar-tool"
              title="Insert horizontal rule"
              aria-label="Insert horizontal rule"
              onClick={() => {
                executeCommand('insert.horizontal-rule')
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-pill${showWarningsSidebar ? ' toolbar-pill--active' : ''}`}
              onClick={() => {
                setShowWarningsSidebar((prev) => !prev)
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: '6px' }}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {issueCount} issues
            </button>
            <button
              type="button"
              className="toolbar-pill"
              onClick={() => {
                executeCommand('tools.word-count')
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: '6px' }}
                aria-hidden="true"
              >
                <path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5" />
                <path d="M14 2v6h6" />
                <path d="M10 12h4" />
                <path d="M10 16h4" />
              </svg>
              {wordCount} words
            </button>
            <select
              className="toolbar-select"
              aria-label="Theme"
              value={documentState.theme}
              onChange={(event) => {
                changeTheme(event.target.value as Theme)
              }}
            >
              {THEME_OPTIONS.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="app-content">
        <main className="document-scroller">
          <div
            className="document-page"
            style={
              {
                '--page-zoom': `${documentState.zoom / 100}`,
              } as CSSProperties
            }
          >
            <GramadocInput
              ref={editorRef}
              value={documentState.content}
              onChange={handleContentChange}
              warnings={visibleWarnings}
              analysisPlainText={analysis.plainText}
              layoutVersion={layoutVersion}
              placeholder="Write your story..."
              className="gramadoc-editor-container"
              editorClassName="gramadoc-editor-surface"
              onStateChange={setEditorState}
            />
          </div>
        </main>

        {showWarningsSidebar && (
          <>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: resizing handle */}
            <div
              className={`sidebar-resizer${isResizing ? ' sidebar-resizer--active' : ''}`}
              onMouseDown={() => setIsResizing(true)}
            />
            <aside
              className="warnings-sidebar"
              style={{ width: sidebarWidth }}
              aria-label="Grammar and style issues"
            >
              <div className="sidebar-header">
                <h3>Issues</h3>
                <button
                  type="button"
                  className="sidebar-close"
                  onClick={() => setShowWarningsSidebar(false)}
                  aria-label="Close issues sidebar"
                >
                  ×
                </button>
              </div>
              <div className="sidebar-content">
                {visibleWarnings.matches.length === 0 ? (
                  <div className="sidebar-empty">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p>No issues found. Your writing looks great!</p>
                  </div>
                ) : (
                  <ul className="warning-list">
                    {visibleWarnings.matches.map((match) => (
                      <li
                        key={`${match.rule.id}-${match.offset}-${match.length}`}
                      >
                        <button
                          type="button"
                          className="warning-item"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.nativeEvent.stopImmediatePropagation()
                            editorRef.current?.showMatch(match)
                          }}
                        >
                          <div className="warning-item__header">
                            <span className="warning-item__title">
                              {match.shortMessage || match.rule.category.name}
                            </span>
                          </div>
                          <p className="warning-item__message">
                            {match.message}
                          </p>
                          <div className="warning-item__context">
                            "
                            {match.context.text.slice(
                              match.context.offset,
                              match.context.offset + match.context.length,
                            )}
                            "
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      {documentState.showStatusBar && !documentState.focusMode && (
        <footer className="status-bar">
          <div className="status-left">
            {analysis.status === 'analyzing'
              ? 'Analyzing grammar and style...'
              : saveState === 'saving'
                ? 'Saving...'
                : currentThemeOption
                  ? `Theme: ${currentThemeOption.label}`
                  : 'Ready'}
          </div>
          <div className="status-right">
            <span>{wordCount} words</span>
            <span>{issueCount} issues</span>
            <span>{documentState.zoom}%</span>
            <a
              href={RELEASE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={`View release ${RELEASE_TAG} on GitHub`}
            >
              {RELEASE_TAG}
            </a>
            <a
              href={TERMS_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View terms and conditions"
            >
              © Puzed Ltd
            </a>
          </div>
        </footer>
      )}

      {activeDialog && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: clicking the backdrop is the intended dismiss gesture */}
          <div
            className="dialog-backdrop"
            role="presentation"
            onMouseDown={closeDialog}
          >
            <div
              ref={dialogRef}
              className="dialog-surface"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`dialog-title-${activeDialog}`}
              onMouseDown={(event) => {
                event.stopPropagation()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  closeDialog()
                  return
                }

                if (event.key !== 'Tab') {
                  return
                }

                const focusableElements = Array.from(
                  dialogRef.current?.querySelectorAll<HTMLElement>(
                    'input, button, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
                  ) ?? [],
                ).filter((element) => !element.hasAttribute('disabled'))

                if (focusableElements.length === 0) {
                  return
                }

                const firstElement = focusableElements[0]
                const lastElement =
                  focusableElements[focusableElements.length - 1]
                const activeElement =
                  document.activeElement as HTMLElement | null

                if (!event.shiftKey && activeElement === lastElement) {
                  event.preventDefault()
                  firstElement.focus()
                }

                if (event.shiftKey && activeElement === firstElement) {
                  event.preventDefault()
                  lastElement.focus()
                }
              }}
            >
              {activeDialog === 'shortcuts' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>
                      Keyboard shortcuts
                    </h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body">
                    <div className="shortcut-grid">
                      {SHORTCUTS.map((shortcut) => (
                        <div key={shortcut.label} className="shortcut-row">
                          <span>{shortcut.label}</span>
                          <span>{shortcut.mac}</span>
                          <span>{shortcut.windows}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeDialog === 'word-count' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>Word count</h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body">
                    <div className="metric-grid">
                      <div className="metric-card">
                        <strong>{wordCount}</strong>
                        <span>Total words</span>
                      </div>
                      <div className="metric-card">
                        <strong>{analysis.plainText.length}</strong>
                        <span>Characters</span>
                      </div>
                      <div className="metric-card">
                        <strong>{issueCount}</strong>
                        <span>Open issues</span>
                      </div>
                    </div>
                    <div className="list-panel">
                      <h3>Most frequent words</h3>
                      <ul>
                        {wordEntries.slice(0, 12).map(([word, count]) => (
                          <li key={word}>
                            <span>{word}</span>
                            <strong>{count}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {activeDialog === 'grammar' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>Grammar summary</h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body">
                    <div className="metric-grid">
                      <div className="metric-card">
                        <strong>{issueCount}</strong>
                        <span>Visible issues</span>
                      </div>
                      <div className="metric-card">
                        <strong>{analysis.status}</strong>
                        <span>Analysis status</span>
                      </div>
                    </div>
                    <div className="list-panel">
                      <h3>Current matches</h3>
                      <ul>
                        {visibleWarnings.matches.slice(0, 20).map((match) => (
                          <li
                            key={`${match.offset}-${match.length}-${match.rule.id}`}
                          >
                            <div>
                              <strong>
                                {match.shortMessage || match.rule.category.name}
                              </strong>
                              <p>{match.message}</p>
                            </div>
                          </li>
                        ))}
                        {visibleWarnings.matches.length === 0 && (
                          <li>
                            <div>
                              <strong>No visible issues</strong>
                              <p>
                                Great shape. Grammar underlines are currently
                                clear.
                              </p>
                            </div>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {activeDialog === 'link' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>Insert link</h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body dialog-body--form">
                    <label className="dialog-field">
                      <span>URL</span>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(event) => {
                          setLinkUrl(event.target.value)
                        }}
                        placeholder="https://example.com"
                      />
                    </label>
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--secondary"
                        onClick={closeDialog}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--primary"
                        onClick={() => {
                          const normalizedUrl = ensureUrlProtocol(linkUrl)
                          if (!normalizedUrl) {
                            return
                          }

                          editorRef.current?.createLink(normalizedUrl)
                          closeDialog()
                        }}
                      >
                        Apply link
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeDialog === 'find' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>Find</h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body dialog-body--form">
                    <label className="dialog-field">
                      <span>Find text</span>
                      <input
                        type="text"
                        value={findQuery}
                        onChange={(event) => {
                          setFindQuery(event.target.value)
                        }}
                        placeholder="Search the current document"
                      />
                    </label>
                    {findMessage && (
                      <p className="dialog-message">{findMessage}</p>
                    )}
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--secondary"
                        onClick={closeDialog}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--primary"
                        onClick={() => {
                          runFind(findQuery)
                        }}
                      >
                        Find next
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeDialog === 'replace' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>Replace</h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body dialog-body--form">
                    <label className="dialog-field">
                      <span>Find text</span>
                      <input
                        type="text"
                        value={findQuery}
                        onChange={(event) => {
                          setFindQuery(event.target.value)
                        }}
                      />
                    </label>
                    <label className="dialog-field">
                      <span>Replace with</span>
                      <input
                        type="text"
                        value={replaceText}
                        onChange={(event) => {
                          setReplaceText(event.target.value)
                        }}
                      />
                    </label>
                    {findMessage && (
                      <p className="dialog-message">{findMessage}</p>
                    )}
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--secondary"
                        onClick={() => {
                          runFind(findQuery)
                        }}
                      >
                        Find next
                      </button>
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--primary"
                        onClick={runReplace}
                      >
                        Replace selection
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeDialog === 'confirm-new' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>
                      Create a new document?
                    </h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body dialog-body--form">
                    <p className="dialog-message">
                      The current document has unsaved local changes. Starting a
                      new document will replace the current draft.
                    </p>
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--secondary"
                        onClick={closeDialog}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="toolbar-button toolbar-button--primary"
                        onClick={handleNewDocumentConfirmed}
                      >
                        Start new document
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeDialog === 'about' && (
                <>
                  <div className="dialog-header">
                    <h2 id={`dialog-title-${activeDialog}`}>About Gramadoc</h2>
                    <button
                      type="button"
                      className="dialog-close"
                      onClick={closeDialog}
                    >
                      ×
                    </button>
                  </div>
                  <div className="dialog-body">
                    <p>
                      Gramadoc is a writing surface built on top of the
                      `gramadoc` grammar engine and the shared `gramadoc-react`
                      editor package.
                    </p>
                    <p>
                      This first editor milestone now includes menu-driven
                      formatting, toolbar controls, local draft persistence, and
                      export/share helpers.
                    </p>
                    <p>
                      <a href={TERMS_URL} target="_blank" rel="noreferrer">
                        Copyright © Puzed Ltd
                      </a>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default App
