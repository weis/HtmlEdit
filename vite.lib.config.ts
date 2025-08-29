import { defineConfig } from 'vite';
import path from 'node:path';

// Library build config (ESM only). Externalizes major deps so consumers control versions.
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/rich-text-editor.ts'),
      name: 'HtmlEdit',
      fileName: (format) => `html-edit.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^lit/, /^prosemirror-/],
    },
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: false,
  },
});

