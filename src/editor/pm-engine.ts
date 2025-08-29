import { Schema, DOMParser as PMDOMParser, DOMSerializer, NodeSpec, MarkSpec } from 'prosemirror-model';
import { EditorState, Plugin, Selection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes, wrapInList, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';

export type Align = 'left' | 'center' | 'right' | 'justify';

export class PMEngine {
  private view: EditorView | null = null;
  private schema: Schema;
  private container: HTMLElement;
  private onUpdate: (html: string) => void;
  private onState?: (flags: { bold: boolean; italic: boolean; underline: boolean; strike: boolean; align: Align; foreColor: string; fontFamily: string }) => void;
  private debug = false;

  constructor(container: HTMLElement, onUpdate: (html: string) => void, onState?: PMEngine['onState'], opts?: { debug?: boolean }) {
    this.container = container;
    this.onUpdate = onUpdate;
    this.onState = onState;
    this.debug = !!opts?.debug;
    this.schema = createSchema();
    this.init('');
  }

  private init(html: string) {
    const doc = this.parseHTML(html || '<p></p>');
    const state = EditorState.create({
      doc,
      plugins: [
        history(),
        dropCursor(),
        gapCursor(),
        keymap({
          'Mod-b': toggleMark(this.schema.marks.strong),
          'Mod-i': toggleMark(this.schema.marks.em),
          'Mod-u': toggleMark(this.schema.marks.underline),
          'Shift-Ctrl-9': wrapIn(this.schema.nodes.blockquote),
          'Shift-Ctrl-7': wrapInList(this.schema.nodes.ordered_list),
          'Shift-Ctrl-8': wrapInList(this.schema.nodes.bullet_list),
          'Mod-Alt-1': setBlockType(this.schema.nodes.heading, { level: 1 }),
          'Mod-Alt-2': setBlockType(this.schema.nodes.heading, { level: 2 }),
          'Mod-Alt-0': setBlockType(this.schema.nodes.paragraph),
        }),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
        keymap(baseKeymap),
        new Plugin({
          view: (view) => {
            let prevState: EditorState | null = view.state;
            return {
              update: (view, lastState) => {
                const curr = view.state;
                const prev = (lastState as EditorState) || prevState!;
                const docChanged = !curr.doc.eq(prev.doc);
                if (docChanged) {
                  this.onUpdate(this.getHTML());
                }
                // Always emit selection/mark/align flags for toolbar + selection listeners
                this.emitState();
                prevState = curr;
              },
            };
          },
        }),
      ],
    });
    this.view = new EditorView(this.container, {
      state,
      editable: () => true,
    });
    this.log('PM init complete');
  }

  destroy() {
    this.view?.destroy();
    this.view = null;
  }

  setDisabled(disabled: boolean) {
    if (!this.view) return;
    this.view.setProps({ editable: () => !disabled });
    this.log('PM setDisabled', { disabled });
  }

  setHTML(html: string) {
    if (!this.view) return;
    const doc = this.parseHTML(html || '<p></p>');
    const tr = this.view.state.tr.replaceWith(0, this.view.state.doc.content.size, doc.content);
    this.view.dispatch(tr);
    this.log('PM setHTML', { htmlLength: html?.length ?? 0 });
  }

  focus() { this.view?.focus(); }

  getHTML(): string {
    if (!this.view) return '';
    const serializer = DOMSerializer.fromSchema(this.schema);
    const div = document.createElement('div');
    div.appendChild(serializer.serializeFragment(this.view.state.doc.content));
    return div.innerHTML;
  }

  getStateFlags() {
    if (!this.view) return { bold: false, italic: false, underline: false, strike: false, align: 'left' as Align, foreColor: '#000000', fontFamily: '' };
    const { state } = this.view;
    const bold = markActive(state, this.schema.marks.strong);
    const italic = markActive(state, this.schema.marks.em);
    const underline = markActive(state, this.schema.marks.underline);
    const strike = markActive(state, this.schema.marks.strike);
    const align = ((state.selection.$from.parent.attrs.textAlign as Align) || 'left') as Align;
    const colorMark = this.schema.marks['color'];
    let foreColor = '#000000';
    const fontMark = this.schema.marks['font'];
    let fontFamily = '';
    if (colorMark) {
      const { empty, $from, from, to } = state.selection as any;
      if (empty) {
        const m = (state.storedMarks || $from.marks()).find((mm: any) => mm.type === colorMark);
        if (m?.attrs?.color) foreColor = String(m.attrs.color);
      } else {
        // inspect marks within range (simplified)
        const m = $from.marks().find((mm: any) => mm.type === colorMark);
        if (m?.attrs?.color) foreColor = String(m.attrs.color);
      }
    }
    if (fontMark) {
      const { empty, $from } = state.selection as any;
      if (empty) {
        const m = (state.storedMarks || $from.marks()).find((mm: any) => mm.type === fontMark);
        if (m?.attrs?.family) fontFamily = String(m.attrs.family);
      } else {
        const m = $from.marks().find((mm: any) => mm.type === fontMark);
        if (m?.attrs?.family) fontFamily = String(m.attrs.family);
      }
    }
    return { bold, italic, underline, strike, align, foreColor, fontFamily };
  }

  private emitState() {
    if (!this.onState) return;
    this.onState(this.getStateFlags());
  }

  private parseHTML(html: string) {
    const parser = PMDOMParser.fromSchema(this.schema);
    const div = document.createElement('div');
    div.innerHTML = html;
    return parser.parse(div);
  }

  exec(command: string, value?: string) {
    if (!this.view) return;
    const { state, dispatch } = this.view;
    const { schema } = this;
    const mark = (name: string) => schema.marks[name];
    const node = (name: string) => schema.nodes[name];

    const sel = state.selection;
    this.log('PM exec', { command, value, selection: { from: sel.from, to: sel.to, empty: sel.empty } });

    switch (command) {
      case 'bold': toggleMark(mark('strong'))(state, dispatch); break;
      case 'italic': toggleMark(mark('em'))(state, dispatch); break;
      case 'underline': toggleMark(mark('underline'))(state, dispatch); break;
      case 'strikeThrough': toggleMark(mark('strike'))(state, dispatch); break;
      case 'formatBlock':
        if (value === 'H1') setBlockType(node('heading'), { level: 1 })(state, dispatch);
        else if (value === 'H2') setBlockType(node('heading'), { level: 2 })(state, dispatch);
        else if (value === 'BLOCKQUOTE') wrapIn(node('blockquote'))(state, dispatch);
        else if (value === 'PRE') setBlockType(node('code_block'))(state, dispatch);
        else setBlockType(node('paragraph'))(state, dispatch);
        break;
      case 'insertOrderedList':
        this.toggleList('ordered_list');
        break;
      case 'insertUnorderedList':
        this.toggleList('bullet_list');
        break;
      case 'createLink':
        if (value) toggleMark(mark('link'), { href: value })(state, dispatch);
        break;
      case 'unlink':
        toggleMark(mark('link'), { href: null } as any)(state, dispatch);
        break;
      case 'foreColor':
        if (value) toggleMark(mark('color'), { color: value })(state, dispatch);
        break;
      case 'fontName':
        {
          const fm = mark('font');
          if (!fm) break;
          // If no value provided, treat as reset
          const family = value || '__default';
          const sel = state.selection as any;
          if (sel.empty) {
            // Caret: adjust stored mark so newly typed text adopts the font
            let tr = state.tr;
            // Always clear existing stored font mark first
            tr = tr.removeStoredMark(fm);
            if (family !== '__default') {
              tr = tr.addStoredMark(fm.create({ family }));
            }
            dispatch(tr.scrollIntoView());
          } else {
            // Range: remove existing font mark and optionally add new one
            let tr = state.tr.removeMark(sel.from, sel.to, fm);
            if (family !== '__default') {
              tr = tr.addMark(sel.from, sel.to, fm.create({ family }));
            }
            dispatch(tr.scrollIntoView());
          }
        }
        break;
      case 'setAlign':
        {
          const align = (value as any) as Align;
          const { from, to } = state.selection;
          let tr = state.tr;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isTextblock && node.type.name !== 'code_block') {
              const next = { ...node.attrs, textAlign: align === 'left' ? null : align } as any;
              tr = tr.setNodeMarkup(pos, node.type, next, node.marks);
            }
          });
          dispatch(tr.scrollIntoView());
        }
        break;
      case 'removeFormat':
        ['strong','em','underline','strike','link','code','color','font'].forEach(m => {
          const mm = mark(m);
          if (mm) toggleMark(mm)(state, dispatch);
        });
        break;
      case 'undo': undo(state, dispatch); break;
      case 'redo': redo(state, dispatch); break;
      case 'insertHTML':
        if (typeof value === 'string') this.insertHTML(value);
        break;
      case 'insertHTMLSanitized':
        if (typeof value === 'string') this.insertHTML(this.sanitizeHTML(value));
        break;
      case 'insertText':
        if (typeof value === 'string') this.insertText(value);
        break;
      case 'insertImage':
        if (typeof value === 'string') this.insertImage(value);
        break;
      default:
        break;
    }
  }

  private toggleList(listType: 'ordered_list' | 'bullet_list') {
    if (!this.view) return;
    const { state, dispatch } = this.view;
    const { schema } = this;
    const inList = isInList(state);
    if (inList) {
      liftListItem(schema.nodes.list_item)(state, dispatch);
    } else {
      wrapInList(schema.nodes[listType])(state, dispatch);
    }
  }

  insertHTML(html: string) {
    if (!this.view) return;
    const { state, dispatch } = this.view;
    const doc = this.parseHTML(html);
    const frag = doc.content;
    const tr = state.tr.replaceSelectionWith(frag.firstChild || schemaParagraph(this.schema), false).scrollIntoView();
    dispatch(tr);
  }

  insertText(text: string) {
    if (!this.view) return;
    const { state, dispatch } = this.view;
    dispatch(state.tr.insertText(text).scrollIntoView());
  }

  insertImage(src: string) {
    if (!this.view) return;
    const { state, dispatch } = this.view;
    const imgType = this.schema.nodes['image'];
    if (!imgType) return;
    const node = imgType.create({ src });
    dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
  }

  sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script,iframe,object,embed,style,link').forEach(el => el.remove());
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const el = node as HTMLElement;
      // remove inline event handlers
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      }
    }
    return div.innerHTML;
  }

  getSelection(): Selection | null {
    const sel = this.view ? this.view.state.selection : null;
    this.log('PM getSelection', sel ? { from: sel.from, to: sel.to, empty: sel.empty } : 'null');
    return sel;
  }

  restoreSelection(sel: Selection | null) {
    if (!this.view || !sel) return;
    const { state, dispatch } = this.view;
    const tr = state.tr.setSelection(sel).scrollIntoView();
    dispatch(tr);
    this.log('PM restoreSelection', { from: sel.from, to: sel.to, empty: sel.empty });
  }

  private log(...args: any[]) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug('[PMEngine]', ...args);
    }
  }
}

