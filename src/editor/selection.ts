export function saveSelection(): Range | null {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) return sel.getRangeAt(0);
  return null;
}

export function restoreSelection(range: Range | null): boolean {
  if (!range) return false;
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  return true;
}

export function containsNode(root: Node, node: Node): boolean {
  let n: Node | null = node;
  while (n) {
    if (n === root) return true;
    n = n.parentNode;
  }
  return false;
}

export function closestBlock(editable: HTMLElement | null, node: Node | null): HTMLElement | null {
  if (!editable) return null;
  let n: Node | null = node;
  while (n && n !== editable) {
    if (n instanceof HTMLElement) {
      const display = window.getComputedStyle(n).display;
      if (display === 'block' || ['P', 'H1', 'H2', 'BLOCKQUOTE', 'PRE', 'LI', 'DIV'].includes(n.tagName)) {
        return n;
      }
    }
    n = n.parentNode;
  }
  return null;
}

