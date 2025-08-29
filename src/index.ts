console.log('Happy developing ✨')

import './components/rich-text-editor.js';

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
