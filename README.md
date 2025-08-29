# HtmlEdit

A Lit-based demo rich text editor web component (`<demo-rich-text-editor>`) written in TypeScript. It supports basic formatting (bold/italic/underline/strike, headings, lists, quote, code), links, alignment, undo/redo, clear formatting, font family, text color, import-at-caret for images/RTF, and flexible paste modes. The editor engine is ProseMirror-based (no `execCommand`).

## Quick start

- Install dependencies:
  - `npm install`
- Dev server (Vite):
  - `npm run dev` (serves at http://localhost:5173)
- Build for production:
  - `npm run build`
- Preview production build (Vite preview):
  - `npm run preview` (serves at http://localhost:4173)
- Run tests:
  - `npm test`

## Features

- Component: `<demo-rich-text-editor>` in `src/components/rich-text-editor.ts`
  - Props: `value`, `placeholder`, `disabled`, `paste-mode` (`prompt` | `html` | `text`), `sanitize-paste` (boolean)
  - Events: `input`, `change` (debounced ~300ms), `selection-change` (throttled)
  - Methods: `getHTML()`, `setHTML(html)`
  - Engine: ProseMirror (schema extended with color/font marks and block alignment)

### Event details

- `input`: fired for every ProseMirror transaction.
  - `detail`: `{ html: string }`
- `change`: debounced (~300ms) after the last `input`.
  - `detail`: `{ html: string }`
- `selection-change`: throttled (~75ms) during caret/selection movement.
  - `detail`: `{ from: number, to: number, empty: boolean }`

- Toolbar
  - Formatting, headings, lists, quote, code, links, alignment, clear
  - Font family selector
  - Text color popover
  - Paste mode toggle (Prompt / HTML 1:1 / Plain text)
- Paste handling
  - Exact HTML insertion using clipboard Start/EndFragment markers
  - Prompt mode with last choice remembered
  - Plain text mode
  - Sanitization: when `sanitize-paste` is true, HTML is sanitized unless `paste-mode === 'html'` (true 1:1). Plain text is unaffected.
- Import
  - Images (as data URLs) and `.rtf` best‑effort to HTML (demo‑level)
  - Drag and drop + toolbar Import button

## Tech

- Lit 3.x, TypeScript 5.x
- Vite for dev/build
- ProseMirror for editing

## File structure

- `src/components/rich-text-editor.ts` – main component (PM only)
- `src/components/editor-toolbar.ts` – toolbar template render helper
- `src/components/color-popover.ts` – small color picker popover
- `src/editor/pm-engine.ts` – ProseMirror engine wrapper and commands
- `src/editor/keymap.ts` – keyboard shortcut handler
- `src/editor/paste.ts` – paste fragment extraction + prefs
- `src/styles/editor.css.ts` – shared editor styles (includes minimal PM styles)
- `src/utils/*` – import helpers and wiring

## Behavior

- Events originate from PM transactions:
  - `input`: fired for each PM update (typing, commands, undo/redo) with `{ html }` detail.
  - `change`: debounced (~300ms) after the last input, with `{ html }` detail.
  - `selection-change`: throttled (~75ms) during active selection changes (e.g., mouse drag).
- Alignment and font/color operations are applied as schema attributes/marks, reflected in `getHTML()`.

## Debugging

- Enable a small on-page HUD and verbose logs with a URL flag:
  - `?rteDebug` or `?debug=1` or `?debug=true`
  - Example: `http://localhost:5173/?rteDebug`
  - Shows live counters for `input`, `change`, `selection-change`, and HTML length. Exposes `window.__rteHud.reset()`.

## Notes

- For production sanitization, consider DOMPurify or a vetted policy when enabling `sanitize-paste`.

## License

Not specified. Add a license of your choice if you plan to open source.
