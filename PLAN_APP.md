# Gramadoc App Editor Plan

## Current Product Shape

The current repo is split into three layers:

- `packages/gramadoc`: grammar analysis engine and rule set
- `packages/gramadoc-react`: reusable contenteditable editor surface and worker-backed analysis hook
- `apps/gramadoc.com`: the product UI shell around the editor

Today, `apps/gramadoc.com` already has:

- a top menu bar shell
- a toolbar shell
- a document page canvas
- a status bar
- theme switching
- a title input
- grammar analysis results wired into the editor
- warning underlines and replacement popups
- keyboard shortcuts for bold, italic, and underline

Today, it does not yet have:

- a shared editor command API
- a reliable selection-state model
- a real menu system
- a functional full toolbar
- document lifecycle actions
- persistence
- export flows
- supporting dialogs/panels
- enough testing for a full editor experience

## Product Goal

Implement a complete first-pass desktop-style document editor for `gramadoc.com` where the menu bar and toolbar are fully functional, editor commands are centralized, document actions are real, and the app remains compatible with grammar overlays and theme support.

## V1 Scope

The initial milestone should include:

- File actions: new document, duplicate, print, download HTML, download plain text
- Edit actions: undo, redo, cut, copy, paste, select all, find, replace
- Insert actions: link, horizontal rule, unordered list, ordered list
- Format actions: paragraph, headings, bold, italic, underline, strikethrough, blockquote, clear formatting
- View actions: zoom in, zoom out, reset zoom, toggle status bar, toggle focus mode
- Tools actions: theme switching, word count/details, grammar summary
- Help actions: shortcuts, about/feedback links

The initial milestone should explicitly defer:

- collaboration
- comments/suggestions mode
- backend persistence
- images/media embeds
- tables
- multi-page layout

## Delivery Order

Build in this order:

1. feature contract and information architecture
2. shared editor command/query API
3. editor state and selection tracking
4. app command registry and document state
5. menu bar implementation
6. toolbar implementation
7. dialogs/panels
8. persistence/export/print flows
9. responsiveness/accessibility
10. tests and final polish

## Detailed Checklist

### 1. Scope And UX Contract

- [ ] Confirm the exact V1 feature list for `File`, `Edit`, `Insert`, `Format`, `View`, `Theme`, `Tools`, and `Help`.
- [ ] Mark each candidate feature as `ship now`, `stub visibly`, or `defer completely`.
- [ ] Decide which controls must exist in both menu bar and toolbar versus menu only.
- [ ] Decide which actions need dialogs or popovers instead of immediate execution.
- [ ] Decide the first supported document format contract for editor HTML.
- [ ] Define the first supported block types: paragraph, `h1`, `h2`, `h3`, blockquote, ordered list, unordered list, horizontal rule.
- [ ] Define the first supported inline types: bold, italic, underline, strikethrough, link.
- [ ] Decide the zoom model for the page canvas and the list of preset zoom levels.
- [ ] Decide whether `Share` ships as disabled, local-only, or export-based.
- [ ] Document what “full editor” means for this milestone so implementation does not drift.

### 2. Shared Editor API In `packages/gramadoc-react`

- [x] Create a typed editor command interface for `GramadocInput`.
- [x] Create a typed editor query/state interface for `GramadocInput`.
- [x] Decide how the app will access commands: forwarded ref, imperative handle, callback registration, or controller object.
- [x] Add a way to focus the editor from app-level controls.
- [x] Add a way to restore focus to the editor after menu or toolbar actions.
- [x] Add command methods for `undo` and `redo`.
- [x] Add command methods for `toggleBold`, `toggleItalic`, `toggleUnderline`, and `toggleStrikethrough`.
- [x] Add command methods for `setParagraph`, `setHeading(level)`, and `toggleBlockquote`.
- [x] Add command methods for `toggleOrderedList` and `toggleUnorderedList`.
- [x] Add command methods for `createLink` and `removeLink`.
- [x] Add a command method for `insertHorizontalRule`.
- [x] Add a command method for `clearFormatting`.
- [x] Add query methods for `canUndo` and `canRedo`.
- [x] Add query methods for active inline marks.
- [x] Add query methods for current block type.
- [x] Add query methods for whether selection exists and whether selection is collapsed.
- [x] Add a callback or subscription for editor state changes.
- [x] Export the new editor types from `packages/gramadoc-react/src/gramadoc/index.ts`.

### 3. Editor Command Execution Internals

