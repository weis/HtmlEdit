import { html, nothing, TemplateResult } from 'lit';

type Align = 'left' | 'center' | 'right' | 'justify';
type PasteMode = 'prompt' | 'html' | 'text';

export interface ToolbarProps {
  disabled: boolean;
  isBold: boolean; isItalic: boolean; isUnderline: boolean; isStrike: boolean;
  align: Align;
  fontFamily: string;
  foreColor: string;
  colorOpen: boolean;
  pasteMode: PasteMode;
  pastePromptOpen: boolean;
  lastPasteChoice: 'html'|'text';
}

export interface Handlers {
  onImport: () => void;
  onColorButton: () => void;
  onColorChange: (color: string) => void;
  onColorClose: () => void;
  onPasteToggle: () => void;
  onApplyPasteHtml: () => void;
  onApplyPasteText: () => void;
  onCancelPaste: () => void;
  onSetFont: (family: string) => void;
  onSaveSelection: () => void;
  onExec: (command: string, value?: string) => void;
  onSetAlign: (align: Align) => void;
  onToggleCodeBlock: () => void;
  onPromptLink: () => void;
}

export function renderEditorToolbar(p: ToolbarProps, h: Handlers): TemplateResult {
  const btn = (label: string, title: string, pressed: boolean, onClick: () => void, disabled = p.disabled) => html`
    <button
      type="button"
      aria-label=${title}
      title=${title}
      aria-pressed=${String(pressed)}
      ?disabled=${disabled}
      @mousedown=${(e: MouseEvent) => e.preventDefault()}
      @click=${onClick}
    >${label}</button>
  `;

  const fonts = [
    { label: 'Arial', value: 'Arial', css: 'Arial, Helvetica, sans-serif' },
    { label: 'Georgia', value: 'Georgia', css: 'Georgia, serif' },
    { label: 'Times New Roman', value: 'Times New Roman', css: '"Times New Roman", Times, serif' },
    { label: 'Courier New', value: 'Courier New', css: '"Courier New", Courier, monospace' },
    { label: 'Consolas', value: 'Consolas', css: 'Consolas, monospace' },
    { label: 'Sans-serif', value: 'sans-serif', css: '-apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif' },
    { label: 'Serif', value: 'serif', css: 'serif' },
    { label: 'Monospace', value: 'monospace', css: 'monospace' },
  ];

  return html`
    <div class="toolbar" role="toolbar" aria-label="Editor toolbar">
      <button type="button" aria-label="Import files" title="Import files (images, RTF)" ?disabled=${p.disabled} @click=${h.onImport}>📁 Import</button>
      <div class="sep" role="separator"></div>
      <span style="position:relative;display:inline-flex;align-items:center;gap:6px;">
        <button type="button" aria-label="Text color" title="Text color" ?disabled=${p.disabled} style=${`color:${p.foreColor}`} @mousedown=${(e: MouseEvent) => e.preventDefault()} @click=${h.onColorButton}>A▾</button>
        ${p.colorOpen ? html`
          <color-popover .open=${p.colorOpen} .value=${p.foreColor} @color-change=${(e: CustomEvent) => h.onColorChange((e.detail as any).color)} @color-close=${h.onColorClose}></color-popover>
        `: nothing}
      </span>
      <div class="sep" role="separator"></div>
      <button type="button" title="Toggle paste mode" @click=${h.onPasteToggle}>
        Paste: ${p.pasteMode === 'prompt' ? 'Prompt' : p.pasteMode === 'html' ? 'HTML 1:1' : 'Plain text'}
      </button>
      <div class="sep" role="separator"></div>
      <select aria-label="Font family" ?disabled=${p.disabled}
        .value=${p.fontFamily || ''}
        @mousedown=${() => h.onSaveSelection()}
        @focus=${() => h.onSaveSelection()}
        @change=${(e: Event) => h.onSetFont((e.target as HTMLSelectElement).value)}>
        <option value="" disabled>Font</option>
        <option value="__default" style="font-family: Arial, Helvetica, sans-serif">Default (Arial)</option>
        ${fonts.map(f => html`<option value=${f.value} style="font-family:${f.css}">${f.label}</option>`)}
      </select>
      <div class="sep" role="separator"></div>
      ${btn('B', 'Bold', p.isBold, () => h.onExec('bold'))}
      ${btn('I', 'Italic', p.isItalic, () => h.onExec('italic'))}
      ${btn('U', 'Underline', p.isUnderline, () => h.onExec('underline'))}
      ${btn('S', 'Strikethrough', p.isStrike, () => h.onExec('strikeThrough'))}
      <div class="sep" role="separator"></div>
      ${btn('H1', 'Heading 1', false, () => h.onExec('formatBlock', 'H1'))}
      ${btn('H2', 'Heading 2', false, () => h.onExec('formatBlock', 'H2'))}
      ${btn('P', 'Paragraph', false, () => h.onExec('formatBlock', 'P'))}
      <div class="sep" role="separator"></div>
      ${btn('OL', 'Ordered List', false, () => h.onExec('insertOrderedList'))}
      ${btn('UL', 'Unordered List', false, () => h.onExec('insertUnorderedList'))}
      <div class="sep" role="separator"></div>
      ${btn('“”', 'Quote', false, () => h.onExec('formatBlock', 'BLOCKQUOTE'))}
      ${btn('<>', 'Code Block', false, () => h.onToggleCodeBlock())}
      <div class="sep" role="separator"></div>
      ${btn('🔗', 'Add link', false, () => h.onPromptLink())}
      ${btn('❌', 'Remove link', false, () => h.onExec('unlink'))}
      <div class="sep" role="separator"></div>
      ${btn('⟲', 'Undo', false, () => h.onExec('undo'))}
      ${btn('⟳', 'Redo', false, () => h.onExec('redo'))}
      <div class="sep" role="separator"></div>
      ${btn('⟸', 'Align left', p.align === 'left', () => h.onSetAlign('left'))}
      ${btn('⇔', 'Align center', p.align === 'center', () => h.onSetAlign('center'))}
      ${btn('⟹', 'Align right', p.align === 'right', () => h.onSetAlign('right'))}
      ${btn('≋', 'Justify', p.align === 'justify', () => h.onSetAlign('justify'))}
      <div class="sep" role="separator"></div>
      ${btn('⌫', 'Clear formatting', false, () => h.onExec('removeFormat'))}
      ${p.pastePromptOpen ? html`
        <div style="margin-left:8px; display:inline-flex; align-items:center; gap:6px; background:#111827; color:#f9fafb; border:1px solid #374151; padding:6px; border-radius:6px;">
          <span>Paste options:</span>
          ${p.lastPasteChoice === 'html' ? html`
            <button style="font-weight:600;" @mousedown=${(e:MouseEvent)=>e.preventDefault()} @click=${h.onApplyPasteHtml}>HTML 1:1 (last)</button>
            <button @mousedown=${(e:MouseEvent)=>e.preventDefault()} @click=${h.onApplyPasteText}>Plain text</button>
          ` : html`
            <button @mousedown=${(e:MouseEvent)=>e.preventDefault()} @click=${h.onApplyPasteHtml}>HTML 1:1</button>
            <button style="font-weight:600;" @mousedown=${(e:MouseEvent)=>e.preventDefault()} @click=${h.onApplyPasteText}>Plain text (last)</button>
          `}
          <button @mousedown=${(e:MouseEvent)=>e.preventDefault()} @click=${h.onCancelPaste}>Cancel</button>
        </div>
      `: nothing}
    </div>
  `;
}
