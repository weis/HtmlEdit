function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function rtfToHtml(rtf: string): string {
  // Decode unicode escapes like \u8211?
  let txt = rtf.replace(/\\u(-?\d+)\?/g, (_, code) => {
    const n = parseInt(code, 10);
    try {
      return String.fromCodePoint(n < 0 ? n + 65536 : n);
    } catch {
      return '';
    }
  });
  // Replace paragraph markers with line breaks
  txt = txt.replace(/\\par[d]?/g, '\n');
  // Remove control words like \b, \i, etc.
  txt = txt.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
  // Remove hex encoded characters \'hh
  txt = txt.replace(/\\'[0-9a-fA-F]{2}/g, '');
  // Remove braces and backslashes
  txt = txt.replace(/[{}]/g, '').replace(/\\/g, '');
  // Normalize whitespace
  txt = txt.replace(/\r?\n\s*/g, '\n').trim();
  // Convert to simple HTML: split lines into paragraphs
  const lines = txt.split(/\n+/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '<p></p>';
  return lines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

export async function readRtfFileAsHtml(file: File): Promise<string> {
  const rtf = await file.text();
  return rtfToHtml(rtf);
}

