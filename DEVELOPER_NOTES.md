# HtmlEdit – Developer Notes

This document explains the internals of the demo rich text editor and how we use ProseMirror as the editing engine. It includes implementation notes, extension points, and code snippets for common tasks.

## Architecture Overview

- Web Component: `<demo-rich-text-editor>` (Lit + TypeScript)
- Engine: ProseMirror (PM) only — no `document.execCommand`
- Composition:
  - Component manages the shadow DOM, toolbar wiring, paste/import flows, and event emission
  - `PMEngine` wraps ProseMirror state/view, schema, and command mapping for an editor-friendly API
  - Toolbar is a pure view renderer that calls back into the component

Key files:
- `src/components/rich-text-editor.ts` – component logic, events, toolbar wiring
- `src/editor/pm-engine.ts` – PM schema, view, commands, and helpers
- `src/styles/editor.css.ts` – editor styles (includes minimal PM styles)
- `src/editor/keymap.ts` – keyboard shortcuts helper
- `src/editor/paste.ts` – paste fragment extraction (Start/EndFragment) + prefs
- `src/utils/*` – import helpers (image/RTF) + input/DnD wiring

## ProseMirror Engine

`PMEngine` encapsulates:
- Schema: extends `prosemirror-schema-basic` with:
  - Marks: `underline`, `strike`, `color` (style `color:`), `font` (style `font-family:`)
  - Nodes: block alignment attribute (`textAlign`) on `paragraph` and `heading`
  - Lists via `prosemirror-schema-list`
- View/State: `EditorView`, `EditorState`, history, drop/gap cursor, keymaps
- onUpdate: called on every state update to provide serialized HTML to the component
- onState: exposes formatting flags and selection-derived state (bold/italic/underline/strike, align, foreColor, fontFamily)

### Command Mapping

`PMEngine.exec(name, value?)` supports:
- Inline: `bold`, `italic`, `underline`, `strikeThrough`
- Blocks: `formatBlock` with `H1`/`H2`/`BLOCKQUOTE`/`PRE`/`P`
- Lists: `insertOrderedList`, `insertUnorderedList`
- Links: `createLink`, `unlink`
- Marks: `foreColor` (color mark), `fontName` (font mark)
- Alignment: `setAlign` with `'left'|'center'|'right'|'justify'`
- Content: `insertHTML`, `insertHTMLSanitized`, `insertText`, `insertImage`
- History: `undo`, `redo`
- Clear: `removeFormat` (clears strong/em/underline/strike/link/code/color/font)

Caret behavior: For `fontName`/`foreColor` at an empty selection, we adjust stored marks so newly typed text adopts the change.

### Schema Serialization

`PMEngine.getHTML()` serializes the current doc using `DOMSerializer.fromSchema(schema)`, so content reflects PM’s model (marks/nodes) in HTML.

## Component Event Model

- The component subscribes to PM updates and emits:
  - `input`: for each PM transaction with `{ html }`
  - `change`: debounced ~300ms after the last input with `{ html }`
  - `selection-change`: throttled ~75ms with `{ from, to, empty }`
- All events originate from PM updates to avoid duplicates.

### Listening to events

```ts
const editor = document.querySelector('demo-rich-text-editor') as HTMLElement;

// Input: fires on every PM transaction
editor.addEventListener('input', (e: Event) => {
  const { html } = (e as CustomEvent<{ html: string }>).detail;
  console.log('input html length:', html.length);
});

// Change: debounced (~300ms) after last input
editor.addEventListener('change', (e: Event) => {
  const { html } = (e as CustomEvent<{ html: string }>).detail;
  console.log('change html:', html);
});

// Selection changes: throttled (~75ms)
editor.addEventListener('selection-change', (e: Event) => {
  const sel = (e as CustomEvent<{ from: number; to: number; empty: boolean }>).detail;
  console.log('selection:', sel.from, sel.to, sel.empty);
});
```

### Invoking commands

```ts
const editor = document.querySelector('demo-rich-text-editor') as any;

// Inline formatting
editor.exec('bold');
editor.exec('italic');
editor.exec('underline');
editor.exec('strikeThrough');

// Blocks
editor.exec('formatBlock', 'H1');
editor.exec('formatBlock', 'BLOCKQUOTE');
editor.exec('formatBlock', 'PRE'); // code block

// Lists
editor.exec('insertOrderedList');
editor.exec('insertUnorderedList');

// Links
editor.exec('createLink', 'https://example.com');
editor.exec('unlink');

// Alignment
editor.exec('setAlign', 'center');

// Font & color (marks)
editor.exec('fontName', 'Georgia');
editor.exec('foreColor', '#ff0066');
editor.exec('fontName', '__default'); // clear custom font family

// Insert content
editor.exec('insertText', 'Hello world');
editor.exec('insertHTML', '<strong>Raw HTML</strong>');
editor.exec('insertImage', 'data:image/png;base64,...');

// History
editor.exec('undo');
editor.exec('redo');

// Clear inline marks + reset block to paragraph
editor.exec('removeFormat');
editor.exec('formatBlock', 'P');
```

### Programmatic HTML

```ts
const editor = document.querySelector('demo-rich-text-editor') as any;
editor.setHTML('<p>Start from here</p>');
console.log(editor.getHTML());
```

## Paste Flow & Sanitization

Paste modes:
- `html`: insert exact HTML (1:1) using Start/EndFragment if present
- `text`: insert as text
- `prompt`: UI asks per paste (remembers last choice)

