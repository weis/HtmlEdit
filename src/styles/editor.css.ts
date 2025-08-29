import { css } from 'lit';

export const editorStyles = css`
  :host {
    display: block;
    position: relative;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
  }
  .editor {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }
  .toolbar button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
    font-size: 14px;
    color: #374151;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
  }
  .toolbar button[aria-pressed="true"] {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: #3730a3;
  }
  .toolbar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sep {
    width: 1px;
    background: #e5e7eb;
    margin: 0 4px;
  }
  .content {
    min-height: 200px;
    padding: 12px;
    outline: none;
    font-family: Arial, Helvetica, sans-serif; /* default editor content font */
  }
  /* ProseMirror minimal styles inside shadow DOM */
  .ProseMirror {
    white-space: pre-wrap; /* satisfy PM expectation */
    word-wrap: break-word;
    outline: none;
  }
  .ProseMirror p { margin: 0.5em 0; }
  .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; }
  .ProseMirror img {
    max-width: 100%;
    height: auto;
    display: inline-block;
  }
  .content img { max-width: 100%; height: auto; }
  .content[data-drag="true"] {
    outline: 2px dashed #6366f1;
    outline-offset: -2px;
    background: #eef2ff;
  }
  .placeholder:empty::before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
  }
  /* Basic content styling */
  .content h1 { font-size: 1.5rem; margin: 0.75em 0 0.5em; }
  .content h2 { font-size: 1.25rem; margin: 0.75em 0 0.5em; }
  .content p { margin: 0.5em 0; }
  .content blockquote {
    border-left: 4px solid #e5e7eb;
    margin: 0.5em 0;
    padding-left: 0.75em;
    color: #6b7280;
  }
  .content pre {
    background: #0b1021;
    color: #e5e7eb;
    padding: 8px;
    border-radius: 6px;
    overflow: auto;
  }
  .content a { color: #2563eb; text-decoration: underline; }
`;
