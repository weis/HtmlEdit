console.log('Happy developing ✨')

import './components/rich-text-editor.ts';

const mount = document.getElementById('app') || document.body;

const editor = document.createElement('demo-rich-text-editor');
editor.setAttribute('placeholder', 'Write something awesome…');
editor.addEventListener('change', (e: Event) => {
  const detail = (e as CustomEvent).detail as { html?: string };
  console.log('Editor changed, HTML:', detail?.html);
});

const heading = document.createElement('h3');
heading.textContent = 'Demo: Rich Text Editor';

mount.appendChild(heading);
mount.appendChild(editor);

// Optional initial content
(editor as any).value = `<p>Hello <strong>world</strong>! ✨</p>`;

// Expose for DevTools debugging
(window as any).editor = editor;

// URL flag to enable debug features (HUD, verbose logs)
const __rteDebug = (() => {
  try {
    const qs = new URLSearchParams(window.location.search);
    return qs.has('rteDebug') || qs.get('debug') === '1' || qs.get('debug') === 'true';
  } catch { return false; }
})();

if (__rteDebug) {
  // Turn on component debug logs
  (editor as any).debug = true;

  // Dev HUD: live event counters for quick validation
  (function setupHud() {
    const hud = document.createElement('div');
    hud.style.position = 'fixed';
    hud.style.top = '10px';
    hud.style.right = '10px';
    hud.style.zIndex = '9999';
  hud.style.background = '#111827';
  hud.style.color = '#F9FAFB';
  hud.style.border = '1px solid #374151';
  hud.style.borderRadius = '8px';
  hud.style.padding = '8px 10px';
  hud.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  hud.style.fontSize = '12px';
  hud.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';

  const counts = { input: 0, change: 0, selection: 0 };
  let lastLen = 0;
  const label = document.createElement('div');
  const reset = document.createElement('button');
  reset.textContent = 'Reset';
  reset.style.marginTop = '6px';
  reset.style.fontSize = '11px';
  reset.style.padding = '2px 6px';
  reset.style.borderRadius = '4px';
  reset.style.border = '1px solid #4B5563';
  reset.style.background = '#1F2937';
  reset.style.color = '#E5E7EB';
  reset.addEventListener('click', () => { counts.input = counts.change = counts.selection = 0; update(); });

  function update() {
    label.innerHTML = `
      <strong>Events</strong><br/>
      input: ${counts.input}<br/>
      change: ${counts.change}<br/>
      selection-change: ${counts.selection}<br/>
      HTML length: ${lastLen}
    `;
  }

  editor.addEventListener('input', (e: Event) => {
    counts.input++;
    const detail = (e as CustomEvent).detail as { html?: string };
    lastLen = (detail?.html || '').length;
    update();
  });
  editor.addEventListener('change', (e: Event) => {
    counts.change++;
    const detail = (e as CustomEvent).detail as { html?: string };
    lastLen = (detail?.html || '').length;
    update();
  });
  editor.addEventListener('selection-change', () => { counts.selection++; update(); });

  update();
  hud.appendChild(label);
  hud.appendChild(reset);
  document.body.appendChild(hud);
  (window as any).__rteHud = { counts, reset: () => { counts.input = counts.change = counts.selection = 0; update(); } };
  })();
}