function schemaParagraph(schema: Schema) {
  return schema.nodes.paragraph.createAndFill()!;
}

function createSchema(): Schema {
  // Extend basic nodes with list nodes and alignment attr on block nodes
  const alignedBlock: NodeSpec = {
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p', getAttrs: node => ({ textAlign: (node as HTMLElement).style.textAlign || null }) }],
    toDOM: (node) => ['p', { style: node.attrs.textAlign ? `text-align:${node.attrs.textAlign}` : null }, 0],
    attrs: { textAlign: { default: null } },
  };

  const nodes = addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block');
  const headingSpec = nodes.get('heading') as NodeSpec | undefined;
  const headingParse = (headingSpec?.parseDOM as any[]) || [];
  const headingAttrs = { ...(headingSpec?.attrs || {}), textAlign: { default: null } } as any;
  const newHeading: NodeSpec = {
    ...(headingSpec as any),
    attrs: headingAttrs,
    parseDOM: headingParse.map((r: any) => ({
      ...r,
      getAttrs: (dom: any) => ({ ...(r.getAttrs ? r.getAttrs(dom) : {}), textAlign: (dom as HTMLElement).style?.textAlign || null }),
    })),
    toDOM: (node: any) => ['h' + node.attrs.level, { style: node.attrs.textAlign ? `text-align:${node.attrs.textAlign}` : null }, 0],
  };
  const nodesWithAlign = nodes.update('paragraph', alignedBlock).update('heading', newHeading);

  const underline: MarkSpec = {
    parseDOM: [
      { style: 'text-decoration', getAttrs: v => (String(v).includes('underline') ? {} : false) },
      { tag: 'u' },
    ],
    toDOM: () => ['span', { style: 'text-decoration: underline' }, 0],
  };
  const strike: MarkSpec = {
    parseDOM: [
      { style: 'text-decoration', getAttrs: v => (String(v).includes('line-through') ? {} : false) },
      { tag: 's' },
      { tag: 'strike' },
    ],
    toDOM: () => ['span', { style: 'text-decoration: line-through' }, 0],
  };
  const color: MarkSpec = {
    attrs: { color: {} },
    parseDOM: [
      { style: 'color', getAttrs: (value) => ({ color: String(value) }) },
      { tag: 'font[color]', getAttrs: (dom) => ({ color: (dom as HTMLElement).getAttribute('color') }) },
    ],
    toDOM: (mark) => ['span', { style: `color: ${mark.attrs.color}` }, 0],
  };
  const font: MarkSpec = {
    attrs: { family: {} },
    parseDOM: [
      { style: 'font-family', getAttrs: (value) => ({ family: String(value) }) },
      { tag: 'font[face]', getAttrs: (dom) => ({ family: (dom as HTMLElement).getAttribute('face') }) },
    ],
    toDOM: (mark) => ['span', { style: `font-family: ${mark.attrs.family}` }, 0],
  };
  const marks = basicSchema.spec.marks
    .addToEnd('underline', underline)
    .addToEnd('strike', strike)
    .addToEnd('color', color)
    .addToEnd('font', font);

  return new Schema({ nodes: nodesWithAlign, marks });
}

function isInList(state: EditorState): boolean {
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'bullet_list' || node.type.name === 'ordered_list') return true;
  }
  return false;
}

function markActive(state: EditorState, type: any) {
  const { from, $from, to, empty } = state.selection as any;
  if (empty) return !!type && !!(state.storedMarks || $from.marks()).find((m: any) => m.type === type);
  return state.doc.rangeHasMark(from, to, type);
}

function expandSelectionToWord(state: EditorState): TextSelection | null {
  const sel = state.selection as any;
  const $pos = sel.$from;
  const parent = $pos.parent;
  if (!parent.isTextblock) return null;
  const text = parent.textContent || '';
  let offset = $pos.parentOffset;
  let start = offset;
  let end = offset;
  const isWord = (ch: string) => /[\p{L}\p{N}_]/u.test(ch);
  while (start > 0 && isWord(text[start - 1])) start--;
  while (end < text.length && isWord(text[end])) end++;
  if (start === end) return null;
  const base = $pos.start();
  const from = base + start;
  const to = base + end;
  return TextSelection.create(state.doc, from, to);
}