Sanitization policy:
- If `sanitize-paste` attribute is present, HTML insertion is sanitized unless `paste-mode === 'html'` (true 1:1).
- Plain text insertion is unaffected.

## Styling

`src/styles/editor.css.ts` provides minimal styles:
- Editor container and toolbar
- `.content` host div with padding and min-height
- ProseMirror-specific rules:
  - `.ProseMirror { white-space: pre-wrap; word-wrap: break-word; outline: none; }`
  - Paragraph/list margins
  - `.ProseMirror img { max-width: 100%; height: auto; }` to keep images responsive

## Debugging

- Demo supports a URL flag to enable debug aids:
  - `?rteDebug` or `?debug=1` or `?debug=true`
  - Enables verbose logs (`editor.debug = true`) and an on-page HUD for counts of `input`, `change`, and `selection-change` events (exposes `window.__rteHud.reset()`).

## Setup & Installation

Prerequisites:
- Node.js 18+ and npm 9+

Install and run (in this repo):
- Install deps: `npm install`
- Dev server (hot reload): `npm run dev` → http://localhost:5173
- Build: `npm run build` → emits to `dist/`
- Preview built output: `npm run preview` → http://localhost:4173

Integrating into another project:
- Add dependencies (ProseMirror core + list schema) and Vite if you need a dev server:
  - `npm i lit prosemirror-model prosemirror-state prosemirror-view prosemirror-commands prosemirror-history prosemirror-keymap prosemirror-schema-basic prosemirror-schema-list prosemirror-dropcursor prosemirror-gapcursor`
  - `npm i -D vite typescript`
- Copy or adapt:
  - Component: `src/components/rich-text-editor.ts`
  - PM engine: `src/editor/pm-engine.ts`
  - Styles: `src/styles/editor.css.ts`
  - Optional helpers: `src/editor/keymap.ts`, `src/editor/paste.ts`, `src/utils/*`
- Ensure your bundler handles ESM and TypeScript. With Vite, set `type: module` in `package.json` (already set here) and run `vite`.

### Minimal config snippets (for consumers)

`package.json` (important fields)
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  },
  "include": ["src"]
}
```

`vite.config.ts`
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
});
```

`src/index.ts` (example entry)
```ts
import './components/rich-text-editor.ts';

const editor = document.createElement('demo-rich-text-editor');
editor.value = '<p>Hello <strong>world</strong>!</p>';
document.body.appendChild(editor);
```

`index.html`
```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Editor Demo</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/index.ts"></script>
  </body>
  </html>
```

## Extending the PM Schema

- To add a new mark (e.g., background highlight), extend the marks spec in `createSchema()` inside `pm-engine.ts`, then map a command in `exec()` and render UI in the toolbar.
- For new block attributes, mirror the `textAlign` pattern: include in `attrs`, adjust parseDOM/toDOM, and set via a command that updates node markup in a selection range.

## Testing Notes

- Most behaviors are driven by PM transactions, so event testing focuses on emitted events from the component and HTML serialization.
- For paste handling, unit tests can validate fragment extraction; for HTML sanitization, consider DOMPurify in production.

## Publishing as a Library

You can ship the component as a library using Vite’s library mode.

### Option A: ESM-only (recommended)

`vite.lib.config.ts`
```ts
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/rich-text-editor.ts'),
      name: 'HtmlEdit',
      fileName: (format) => `html-edit.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      // Externalize big deps so consumers control versions
      external: [/^lit/, /^prosemirror-/],
    },
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: false,
  },
});
```

`package.json` (library-relevant fields)
```json
{
  "name": "html-edit",
  "version": "0.0.1",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/html-edit.es.js"
    }
  },
  "scripts": {
    "build:lib": "vite build -c vite.lib.config.ts"
  },
  "peerDependencies": {
    "lit": ">=3",
    "prosemirror-model": ">=1",
    "prosemirror-state": ">=1",
    "prosemirror-view": ">=1"
  }
}
```

Optional type declarations (basic):
- Generate `.d.ts` with a separate command if you want to publish types.

`scripts` entry (adds a types build):
```json
{
  "types": "tsc --emitDeclarationOnly --declaration --outDir dist"
}
```
Run `npm run types` before `npm publish` and reference with `"types": "./dist/index.d.ts"` in `package.json` if needed.

### Option B: ESM + UMD

Adding UMD requires declaring globals or bundling dependencies. Prefer ESM if possible. If you still want UMD:

`vite.lib.config.ts` (UMD + ES)
```ts
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/rich-text-editor.ts'),
      name: 'HtmlEdit',
      fileName: (format) => `html-edit.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: [/^lit/, /^prosemirror-/],
      output: {
        globals: {
          lit: 'lit',
          'prosemirror-model': 'prosemirrorModel',
          'prosemirror-state': 'prosemirrorState',
          'prosemirror-view': 'prosemirrorView'
        }
      }
    },
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: false,
  },
});
```

Note: Consumers must provide those globals in UMD scenarios (e.g., via script tags). ESM remains the simplest and most robust distribution.

### Usage (consumer)

```ts
// ESM
import 'html-edit/html-edit.es.js';

const el = document.createElement('demo-rich-text-editor');
el.value = '<p>Hello!</p>';
document.body.appendChild(el);
```

### Publish

1) Ensure `name`, `version`, `license`, and `repository` fields are set in `package.json`.
2) Build: `npm run build:lib` (and `npm run types` if publishing types).
3) Publish: `npm publish --access public` (or your scoped access policy).