- [x] Audit every existing editing path in `GramadocInput.tsx`.
- [x] Move existing `Ctrl/Cmd+B`, `Ctrl/Cmd+I`, and `Ctrl/Cmd+U` shortcuts to call shared command helpers.
- [x] Add a single internal `runCommand(...)` layer instead of scattered command logic.
- [ ] Decide which V1 commands can safely use `document.execCommand`.
- [ ] Document which V1 commands need custom DOM/Range logic immediately.
- [x] Add helper utilities for saving the current selection before opening dialogs/popovers.
- [x] Add helper utilities for restoring selection before applying a command.
- [x] Ensure commands triggered from toolbar/menu still affect the intended editor selection.
- [x] Ensure commands re-focus the editor after execution where appropriate.
- [x] Ensure replacement popup actions still work after command refactors.
- [x] Ensure command execution re-triggers `onChange`.
- [x] Ensure command execution does not leave the DOM in a broken or partially wrapped state.
- [ ] Add normalization after command execution if the DOM shape becomes inconsistent.

### 4. Editor Selection And Formatting State Tracking

- [x] Add listeners for selection changes while the editor is focused.
- [x] Add listeners for state refresh after keyboard edits.
- [x] Add listeners for state refresh after toolbar/menu commands.
- [x] Detect whether selection is inside bold content.
- [x] Detect whether selection is inside italic content.
- [x] Detect whether selection is inside underlined content.
- [x] Detect whether selection is inside strikethrough content.
- [x] Detect whether selection is inside a link.
- [x] Detect the nearest active block container.
- [x] Detect whether selection is inside an ordered list.
- [x] Detect whether selection is inside an unordered list.
- [x] Surface selection state to the app in a stable shape.
- [ ] Prevent noisy state churn when selection changes outside the editor.
- [ ] Ensure selection-state updates do not break grammar underline rendering.

### 5. Editor HTML And Document Structure Normalization

- [ ] Define the allowed HTML tags the editor will emit in V1.
- [ ] Decide what the default empty document HTML should be.
- [ ] Normalize empty content to a stable blank document representation.
- [ ] Normalize pasted or inserted paragraphs into the chosen document structure.
- [ ] Normalize heading insertion so it produces consistent tags.
- [ ] Normalize blockquote insertion so nested paragraphs stay readable.
- [ ] Normalize list insertion and list toggling behavior.
- [ ] Normalize horizontal rule insertion so it lands between valid blocks.
- [ ] Ensure link creation does not generate nested/invalid anchors.
- [ ] Ensure clear formatting preserves text content while removing unwanted markup.
- [ ] Ensure placeholder behavior still works for an empty normalized document.
- [ ] Ensure `htmlToPlainText` output stays sensible for newly supported markup.

### 6. Grammar Overlay Compatibility

- [ ] Re-test underline calculation after inline formatting changes.
- [ ] Re-test underline calculation after block changes like headings and lists.
- [ ] Re-test underline calculation after replacements from the grammar popup.
- [ ] Ensure overlay positions remain correct at non-100% zoom values.
- [ ] Ensure overlay positions remain correct after window resize.
- [ ] Ensure overlay positions remain correct after toolbar-induced layout changes.
- [ ] Ensure grammar popup placement does not conflict with menus/popovers/dialogs.
- [ ] Decide whether grammar issues should also be exposed in a side panel or summary popover.
- [x] Add an app-level grammar summary model using the existing analysis result.
- [x] Decide whether users can temporarily hide issue underlines.

### 7. App-Level State In `apps/gramadoc.com`

- [ ] Split the current large `App.tsx` into app state domains or helper modules if needed.
- [x] Add explicit state for document title.
- [x] Add explicit state for document HTML.
- [x] Add explicit state for dirty/unsaved changes.
- [x] Add explicit state for zoom level.
- [x] Add explicit state for menu visibility.
- [x] Add explicit state for dialogs/popovers.
- [x] Add explicit state for view toggles such as status bar visibility and focus mode.
- [x] Add explicit state for selected theme.
- [x] Add derived state for word count.
- [x] Add derived state for issue count.
- [x] Add derived state for save/persistence status.
- [x] Add a single app command dispatcher or registry for all menu/toolbar actions.
- [x] Ensure app commands call editor commands rather than duplicating logic.

### 8. Document Lifecycle And Persistence

- [x] Define the local document shape: id, title, content, theme, timestamps, preferences.
- [x] Decide whether V1 stores a single current document or multiple local documents.
- [x] Add initialization logic for a brand new document.
- [x] Add initialization logic for restoring a saved document.
- [x] Add dirty-state transitions when title changes.
- [x] Add dirty-state transitions when content changes.
- [x] Add dirty-state transitions when theme/view preferences change if those are persisted.
- [x] Add autosave throttling/debouncing strategy.
- [x] Save the current document to localStorage or IndexedDB.
- [x] Restore the latest saved document on app load.
- [x] Add a “new document” action with confirm guard when unsaved changes exist.
- [x] Add a duplicate-document action if V1 supports multiple local docs.
- [x] Add “last saved” feedback in the toolbar or status bar.
- [x] Decide whether the current document title should update the browser tab title.

