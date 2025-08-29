import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { readImageFileAsDataURL } from '../utils/import-image.js';
import { readRtfFileAsHtml } from '../utils/import-rtf.js';
import { setupHiddenFileInput, attachDragAndDrop } from '../utils/import-wiring.js';
import { extractClipboardFragment, loadPastePrefs, saveLastPasteChoice, savePasteMode } from '../editor/paste.js';
import { renderEditorToolbar } from './editor-toolbar.js';
import './color-popover.js';
import { editorStyles } from '../styles/editor.css.js';
import { saveSelection as selSave, restoreSelection as selRestore, containsNode as selContains, closestBlock as selClosestBlock } from '../editor/selection.js';
import { execCommand, handleShortcut, toggleCodeBlock as cmdToggleCodeBlock, setAlignment } from '../editor/commands.js';

type Align = 'left' | 'center' | 'right' | 'justify';

@customElement('demo-rich-text-editor')
export class DemoRichTextEditor extends LitElement {
  static styles = editorStyles;

  @property({ type: String }) value: string = '';
  @property({ type: String }) placeholder: string = 'Start typing…';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, attribute: 'toolbar-visible' }) toolbarVisible: boolean = true;

  @state() private _isBold = false;
  @state() private _isItalic = false;
  @state() private _isUnderline = false;
  @state() private _isStrike = false;
  @state() private _align: Align = 'left';
  @state() private _fontFamily: string = 'Arial';
  @state() private _dragOver: boolean = false;
  // Image editing overlay removed; only import-at-caret remains
  private _openFilePicker?: () => void;
  private _cleanupImports?: () => void;
  @state() private _colorOpen: boolean = false;
  @state() private _foreColor: string = '#000000';
  private _savedRange: Range | null = null;
  @state() private _pastePromptOpen: boolean = false;
  @state() private _pendingPasteHtml: string = '';
  @state() private _pendingPasteText: string = '';
  @property({ type: String, attribute: 'paste-mode' }) pasteMode: 'prompt' | 'html' | 'text' = 'prompt';
  @state() private _lastPasteChoice: 'html' | 'text' = 'html';

  private _changeDebounce?: number;
  private get editable(): HTMLDivElement | null {
    return this.renderRoot?.querySelector('.content') as HTMLDivElement | null;
  }

  protected firstUpdated(): void {
    const editable = this.editable;
    if (!editable) return;
    const ddCleanup = attachDragAndDrop(editable, {
      onFiles: (files) => this.importFiles(files),
      onDragState: (drag) => (this._dragOver = drag),
    });
    const { open, cleanup } = setupHiddenFileInput(this.renderRoot, {
      accept: 'image/*,.rtf,application/rtf',
      multiple: true,
      onFiles: (files) => this.importFiles(files),
    });
    this._openFilePicker = open;
    this._cleanupImports = () => {
      ddCleanup();
      cleanup();
    };
    // Load paste preferences
    const prefs = loadPastePrefs();
    this.pasteMode = prefs.mode;
    this._lastPasteChoice = prefs.last;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('selectionchange', this._handleSelectionChange, { passive: true });
  }

  disconnectedCallback(): void {
    document.removeEventListener('selectionchange', this._handleSelectionChange as any);
    if (this._cleanupImports) this._cleanupImports();
    super.disconnectedCallback();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('value')) {
      const el = this.editable;
      if (el && el.innerHTML !== this.value) {
        el.innerHTML = this.value || '';
      }
    }
    if (changed.has('disabled')) {
      if (this.editable) this.editable.contentEditable = this.disabled ? 'false' : 'true';
    }
  }

  render() {
    return html`
      <div class="editor" @keydown=${this._onKeyDown}>
        ${this.toolbarVisible ? renderEditorToolbar({
            disabled: this.disabled,
            isBold: this._isBold,
            isItalic: this._isItalic,
            isUnderline: this._isUnderline,
            isStrike: this._isStrike,
            align: this._align,
            fontFamily: this._fontFamily,
            foreColor: this._foreColor,
            colorOpen: this._colorOpen,
            pasteMode: this.pasteMode,
            pastePromptOpen: this._pastePromptOpen,
            lastPasteChoice: this._lastPasteChoice,
          }, {
            onImport: () => this._openImportDialog(),
            onColorButton: () => { this._saveSelection(); this._toggleColorPicker(); },
            onColorChange: (color: string) => this._applyColor(color),
            onColorClose: () => this._closeColorPicker(),
            onPasteToggle: () => this._togglePasteMode(),
            onApplyPasteHtml: () => this._applyPaste('html'),
            onApplyPasteText: () => this._applyPaste('text'),
            onCancelPaste: () => this._cancelPastePrompt(),
            onSetFont: (family: string) => this.setFont(family),
            onExec: (cmd: string, val?: string) => this.exec(cmd, val),
            onSetAlign: (a) => this.setAlign(a),
            onToggleCodeBlock: () => this.toggleCodeBlock(),
            onPromptLink: () => this.promptLink(),
          }) : nothing}
        <div
          class="content placeholder"
          data-placeholder=${this.placeholder}
          contenteditable=${!this.disabled}
          role="textbox"
          aria-multiline="true"
          @input=${this._onInput}
          @blur=${this._onBlur}
          @paste=${this._onPaste}
          data-drag=${this._dragOver ? 'true' : 'false'}
        ></div>
      </div>
    `;
  }

  

  private _onInput = () => {
    const html = this.editable?.innerHTML || '';
    this.value = html;
    this.dispatchEvent(new CustomEvent('input', { detail: { html } }));
    window.clearTimeout(this._changeDebounce);
    this._changeDebounce = window.setTimeout(() => {
      this.dispatchEvent(new CustomEvent('change', { detail: { html: this.value } }));
    }, 300);
    this._updateButtonStates();
  };

  private _onBlur = () => {
    this._updateButtonStates();
  };

  private _onPaste = (e: ClipboardEvent) => {
    const html = e.clipboardData?.getData('text/html') ?? '';
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (html) {
      const frag = this._extractClipboardFragment(html);
      if (this.pasteMode === 'html') {
        e.preventDefault();
        this.exec('insertHTML', frag);
        return;
      }
      if (this.pasteMode === 'text') {
        e.preventDefault();
        this.exec('insertText', text);
        return;
      }
      // prompt mode
      e.preventDefault();
      this._saveSelection();
      this._pendingPasteHtml = frag;
      this._pendingPasteText = text;
      this._pastePromptOpen = true;
      return;
    }
    // No HTML available -> plain text
    e.preventDefault();
    this.exec('insertText', text);
  };

  private _togglePasteMode = () => {
    const order: ('prompt'|'html'|'text')[] = ['prompt','html','text'];
    const i = order.indexOf(this.pasteMode);
    this.pasteMode = order[(i + 1) % order.length];
    savePasteMode(this.pasteMode);
  }

  private _applyPaste(mode: 'html' | 'text') {
    this._restoreSelection();
    if (mode === 'html') {
      // Insert as-is (1:1) per user choice
      this.exec('insertHTML', this._pendingPasteHtml);
    } else {
      this.exec('insertText', this._pendingPasteText);
    }
    this._lastPasteChoice = mode;
    saveLastPasteChoice(mode);
    this._pendingPasteHtml = '';
    this._pendingPasteText = '';
    this._pastePromptOpen = false;
  }

  private _cancelPastePrompt = () => {
    this._pendingPasteHtml = '';
    this._pendingPasteText = '';
    this._pastePromptOpen = false;
  };

  private _extractClipboardFragment(html: string): string {
    // If StartFragment/EndFragment markers exist, extract between them precisely
    const startMarker = '<!--StartFragment-->';
    const endMarker = '<!--EndFragment-->';
    const si = html.indexOf(startMarker);
    const ei = html.indexOf(endMarker);
    if (si !== -1 && ei !== -1 && ei > si) {
      return html.substring(si + startMarker.length, ei);
    }
    // Otherwise, parse and get body contents
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      if (doc && doc.body) return doc.body.innerHTML || '';
    } catch {}
    // Fallback to raw html
    return html;
  }

  private _sanitizePastedHtml(html: string): string {
    // Very basic sanitization for demo: strip scripts/iframes/objects and on* handlers
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const wrapper = doc.body.firstElementChild as HTMLElement | null;
    if (!wrapper) return html;

    const blocklist = ['script', 'iframe', 'object', 'embed', 'style', 'link'];
    wrapper.querySelectorAll(blocklist.join(',')).forEach((el) => el.remove());
    const treeWalker = doc.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT, null);
    while (treeWalker.nextNode()) {
      const el = treeWalker.currentNode as HTMLElement;
      // Remove event handler attributes
      const toRemove: string[] = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes.item(i);
        if (attr && /^on/i.test(attr.name)) toRemove.push(attr.name);
      }
      toRemove.forEach((name) => el.removeAttribute(name));
    }
    return wrapper.innerHTML;
  }

  private _saveSelection() { this._savedRange = selSave(); }

  private _restoreSelection() { return selRestore(this._savedRange); }

  private _toggleColorPicker() {
    this._colorOpen = !this._colorOpen;
  }

  private _closeColorPicker() {
    this._colorOpen = false;
  }

  private _applyColor(color: string) {
    // Restore selection to apply color at the original caret
    this._restoreSelection();
    this.exec('foreColor', color);
    this._foreColor = color;
    // keep picker open for quick multiple choices
  }

  // Drag & drop events handled by helper (see firstUpdated)

  // Click handling no longer selects images

  

  

  private _onKeyDown = (e: KeyboardEvent) => {
    const handled = handleShortcut(e, {
      bold: () => this.exec('bold'),
      italic: () => this.exec('italic'),
      underline: () => this.exec('underline'),
      link: () => this.promptLink(),
    });
    if (handled) return;
  };

  private _handleSelectionChange = () => {
    // Only update if selection is inside our editor
    const sel = document.getSelection();
    const editable = this.editable;
    if (!sel || !editable) return;
    const anchorNode = sel.anchorNode;
    if (!anchorNode) return;
    if (selContains(editable, anchorNode)) {
      this._updateButtonStates();
      this.dispatchEvent(new CustomEvent('selection-change'));
    }
  };

  // containsNode moved to selection utils

  private focusEditor() {
    const editable = this.editable;
    if (!editable) return;
    if (document.activeElement !== editable) {
      editable.focus();
      // Place cursor at end if empty
      if (editable.innerHTML === '' || editable.innerHTML === '<br>') {
        const range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  exec(command: string, value?: string) {
    if (this.disabled) return;
    this.focusEditor();
    execCommand(command, value);
    this._onInput();
  }

  private _openImportDialog() {
    if (this._openFilePicker) {
      this._openFilePicker();
      return;
    }
    // Fallback: ephemeral input if helper not initialized yet
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.rtf,application/rtf';
    input.multiple = true;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    const onChange = async (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (el.files && el.files.length) {
        await this.importFiles(el.files);
      }
      input.removeEventListener('change', onChange);
      input.remove();
    };
    input.addEventListener('change', onChange);
    document.body.appendChild(input);
    input.click();
  }

  

  async importFiles(fileList: FileList) {
    for (const file of Array.from(fileList)) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readImageFileAsDataURL(file);
        this.exec('insertImage', dataUrl);
      } else if (file.type === 'application/rtf' || file.name.toLowerCase().endsWith('.rtf')) {
        const html = await readRtfFileAsHtml(file);
        this.exec('insertHTML', html);
      }
    }
    this._onInput();
  }

  

  

  

  

  promptLink() {
    const url = window.prompt('Enter URL (e.g. https://example.com):');
    if (!url) return;
    this.exec('createLink', url);
  }

  toggleCodeBlock() {
    cmdToggleCodeBlock(this.editable);
    this._onInput();
  }

  setAlign(alignment: Align) {
    setAlignment(alignment);
    this._align = alignment;
  }

  clearFormatting() {
    // remove inline formatting
    this.exec('removeFormat');
    // Normalize block types back to P if headings/quotes/lists are selected
    // Best-effort: set current block to P
    this.exec('formatBlock', 'P');
  }

  // closestBlock moved to selection utils

  private _updateButtonStates() {
    try {
      this._isBold = document.queryCommandState('bold');
      this._isItalic = document.queryCommandState('italic');
      this._isUnderline = document.queryCommandState('underline');
      this._isStrike = document.queryCommandState('strikeThrough');
      // Font family state (robust)
      let fam = this.normalizeFontName((document.queryCommandValue('fontName') as string | null) || '');
      if (!fam) {
        const node = document.getSelection()?.anchorNode ?? null;
        const el = (node instanceof Element ? node : (node as Node | null)?.parentElement) as Element | null;
        const ff = el ? getComputedStyle(el).fontFamily || '' : '';
        fam = this.parseFirstFontFamily(ff);
      }
      this._fontFamily = this.canonicalFontName(fam) || 'Arial';
      // Foreground color state
      let col = (document.queryCommandValue('foreColor') as string | null) || '';
      if (col) {
        this._foreColor = this._normalizeColor(col) || this._foreColor;
      }
      // Alignment state is not consistently reported; keep last user selection
      // Optionally, we can inspect closest block's text-align
      const block = selClosestBlock(this.editable, document.getSelection()?.anchorNode ?? null);
      if (block) {
        const ta = (block.style.textAlign || getComputedStyle(block).textAlign || 'left') as Align;
        if (['left', 'center', 'right', 'justify'].includes(ta)) {
          this._align = ta as Align;
        }
      }
    } catch {
      // ignore for demo
    }
  }

  private _normalizeColor(input: string): string {
    // Converts various color formats to hex 6-digit where possible
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return input;
    ctx.fillStyle = '#000';
    ctx.fillStyle = input;
    // Some browsers keep it as rgb(...)
    const computed = ctx.fillStyle as string;
    if (/^#[0-9a-fA-F]{3,8}$/.test(computed)) {
      // expand 3-digit to 6-digit
      if (computed.length === 4) {
        const r = computed[1], g = computed[2], b = computed[3];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
      }
      return computed.toLowerCase();
    }
    const m = computed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) {
      const r = Number(m[1]).toString(16).padStart(2, '0');
      const g = Number(m[2]).toString(16).padStart(2, '0');
      const b = Number(m[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toLowerCase();
    }
    return input;
  }

  // Image overlay helpers removed

  // All crop logic removed

  private normalizeFontName(name: string): string {
    return name.replace(/["']/g, '').trim();
  }

  private parseFirstFontFamily(ff: string): string {
    if (!ff) return '';
    const first = ff.split(',')[0] || '';
    return this.normalizeFontName(first);
  }

  private canonicalFontName(name: string): string {
    const n = this.normalizeFontName(name).toLowerCase();
    const map: Record<string, string> = {
      'arial': 'Arial',
      'georgia': 'Georgia',
      'times new roman': 'Times New Roman',
      'times': 'Times New Roman',
      'courier new': 'Courier New',
      'consolas': 'Consolas',
      'sans-serif': 'sans-serif',
      'serif': 'serif',
      'monospace': 'monospace',
      'helvetica': 'Arial',
      'system-ui': 'sans-serif',
      '-apple-system': 'sans-serif',
      'segoe ui': 'sans-serif',
      'roboto': 'sans-serif'
    };
    return map[n] || '';
  }

  setFont(family: string) {
    if (!family) return;
    this.exec('fontName', family);
    this._fontFamily = this.canonicalFontName(family) || 'Arial';
  }

  // Minimal safe HTML injection for known content; for demo purposes only.
  private _safeHTML(html: string) {
    // Avoid setting via unsafeHTML directive to keep dependencies minimal.
    // Set as text if we detect suspicious angle bracket patterns (very naive).
    const suspicious = /<script|on\w+=|<iframe|<object|<embed/i.test(html);
    return suspicious ? html.replace(/</g, '&lt;').replace(/>/g, '&gt;') : html;
  }

  // Public API
  getHTML(): string {
    return this.editable?.innerHTML ?? '';
  }

  setHTML(html: string) {
    if (this.editable) {
      this.editable.innerHTML = html;
      this.value = html;
      this._onInput();
    } else {
      this.value = html;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-rich-text-editor': DemoRichTextEditor;
  }
}
