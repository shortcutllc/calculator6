/**
 * check-functions-v2 — guard against a Netlify function going back to the
 * Lambda style.
 *
 * Every function in netlify/functions uses the modern Functions API
 * (`export default async (req, context) => new Response(...)`), migrated in
 * October 2026. Netlify stops accepting deploys that contain a Lambda
 * compatibility mode function (`export const handler` / `exports.handler`)
 * on July 1, 2027, and one such function also brings back AWS's 4KB cap on
 * the env vars of every function. This fails if any function:
 *   - still exports `handler`, or has no default export;
 *   - sets `config.path`, which takes it off /.netlify/functions/<name> and so
 *     breaks every caller and every webhook registered with an outside service.
 *
 * Run before deploy:  node scripts/check-functions-v2.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const FN_DIR = path.join(process.cwd(), 'netlify', 'functions');

const problems = [];
const files = fs.readdirSync(FN_DIR).filter((f) => /\.(m?js|m?ts)$/.test(f));
for (const file of files) {
  const src = fs.readFileSync(path.join(FN_DIR, file), 'utf8');
  if (/^\s*export\s+(const|let|async\s+function|function)\s+handler\b/m.test(src) || /^\s*exports\.handler\s*=/m.test(src)) {
    problems.push(`${file}: exports a Lambda-style handler; use export default async (req, context) => Response`);
  }
  if (!/^\s*export\s+default\b/m.test(src)) {
    problems.push(`${file}: no default export`);
  }
  const cfg = src.match(/export\s+const\s+config\s*=\s*\{[\s\S]*?\};/);
  if (cfg && /\bpath\s*:/.test(cfg[0])) {
    problems.push(`${file}: config.path moves it off /.netlify/functions/${file.replace(/\.[^.]+$/, '')}`);
  }
}

if (problems.length) {
  console.error('✗ Netlify functions not on the modern API:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(`✓ ${files.length} function(s) use the modern Netlify Functions API at their /.netlify/functions/<name> URLs`);
