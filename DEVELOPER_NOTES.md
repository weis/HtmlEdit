 # HtmlEdit – Developer Notes
 
 This document explains the structure and design of the HtmlEdit demo editor. It covers the individual components, utilities, and how they fit together, with guidance on extending, testing, and maintaining the codebase.
 
 ## Overview
 
 - Web component: `<demo-rich-text-editor>` built with Lit + TypeScript.
 - Goals: Quill-like basics without heavy deps; simple API; clear modular design.
 - Key features:
   - Basic formatting: bold/italic/underline/strike, headings, lists, blockquote, code.
   - Links (create/unlink), text alignment, clear formatting, undo/redo.
   - Font family selector; text color popover.
   - Paste modes: Prompt / HTML 1:1 / Plain text; remembers last choice.
   - Import at caret: images (as data URLs) and RTF (best-effort to HTML).
   - Drag-and-drop for imports; placeholder; ARIA roles; keyboard shortcuts.
 
 ## Project Layout
 
 - `src/components/rich-text-editor.ts`: Main Lit component (composition, state, wiring)
 - `src/components/editor-toolbar.ts`: Toolbar template renderer (pure view + callbacks)
 - `src/components/color-popover.ts`: Lightweight color picker popover component
 - `src/editor/paste.ts`: Paste fragment extraction and paste-mode preference helpers
 - `src/editor/selection.ts`: Selection/caret helpers (save/restore, containment, block lookup)
 - `src/editor/commands.ts`: `execCommand` wrapper, alignment mapping, shortcut handling, code toggle
 - `src/styles/editor.css.ts`: Editor styles (exported `editorStyles`)
 - `src/utils/import-image.ts`: Read image file → Data URL
 - `src/utils/import-rtf.ts`: Convert `.rtf` text → very simple HTML
 - `src/utils/import-wiring.ts`: Hidden file input + drag-and-drop wiring helpers
 - `src/index.ts`: Demo entry – mounts the component and logs change events
 - `index.html`: Demo page (import map + loads `dist/index.js`)
 - `server.cjs`: Tiny static server for preview
 - `test/*`: Node-based unit tests for paste and commands
 
 ## Build & Run
 
 - Build: `npm run build` (TypeScript → `dist/` ESM)
 - Preview: `npm run preview` (build + static server on http://localhost:5173)
 - Dev: `npm run dev` (watch) + `npm start` (server) in two terminals
 - Tests: `npm test` (build, then Node tests)
 
 ## Public API (Component)
 
 - Tag: `<demo-rich-text-editor>`
 - Attributes/Properties:
   - `value: string` – HTML content (two-way via events; internal source of truth is contenteditable)
   - `placeholder: string` – Placeholder text when empty
   - `disabled: boolean` – Disables editing and toolbar actions
   - `paste-mode: 'prompt' | 'html' | 'text'` – Paste behavior (also persisted in localStorage)
   - `toolbar-visible: boolean` – Show/hide toolbar
 - Methods:
   - `getHTML(): string` – Returns current HTML from the editable
   - `setHTML(html: string)` – Sets content and synchronizes `value`
 - Events:
   - `input`: fires on every change `{ detail: { html } }`
   - `change`: debounced `{ detail: { html } }`
   - `selection-change`: fires on caret selection changes within editor
 
 ## Main Component – `rich-text-editor.ts`
 
 Responsibilities:
 - Owns the shadow DOM: wrapper, toolbar (via template helper), contenteditable div.
 - Maintains editor state: formatting toggles, alignment hint, font family, foreColor, paste UI, drag state.
 - Coordinates modules:
   - Toolbar view (`renderEditorToolbar`) with handlers → component `exec`, `setAlign`, `setFont`, paste actions.
   - Paste utils → fragment extraction, prefs load/save; prompt flow and last-choice memory.
   - Selection utils → save/restore caret; containment checks; closest block.
   - Commands → `execCommand` wrapper; alignment mapping; toggling code block; shortcuts.
   - Import wiring → hidden input + DnD; import readers (image/RTF) → insert at caret.
 - Keyboard shortcuts: handled via `handleShortcut` (Ctrl/Cmd+B/I/U/K).
 - Value synchronization:
   - `updated()` applies `value` to the editable when external changes occur.
   - `contenteditable` emits `input` → updates `value`, debounces `change`.
 
 Key DOM elements:
 - `.editor`: container
 - `.toolbar`: toolbar region (from `editor-toolbar.ts`)
 - `.content`: `contenteditable` div (source of truth)
 
 Important flows:
 - Exec command: `exec(name, value?)` focuses editable, calls `execCommand`, emits input.
 - Paste:
   - Reads clipboard `text/html` and `text/plain`.
   - If `paste-mode==='html'`: insert extracted fragment exactly.
   - If `paste-mode==='text'`: insert plain text.
   - If `paste-mode==='prompt'`: shows inline prompt (remembers last choice) and applies on selection.
 - Import:
   - Toolbar Import opens hidden input (or ephemeral fallback) → `importFiles()`.
   - Drag-and-drop attaches to the editable and sets a visual drag state.
 
 ## Toolbar – `editor-toolbar.ts`
 
 - Exports `renderEditorToolbar(props, handlers)` returning a Lit template only (no internal state).
 - Props summarize component state used for rendering (format toggles, fonts, paste mode/prompt state).
 - Handlers are callbacks provided by the main component.
 - Contains buttons for formatting, headings, lists, quotes, code, links, alignment, undo/redo, clear.
 - Integrates `<color-popover>` and the paste prompt UI.
 - Font family `<select>` uses `.value=` binding; color button reflects `foreColor`.
 - Paste mode toggle button cycles Prompt → HTML 1:1 → Plain.
 
 ## Color Popover – `color-popover.ts`
 
 - Minimal popover with an `<input type=color>` and swatches.
 - Props:
   - `open: boolean` – whether to render the popover
   - `value: string` – current color (hex string)
 - Events (bubbled + composed):
   - `color-change` with `{ color }`
   - `color-close`
 
 ## Paste Utilities – `editor/paste.ts`
 
 - `extractClipboardFragment(html: string): string`
   - If `<!--StartFragment-->…<!--EndFragment-->` present, returns exact substring.
   - Otherwise parses `text/html` and returns `body.innerHTML` (falls back to raw input if parsing is unavailable).
 - Preferences (localStorage-backed):
   - `loadPastePrefs()` → `{ mode: 'prompt'|'html'|'text', last: 'html'|'text' }`
   - `savePasteMode(mode)`, `saveLastPasteChoice(choice)`
 
 ## Selection Utilities – `editor/selection.ts`
 
 - `saveSelection(): Range|null`, `restoreSelection(range): boolean`
 - `containsNode(root: Node, node: Node): boolean` – checks if selection anchor is inside editable
 - `closestBlock(editable, node): HTMLElement|null` – finds the closest block element
 
 ## Commands – `editor/commands.ts`
 
 - `execCommand(command, value?)`: safe wrapper for `document.execCommand`.
 - `setAlignment(align)`: maps `'left'|'center'|'right'|'justify'` to proper exec calls.
 - `handleShortcut(e, actions)`: handles Ctrl/Cmd+B/I/U/K and calls provided actions.
 - `toggleCodeBlock(editable)`: toggles wrapping of the current block in `<pre>`.
 
 ## Styles – `styles/editor.css.ts`
 
 - Centralized CSS exported as `editorStyles` and applied by the component.
 - Includes toolbar layout, contenteditable area, placeholder, and basic content styling.
 
 ## Import Helpers
 
 - `utils/import-image.ts`:
   - `readImageFileAsDataURL(file)`: Promise<string> – reads images as data URLs for insertion.
 - `utils/import-rtf.ts`:
   - `rtfToHtml(rtf)` and `readRtfFileAsHtml(file)`
   - Naive conversion: decodes `\uNNNN?`, replaces `\par`, strips control words/groups; preserves text only.
 - `utils/import-wiring.ts`:
   - `setupHiddenFileInput(root, { accept, multiple, onFiles })`: returns `{ open, cleanup }`
   - `attachDragAndDrop(target, { onFiles, onDragState })`: returns cleanup function
 
 ## Demo Entrypoints
 
 - `src/index.ts`: Simple demo – mounts the editor and logs `change` events.
 - `index.html`: Import map for `lit` (CDN) + loads `./dist/index.js`.
 - `server.cjs`: Barebones static server for preview (serves `/index.html` and `/dist/*`).
 
 ## Testing
 
 - `npm test` builds and runs Node test scripts (no external test framework required):
   - `test/paste.test.js` – tests clipboard fragment extraction and prefs (mocks `localStorage`).
   - `test/commands.test.js` – tests alignment mapping, exec wrapper, and shortcuts (mocks `document.execCommand`).
 - Extending tests:
   - Add jsdom for DOM-level tests (e.g., selection.closestBlock or code toggle).
   - Keep unit tests fast and deterministic by mocking browser globals.
 
 ## Extending the Editor
 
 - Add a toolbar button:
   1. Add a handler in `rich-text-editor.ts` (or reuse `exec`).
   2. Wire a button in `editor-toolbar.ts` (call the handler).
   3. Update `handleShortcut` in `editor/commands.ts` if adding a shortcut.
 - Add background (highlight) color:
   - Create another popover or reuse `color-popover` with a separate state (e.g., `_backColor`).
   - Apply via `exec('backColor', color)` (browser support varies).
 - Add font size selector:
   - Toolbar `<select>` mapping to `exec('fontSize', <1..7>)` or inline style spans (custom implementation recommended for consistency).
 - Improve RTF/HTML import:
   - Integrate a robust converter or sanitization (e.g., DOMPurify) with allowlists.
 - Persistence:
   - Expose `value` as attribute and support external storage; debounce `change` event is already in place.
 
 ## Accessibility & UX
 
 - Toolbar uses `role="toolbar"` and `aria-pressed` for toggle state.
 - Color/popover uses simple focus/close. Consider focus trapping and keyboard support for advanced use.
 - Placeholder uses `:empty::before` pattern inside the editable.
 
 ## Security Notes
 
 - HTML 1:1 paste intentionally skips sanitization (per feature request). For production, enable sanitization.
 - Basic paste sanitization utility exists (but is not used in 1:1 mode).
 
 ## Browser Notes
 
 - Uses `document.execCommand` (deprecated but widely supported). For production-grade editors, consider a more modern model (e.g., ProseMirror or ContentEditable+ custom ranges).
 
 ## CI
 
 - `.github/workflows/ci.yml` runs `npm ci` and `npm test` on push/PR.
 
 ## Coding Conventions
 
 - Keep components thin; push logic to `editor/*` utilities and view to `components/*`.
 - Avoid mutating the editable via Lit; the component manages `innerHTML` directly.
 - Keep toolbar purely presentational and drive it via props/handlers.
 
 ## Known Limitations / TODO
 
 - Minimal RTF conversion; formatting is not preserved.
 - No image editing UI (by design); import-only at caret.
 - No background color picker; no font size selector (easy to add).
 - Sanitization is minimal and off for 1:1 paste; integrate a sanitizer for production.
 
