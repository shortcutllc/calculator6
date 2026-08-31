/**
 * Dave's Slack text formatter — ONE implementation, shared by every outbound path.
 *
 * Slack renders *mrkdwn*, not GitHub markdown. Dave writes GitHub markdown because that is
 * what an LLM writes by default, so every surface that posts his words has to translate.
 * `tools/slack-dm.mjs` had a partial converter and the gateway had NONE, so chat replies
 * arrived with literal `##` headings and `**bold**` asterisks (Will, 2026-08-31).
 * Formatting is an auto-fix in code, never a prompt hope — and it lives here so the two
 * surfaces cannot drift apart again.
 *
 *   toSlackMrkdwn(text) -> mrkdwn string
 *   chunkForSlack(text, limit) -> string[]  (splits on line boundaries, fence-safe)
 *
 * Parked spans are delimited with an explicit \u0000, never a literal space. An earlier
 * version used spaces, a stray NUL crept into one token, and headings silently stopped
 * restoring — the delimiter is now spelled out in an escape so it cannot happen again.
 */

const NUL = '\u0000';
const tok = (kind, i) => `${NUL}${kind}${i}${NUL}`;
const tokRe = (kind) => new RegExp(`${NUL}${kind}(\\d+)${NUL}`, 'g');

/** Render a markdown table as an aligned code block; Slack has no table support and a raw
 *  pipe table is unreadable, especially on a phone. */
function renderTable(lines) {
  const rows = lines.map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const body = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c) || c === ''));
  if (!body.length) return lines.join('\n');
  const widths = [];
  body.forEach((r) => r.forEach((c, i) => { widths[i] = Math.max(widths[i] || 0, c.length); }));
  const out = body.map((r) => r.map((c, i) => c.padEnd(widths[i] || 0)).join('  ').trimEnd());
  if (out.length > 1) out.splice(1, 0, widths.map((w) => '-'.repeat(w)).join('  '));
  return '```\n' + out.join('\n') + '\n```';
}

export function toSlackMrkdwn(input) {
  if (!input) return '';
  // Strip any pre-existing NUL so Dave's own text can never impersonate a token.
  let s = String(input).replace(/\r\n/g, '\n').split(NUL).join('');

  // ---- 1. Park code so nothing below can corrupt it ----------------------
  const fences = [];
  const parkFences = (str) => str.replace(/```[\s\S]*?```/g, (m) => {
    fences.push(m); return tok('F', fences.length - 1);
  });
  s = parkFences(s);
  const codes = [];
  s = s.replace(/`[^`\n]+`/g, (m) => { codes.push(m); return tok('C', codes.length - 1); });

  // ---- 2. Tables -> aligned code block -----------------------------------
  {
    const lines = s.split('\n');
    const out = [];
    let buf = [];
    const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
    const flushBuf = () => {
      if (buf.length) out.push(buf.length >= 2 ? renderTable(buf) : buf.join('\n'));
      buf = [];
    };
    for (const l of lines) {
      if (isRow(l)) { buf.push(l); continue; }
      flushBuf();
      out.push(l);
    }
    flushBuf();
    // Park the fences this step just created: their alignment dashes look exactly like a
    // markdown horizontal rule, and step 6 would otherwise delete them.
    s = parkFences(out.join('\n'));
  }

  // ---- 3. Links: [text](url) -> <url|text> -------------------------------
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<$2|$1>');

  // ---- 4. Headings -> parked, restored as bold at the end ----------------
  // `[ \t]` not `\s`: \s matches newlines, so the blank line ABOVE a heading was being
  // swallowed into the match and consecutive sections ran together.
  const heads = [];
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]+(.+?)[ \t]*#*$/gm, (_m, t) => {
    heads.push(t.trim()); return tok('H', heads.length - 1);
  });

  // ---- 5. Emphasis --------------------------------------------------------
  // Park **bold** first so the single-asterisk italic rule cannot eat its markers.
  const bolds = [];
  s = s.replace(/\*\*([^\n]+?)\*\*/g, (_m, t) => { bolds.push(t); return tok('B', bolds.length - 1); });
  s = s.replace(/__([^\n]+?)__/g, (_m, t) => { bolds.push(t); return tok('B', bolds.length - 1); });
  s = s.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,;:!?]|$)/g, '$1_$2_');  // *italic* -> _italic_
  s = s.replace(/~~([^\n]+?)~~/g, '~$1~');                                // ~~strike~~ -> ~strike~

  // ---- 6. Lists, rules, trailing whitespace ------------------------------
  s = s.replace(/^([ \t]*)[-*+][ \t]+\[( |x|X)\][ \t]+/gm, (_m, ind, x) => `${ind}${x === ' ' ? '☐' : '☑'} `);
  s = s.replace(/^([ \t]*)[-*+][ \t]+/gm, (_m, ind) => {
    const depth = Math.floor(ind.replace(/\t/g, '  ').length / 2);
    return `${'    '.repeat(depth)}${depth > 0 ? '◦' : '•'} `;
  });
  s = s.replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '');  // --- / *** / ___ -> gone
  s = s.replace(/[ \t]+$/gm, '');

  // ---- 7. Restore ---------------------------------------------------------
  s = s.replace(tokRe('B'), (_m, i) => `*${bolds[Number(i)]}*`);
  s = s.replace(tokRe('H'), (_m, i) => `*${heads[Number(i)]}*`);
  // Give every heading air beneath it. Scoped to a line that is ENTIRELY bold, which is
  // exactly what a converted heading looks like.
  s = s.replace(/^(\*[^*\n]+\*)\n(?!\n)/gm, '$1\n\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(tokRe('C'), (_m, i) => codes[Number(i)]);
  s = s.replace(tokRe('F'), (_m, i) => fences[Number(i)]);
  return s.trim();
}

/**
 * Split for Slack's per-message limit WITHOUT cutting mid-line or mid-code-block.
 * A fence left open at a chunk boundary is closed and reopened in the next chunk.
 */
export function chunkForSlack(text, limit = 3800) {
  const src = String(text || '');
  if (src.length <= limit) return src.trim() ? [src] : [];
  const chunks = [];
  let cur = '';
  let inFence = false;

  const flush = () => {
    if (!cur.trim()) { cur = ''; return; }
    chunks.push(inFence ? `${cur.replace(/\n+$/, '')}\n\`\`\`` : cur.replace(/\n+$/, ''));
    cur = inFence ? '```\n' : '';
  };

  for (const rawLine of src.split('\n')) {
    // A single line longer than the whole limit still has to be hard-split.
    const pieces = rawLine.length > limit
      ? rawLine.match(new RegExp(`.{1,${limit - 10}}`, 'g')) || [rawLine]
      : [rawLine];
    for (const line of pieces) {
      // Inside a fence, leave room for the "\n```" that flush() appends to close it,
      // otherwise the closing marker pushes the chunk past Slack's limit.
      const room = inFence ? limit - 4 : limit;
      if (cur.length + line.length + 1 > room) flush();
      cur += (cur ? '\n' : '') + line;
      if (/^\s*```/.test(line)) inFence = !inFence;
    }
  }
  if (cur.trim()) chunks.push(cur.replace(/\n+$/, ''));
  return chunks;
}
