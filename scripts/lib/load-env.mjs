/**
 * load-env.mjs — populate process.env from the two .env files these scripts need,
 * so they run from a plain shell with no `set -a && . ...` dance.
 *
 * Smartlead's key lives in the openclaw workspace; Supabase's lives in the repo.
 * Anything already exported in the real environment wins, so this never overrides
 * a value the caller set deliberately.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const FILES = [
  path.join(process.env.HOME, '.openclaw/workspace/.env'), // SMARTLEAD_API_KEY
  path.join(REPO, '.env'),                                  // VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  path.join(REPO, '.env.local'),
];

function parse(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function loadEnv() {
  const loaded = [];
  for (const f of FILES) {
    if (!fs.existsSync(f)) continue;
    const vars = parse(fs.readFileSync(f, 'utf8'));
    let n = 0;
    for (const [k, v] of Object.entries(vars)) {
      if (process.env[k] === undefined) { process.env[k] = v; n++; }
    }
    if (n) loaded.push(`${path.basename(path.dirname(f))}/${path.basename(f)}`);
  }
  return loaded;
}

/** Fail loudly and usefully rather than deep inside an API call. */
export function requireEnv(...keys) {
  loadEnv();
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `missing ${missing.join(', ')}.\n` +
      `  Looked in: ${FILES.join('\n             ')}`
    );
  }
}
