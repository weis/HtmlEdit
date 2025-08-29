export type PasteMode = 'prompt' | 'html' | 'text';

export function extractClipboardFragment(html: string): string {
  const startMarker = '<!--StartFragment-->';
  const endMarker = '<!--EndFragment-->';
  const si = html.indexOf(startMarker);
  const ei = html.indexOf(endMarker);
  if (si !== -1 && ei !== -1 && ei > si) {
    return html.substring(si + startMarker.length, ei);
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    if (doc && doc.body) return doc.body.innerHTML || '';
  } catch {}
  return html;
}

const MODE_KEY = 'demoRtePasteMode';
const LAST_KEY = 'demoRteLastPasteChoice';

export function loadPastePrefs(): { mode: PasteMode; last: 'html' | 'text' } {
  let mode: PasteMode = 'prompt';
  let last: 'html' | 'text' = 'html';
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === 'prompt' || m === 'html' || m === 'text') mode = m;
    const l = localStorage.getItem(LAST_KEY);
    if (l === 'html' || l === 'text') last = l;
  } catch {}
  return { mode, last };
}

export function savePasteMode(mode: PasteMode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
}

export function saveLastPasteChoice(choice: 'html' | 'text') {
  try { localStorage.setItem(LAST_KEY, choice); } catch {}
}

