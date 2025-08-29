const { assert, equal } = require('./helpers/assert');

async function run() {
  const paste = await import('../dist/editor/paste.js');

  // Mock localStorage
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };

  // extractClipboardFragment with markers
  const htmlWithMarkers = 'before<!--StartFragment--><p><span style="color:#00f">X</span></p><!--EndFragment-->after';
  const extracted = paste.extractClipboardFragment(htmlWithMarkers);
  equal(extracted, '<p><span style="color:#00f">X</span></p>');

  // extractClipboardFragment without markers (falls back to body parse or raw)
  const raw = '<div><b>Hi</b></div>';
  const extracted2 = paste.extractClipboardFragment(raw);
  // In Node, DOMParser is not available, paste util will return raw
  equal(extracted2, raw);

  // load default prefs
  const prefs0 = paste.loadPastePrefs();
  equal(prefs0.mode, 'prompt');
  equal(prefs0.last, 'html');

  // save + load paste mode
  paste.savePasteMode('text');
  let prefs = paste.loadPastePrefs();
  equal(prefs.mode, 'text');
  paste.savePasteMode('html');
  prefs = paste.loadPastePrefs();
  equal(prefs.mode, 'html');

  // save + load last choice
  paste.saveLastPasteChoice('text');
  prefs = paste.loadPastePrefs();
  equal(prefs.last, 'text');
  paste.saveLastPasteChoice('html');
  prefs = paste.loadPastePrefs();
  equal(prefs.last, 'html');

  console.log('paste.test.js: OK');
}

run().catch((err) => { console.error(err); process.exit(1); });