### 9. Export, Download, Print, And Share

- [x] Add an export helper for raw HTML download.
- [x] Add an export helper for plain text download.
- [x] Decide the file naming strategy based on document title.
- [x] Sanitize file names generated from the title.
- [x] Add a print action for the current document.
- [x] Ensure print output hides editor-only chrome.
- [x] Ensure print output uses the document content rather than the full app shell.
- [x] Decide the exact first behavior for the `Download` button.
- [x] Decide the exact first behavior for the `Share` button.
- [ ] If `Share` is deferred, disable it intentionally and explain why in UI.
- [x] If `Share` ships locally, implement copy/export-based share behavior.

### 10. Menu System Foundation

- [x] Create a typed menu item model.
- [x] Support menu item labels.
- [ ] Support menu item icons if desired.
- [x] Support menu item shortcut text.
- [x] Support menu item disabled state.
- [x] Support menu item checked state.
- [x] Support separators.
- [ ] Support nested submenus where needed.
- [x] Support invoking app commands from menu items.
- [x] Support opening one top-level menu at a time.
- [x] Support mouse hover switching between top-level menus.
- [x] Support click-to-open and click-outside-to-close.
- [x] Support `Escape` to close menus.
- [x] Support arrow-key navigation within menus.
- [x] Support `Enter` and `Space` activation.
- [x] Support focus management when menus open and close.
- [x] Prevent menu interactions from stealing editor selection permanently.

### 11. Menu Definitions By Section

#### File Menu

- [x] Add `New document`.
- [x] Add `Duplicate document` if V1 supports it.
- [x] Add `Download HTML`.
- [x] Add `Download plain text`.
- [x] Add `Print`.
- [x] Add `Close menu` keyboard behavior.

#### Edit Menu

- [x] Add `Undo`.
- [x] Add `Redo`.
- [x] Add `Cut`.
- [x] Add `Copy`.
- [x] Add `Paste`.
- [x] Add `Select all`.
- [x] Add `Find`.
- [x] Add `Replace`.

#### Insert Menu

- [x] Add `Link`.
- [x] Add `Horizontal rule`.
- [x] Add `Bulleted list`.
- [x] Add `Numbered list`.

#### Format Menu

- [x] Add `Paragraph`.
- [x] Add `Heading 1`.
- [x] Add `Heading 2`.
- [x] Add `Heading 3`.
- [x] Add `Bold`.
- [x] Add `Italic`.
- [x] Add `Underline`.
- [x] Add `Strikethrough`.
- [x] Add `Blockquote`.
- [x] Add `Clear formatting`.

#### View Menu

- [x] Add `Zoom in`.
- [x] Add `Zoom out`.
- [x] Add `Reset zoom`.
- [x] Add `Toggle status bar`.
- [x] Add `Toggle focus mode`.

#### Theme Menu

- [x] Keep existing theme list behavior.
- [x] Convert theme items to the new menu model.
- [x] Show a checkmark for the active theme.
- [x] Keep themes grouped into light and dark sections.

#### Tools Menu

- [x] Add `Word count`.
- [x] Add `Grammar summary`.
- [x] Add `Toggle issue underlines` if we ship it.

#### Help Menu

- [x] Add `Keyboard shortcuts`.
- [x] Add `About Gramadoc`.
- [x] Add `Report feedback` or `Report issue`.

### 12. Toolbar Foundation

- [x] Decide the exact toolbar groups and ordering.
- [ ] Replace static toolbar buttons with typed button definitions where helpful.
- [x] Add active button styling.
- [x] Add disabled button styling.
- [x] Add focus-visible styling.
- [x] Add tooltips for icon-only buttons.
- [x] Ensure toolbar actions call app/editor commands.
- [x] Ensure toolbar interactions preserve or restore editor focus correctly.
- [x] Ensure toolbar layout works at desktop widths before mobile adjustments.

### 13. Toolbar Controls By Group

#### Document Group

- [x] Bind the title input to document state instead of `defaultValue`.
- [x] Add title-change persistence.
- [x] Add visible save/draft status near the title if desired.

#### History Group

- [x] Wire `Undo` button.
- [x] Wire `Redo` button.
- [x] Disable `Undo` when not available.
- [x] Disable `Redo` when not available.

#### Zoom Group

- [x] Add `Zoom out` button.
- [x] Add current zoom display.
- [x] Add `Zoom in` button.
- [x] Add `Reset zoom` behavior.
- [x] Apply zoom to the document page container.
- [ ] Recalculate overlays after zoom changes.

#### Block Style Group

- [x] Add a block style dropdown or segmented control.
- [x] Show the current block label.
- [x] Support switching between paragraph and headings.
- [x] Support blockquote if included here.

