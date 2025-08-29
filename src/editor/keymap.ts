export function handleShortcut(
  e: KeyboardEvent,
  actions: {
    bold: () => void;
    italic: () => void;
    underline: () => void;
    link: () => void;
    orderedList?: () => void;
    unorderedList?: () => void;
    quote?: () => void;
    heading1?: () => void;
    heading2?: () => void;
    paragraph?: () => void;
  }
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
    case '9': // Shift+Ctrl+9 Quote
      if (e.shiftKey) { e.preventDefault(); actions.quote?.(); return true; }
      return false;
    case '7': // Shift+Ctrl+7 Ordered list
      if (e.shiftKey) { e.preventDefault(); actions.orderedList?.(); return true; }
      return false;
    case '8': // Shift+Ctrl+8 Unordered list
      if (e.shiftKey) { e.preventDefault(); actions.unorderedList?.(); return true; }
      return false;
    case '1': // Mod+Alt+1 Heading 1
      if (e.altKey) { e.preventDefault(); actions.heading1?.(); return true; }
      return false;
    case '2': // Mod+Alt+2 Heading 2
      if (e.altKey) { e.preventDefault(); actions.heading2?.(); return true; }
      return false;
    case '0': // Mod+Alt+0 Paragraph
      if (e.altKey) { e.preventDefault(); actions.paragraph?.(); return true; }
      return false;
    default:
      return false;
  }
}

