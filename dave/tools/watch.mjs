#!/usr/bin/env node
/**
 * watch-dave — live view of Dave's thinking and working.
 * Follows the newest session transcript (both Slack chats and scheduled jobs land in
 * ~/.claude/projects/<dave-project>/*.jsonl) and pretty-prints it as it grows:
 * Dave's prose, his tool calls (what he's querying/reading/running), and results.
 *
 * Usage:  node dave/tools/watch.mjs           follow live (switches to newer sessions)
 *         node dave/tools/watch.mjs --replay  print the newest session from the top, then follow
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const DIR = path.join(os.homedir(), '.claude', 'projects', '-Users-willnewton-Documents-GitHub-calculator6-dave');
const REPLAY = process.argv.includes('--replay');
const c = { dim: (s) => `\x1b[90m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m`, cyan: (s) => `\x1b[36m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, mag: (s) => `\x1b[35m${s}\x1b[0m` };
const clip = (s, n = 160) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

function newest() {
  try {
    return fs.readdirSync(DIR).filter((f) => f.endsWith('.jsonl'))
      .map((f) => ({ f: path.join(DIR, f), m: fs.statSync(path.join(DIR, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0]?.f || null;
  } catch { return null; }
}

function toolLine(b) {
  const i = b.input || {};
  const hint = i.description || i.command || i.file_path || i.query || i.url || i.pattern || i.prompt || '';
  return `${c.yellow('⚙ ' + b.name)} ${c.dim(clip(hint, 120))}`;
}

function render(line) {
  let j; try { j = JSON.parse(line); } catch { return; }
  const content = j.message?.content;
  if (j.type === 'assistant' && Array.isArray(content)) {
    for (const b of content) {
      if (b.type === 'thinking' && b.thinking) console.log(`${c.mag('… thinking')} ${c.dim(clip(b.thinking, 240))}`);
      if (b.type === 'text' && b.text?.trim()) console.log(`${c.bold(c.green('DAVE'))}  ${b.text.trim()}\n`);
      if (b.type === 'tool_use') console.log(toolLine(b));
    }
  } else if (j.type === 'user') {
    if (typeof content === 'string' && content.trim()) console.log(`\n${c.bold(c.cyan('WILL/JOB'))}  ${clip(content, 300)}\n`);
    else if (Array.isArray(content)) {
      for (const b of content) {
        if (b.type === 'tool_result') {
          const txt = Array.isArray(b.content) ? b.content.filter((x) => x.type === 'text').map((x) => x.text).join(' ') : String(b.content ?? '');
          if (txt.trim()) console.log(c.dim(`   ↳ ${clip(txt, 140)}`));
        }
        if (b.type === 'text' && b.text?.trim()) console.log(`\n${c.bold(c.cyan('WILL/JOB'))}  ${clip(b.text, 300)}\n`);
      }
    }
  }
}

let file = newest();
if (!file) { console.error('No Dave sessions found yet.'); process.exit(1); }
let pos = REPLAY ? 0 : fs.statSync(file).size;
console.log(c.dim(`watching ${path.basename(file)} — Ctrl+C to stop\n`));
if (REPLAY) { for (const l of fs.readFileSync(file, 'utf8').split('\n')) render(l); pos = fs.statSync(file).size; }

let buf = '';
setInterval(() => {
  const latest = newest();
  if (latest !== file) { file = latest; pos = 0; buf = ''; console.log(c.dim(`\n— new session: ${path.basename(file)} —\n`)); }
  let size; try { size = fs.statSync(file).size; } catch { return; }
  if (size <= pos) return;
  const fd = fs.openSync(file, 'r');
  const chunk = Buffer.alloc(size - pos);
  fs.readSync(fd, chunk, 0, chunk.length, pos);
  fs.closeSync(fd);
  pos = size;
  buf += chunk.toString('utf8');
  const lines = buf.split('\n');
  buf = lines.pop() || '';
  lines.forEach(render);
}, 500);