#### Inline Formatting Group

- [x] Wire `Bold`.
- [x] Wire `Italic`.
- [x] Wire `Underline`.
- [x] Add `Strikethrough`.
- [x] Add `Clear formatting`.
- [x] Reflect active states from editor selection.

#### Structure Group

- [x] Add `Bulleted list`.
- [x] Add `Numbered list`.
- [x] Add `Blockquote` if not in block style group.
- [x] Add `Horizontal rule`.

#### Insert Group

- [x] Add `Link`.
- [x] Open a link dialog/popover when needed.

#### Utility Group

- [x] Add word count quick display if desired.
- [x] Add grammar issue count quick display if desired.
- [x] Add theme quick access if desired.

#### Action Group

- [x] Decide whether `Download` remains a primary button or becomes a split button.
- [x] Wire `Download`.
- [x] Wire `Share`.

### 14. Dialogs, Popovers, And Secondary Surfaces

- [x] Add a reusable dialog or popover pattern in the app.
- [x] Add a keyboard shortcuts dialog.
- [x] Populate the keyboard shortcuts dialog with actual shipped shortcuts.
- [x] Add a word count/details dialog or popover.
- [x] Add a find panel.
- [x] Add a replace panel.
- [ ] Decide whether find/replace is app-level only or editor-assisted.
- [x] Add a link insertion dialog/popover.
- [x] Add validation for link entry.
- [x] Add a grammar summary popover or panel.
- [x] Add a confirm dialog for destructive actions like `New document`.
- [x] Ensure dialogs return focus sensibly after closing.

### 15. Keyboard Shortcuts

- [x] Create a single source of truth for shortcut definitions.
- [x] Map shortcuts to app commands.
- [x] Keep existing `Cmd/Ctrl+B`, `I`, and `U`.
- [x] Add `Cmd/Ctrl+Z` and `Shift+Cmd/Ctrl+Z` or platform equivalent for undo/redo.
- [x] Add `Cmd/Ctrl+A` for select all.
- [x] Add `Cmd/Ctrl+F` for find.
- [x] Add `Cmd/Ctrl+H` or chosen shortcut for replace if we ship it.
- [ ] Add shortcuts for heading changes only if they are intentional and discoverable.
- [ ] Ensure shortcuts do not fire while typing inside unrelated inputs like the title field unless intended.
- [x] Display shortcuts consistently in menus and help UI.

### 16. Responsiveness And Layout

- [ ] Audit the current layout at desktop widths.
- [ ] Audit the current layout at tablet widths.
- [ ] Audit the current layout at narrow mobile widths.
- [ ] Decide which menu/toolbar features remain visible on small screens.
- [x] Add toolbar overflow handling for narrow widths.
- [x] Prevent the title field from pushing controls off-screen badly.
- [x] Ensure the document page remains readable at small widths.
- [x] Ensure zoom controls and page scaling do not create broken overflow.
- [x] Ensure menus and dialogs remain fully visible inside the viewport.

### 17. Accessibility

- [x] Add semantic roles for menu bar, menus, and menu items where appropriate.
- [x] Add ARIA labels for icon-only toolbar buttons.
- [x] Add `aria-pressed` for toggle formatting buttons.
- [x] Add disabled semantics for unavailable actions.
- [x] Add keyboard focus management for top-level menus.
- [ ] Add keyboard focus trapping for dialogs if needed.
- [x] Ensure focus indicators are visible across all themes.
- [ ] Ensure contrast remains acceptable for active, hover, and disabled states in all themes.
- [ ] Ensure grammar popup, menus, and dialogs are all reachable and dismissible by keyboard.

### 18. Styling And Visual Consistency

- [ ] Decide whether the current Google Docs-like visual direction remains the target.
- [ ] Unify spacing and sizing tokens across menu bar, toolbar, status bar, and dialogs.
- [x] Add consistent active/hover/disabled states for controls.
- [x] Add consistent separator styling for menus and toolbar groups.
- [x] Add consistent dropdown/popover surfaces across themes.
- [x] Make sure the toolbar and menus still look good in all supported themes.
- [x] Ensure high-contrast theme remains usable after adding more controls.
- [x] Ensure dark themes remain legible after adding checked/active states.

### 19. Code Organization And Refactor Work

- [ ] Decide whether `App.tsx` should be split before feature implementation grows further.
- [ ] Extract menu configuration into its own module if it becomes large.
- [ ] Extract theme definitions into shared config if needed.
- [ ] Extract document command helpers into app-level modules.
- [ ] Extract export/print helpers into utility modules.
- [ ] Extract dialog state helpers if multiple dialogs are added.
- [ ] Keep shared editor logic inside `gramadoc-react`, not duplicated in the app.
