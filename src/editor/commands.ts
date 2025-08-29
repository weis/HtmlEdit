import { closestBlock } from './selection.js';

export type Align = 'left' | 'center' | 'right' | 'justify';

export function execCommand(command: string, value?: string) {
  try {
    if (value !== undefined) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
  } catch {
    // ignore for demo
  }
}

export function setAlignment(align: Align) {
  const map: Record<Align, string> = {
    left: 'justifyLeft',
    center: 'justifyCenter',
    right: 'justifyRight',
    justify: 'justifyFull',
  };
  execCommand(map[align]);
}

export function handleShortcut(
  e: KeyboardEvent,
  actions: { bold: () => void; italic: () => void; underline: () => void; link: () => void }
): boolean {
  const meta = e.metaKey || e.ctrlKey;
  if (!meta) return false;
  switch (e.key.toLowerCase()) {
    case 'b':
      e.preventDefault();
      actions.bold();
      return true;
    case 'i':
      e.preventDefault();
      actions.italic();
      return true;
    case 'u':
      e.preventDefault();
      actions.underline();
      return true;
    case 'k':
      e.preventDefault();
      actions.link();
      return true;
    default:
      return false;
  }
}

export function toggleCodeBlock(editable: HTMLElement | null) {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const el = closestBlock(editable, range.startContainer);
  if (el?.nodeName === 'PRE') {
    const pre = el as HTMLPreElement;
    const code = pre.textContent ?? '';
    const p = document.createElement('p');
    p.textContent = code;
    pre.replaceWith(p);
  } else {
    execCommand('formatBlock', 'PRE');
  }
}

