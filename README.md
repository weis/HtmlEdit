# HtmlEdit

A Lit-based demo rich text editor web component (`<demo-rich-text-editor>`) written in TypeScript. It supports basic formatting (bold/italic/underline/strike, headings, lists, quote, code), links, alignment, undo/redo, clear formatting, font family, text color, import-at-caret for images/RTF, and flexible paste modes.

## Quick start

- Install deps (already vendored in this repo):
  - `npm install`
- Build TypeScript:
  - `npm run build`
- Preview (one-off build + static server on http://localhost:5173):
  - `npm run preview`
- Dev (watch) + static server in two terminals:
  - A: `npm run dev`
  - B: `npm start` (http://localhost:5173)
- Run tests:
  - `npm test`

## Features

- Component: `<demo-rich-text-editor>` in `src/components/rich-text-editor.ts`
  - Props: `value`, `placeholder`, `disabled`, `paste-mode` (`prompt` | `html` | `text`)
  - Events: `input`, `change`, `selection-change`
  - Methods: `getHTML()`, `setHTML(html)`
- Toolbar
  - Formatting, headings, lists, quote, code, links, alignment, clear
  - Font family selector
  - Text color popover
  - Paste mode toggle (Prompt / HTML 1:1 / Plain text)
- Paste handling
  - Exact HTML insertion using clipboard Start/EndFragment markers
  - Prompt mode with last choice remembered
  - Plain text mode
- Import
  - Images (as data URLs) and `.rtf` best‑effort to HTML (demo‑level)
  - Drag and drop + toolbar Import button

## Tech

- Lit 3.x, TypeScript 5.x
- No bundler required for preview (simple static server + import map)
- Minimal tests (Node): `test/commands.test.js`, `test/paste.test.js`

## File structure

- `src/components/rich-text-editor.ts` – main component
- `src/components/editor-toolbar.ts` – toolbar template render helper
- `src/components/color-popover.ts` – small color picker popover
- `src/editor/paste.ts` – paste fragment extraction + prefs
- `src/editor/selection.ts` – selection helpers
- `src/editor/commands.ts` – execCommand wrappers + shortcuts
- `src/styles/editor.css.ts` – shared editor styles
- `src/utils/*` – import helpers and wiring

## Notes

- Uses `document.execCommand` for simplicity (sufficient for a demo).
- For production sanitization, consider DOMPurify or a vetted policy.

## License

Not specified. Add a license of your choice if you plan to open source.

