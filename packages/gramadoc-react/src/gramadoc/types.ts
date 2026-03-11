import type {
  AnalysisResponse,
  Context,
  DetectedLanguage,
  Language,
  GrammerRuleMatch as Match,
  Replacement,
  Rule,
  RuleCategory,
  RuleUrl,
  Software,
} from '@markwylde/gramadoc'

export type {
  AnalysisResponse,
  Context,
  DetectedLanguage,
  Language,
  Match,
  Replacement,
  Rule,
  RuleCategory,
  RuleUrl,
  Software,
}

/**
 * Inline position data used to render a warning underline.
 */
export interface UnderlinePosition {
  top: number
  left: number
  width: number
  height: number
  match: Match
}

/**
 * Provides custom colors for warning underlines.
 */
export type UnderlineColorResolver = (match: Match) => string

export type EditorBlockType =
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'blockquote'
  | 'ordered-list'
  | 'unordered-list'
  | 'other'

export interface EditorMarks {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  link: boolean
}

export interface GramadocEditorState {
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  isSelectionCollapsed: boolean
  activeBlock: EditorBlockType
  marks: EditorMarks
}

export interface GramadocEditorHandle {
  focus: () => void
  refreshLayout: () => void
  undo: () => void
  redo: () => void
  cut: () => void
  copy: () => void
  selectAll: () => void
  insertText: (text: string) => void
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrikethrough: () => void
  setParagraph: () => void
  setHeading: (level: 1 | 2 | 3) => void
  toggleBlockquote: () => void
  toggleOrderedList: () => void
  toggleUnorderedList: () => void
  createLink: (url: string) => void
  removeLink: () => void
  insertHorizontalRule: () => void
  clearFormatting: () => void
  showMatch: (match: Match) => void
  getState: () => GramadocEditorState
}

/**
 * Props for the reusable GramadocInput component.
 */
export interface GramadocInputProps {
  /**
   * The current HTML value rendered inside the editable surface.
   */
  value: string
  /**
   * The matches to underline in the rendered content.
   */
  warnings: AnalysisResponse
  /**
   * Called whenever the editable HTML changes.
   */
  onChange?: (value: string) => void
  /**
   * Called when a warning is opened from the underline overlay.
   */
  onMatchSelect?: (match: Match) => void
  /**
   * Called after a replacement is applied.
   */
  onReplacementApply?: (payload: {
    match: Match
    replacement: string
    value: string
  }) => void
  /**
   * Additional classes for the outer container.
   */
  className?: string
  /**
   * Additional classes for the editable surface.
   */
  editorClassName?: string
  /**
   * Placeholder text shown when the editor is empty.
   */
  placeholder?: string
  /**
   * Disables editing while still rendering warnings.
   */
  readOnly?: boolean
  /**
   * Focuses the editor on mount.
   */
  autoFocus?: boolean
  /**
   * Sets a minimum height for the editable surface.
   */
  minHeight?: number | string
  /**
   * Allows consumers to override underline colors per match.
   */
  getUnderlineColor?: UnderlineColorResolver
  /**
   * The plain text snapshot that produced the current warnings.
   */
  analysisPlainText?: string
  /**
   * Called whenever the editor selection/formatting state changes.
   */
  onStateChange?: (state: GramadocEditorState) => void
  /**
   * Triggers underline/popup layout recalculation after container layout changes.
   */
  layoutVersion?: string | number
}

/**
 * Input options for the background grammar analysis hook.
 */
export interface UseGrammerAnalysisOptions {
  /**
   * The HTML value to analyze.
   */
  value: string
  /**
   * Creates the worker used for analysis.
   */
  workerFactory?: () => Worker
}

/**
 * The current background analysis state.
 */
export interface GrammerAnalysisResult {
  warnings: AnalysisResponse
  plainText: string
  wordCounts: Record<string, number>
  status: 'analyzing' | 'ready' | 'error'
}
