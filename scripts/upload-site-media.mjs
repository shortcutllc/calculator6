#!/usr/bin/env node
/**
 * Upload a static media file (video, large image) to the public `site-media`
 * Supabase bucket and print the CDN URL to reference from a component.
 *
 * WHY THIS EXISTS
 * Video files must not live in git. On 2026-03-26 a 25MB batch of mp4s was
 * committed, the push failed, and every later git operation touching those
 * blobs hung. `.gitignore` alone does not solve it here, because Netlify
 * builds from the repo: a gitignored file is simply absent from the build.
 * So the file goes to Supabase storage (already paid for, CDN backed) and the
 * component references the returned URL.
 *
 * USAGE
 *   node scripts/upload-site-media.mjs <local-file> [remote/path.mp4]
 *
 * e.g.
 *   node scripts/upload-site-media.mjs public/yw3/tradestation-sizzle.mp4 yw3/tradestation-sizzle.mp4
 *
 * Re-running with the same remote path overwrites in place, so the URL in the
 * component keeps working when a video is re-cut.
 */
import fs from 'node:fs';
import path from 'node:path';

const BUCKET = 'site-media';

const TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function env() {
  // Prefer the worktree's own .env.local, fall back to the repo .env.
  for (const f of ['.env.local', '.env']) {
    if (!fs.existsSync(f)) continue;
    const vars = Object.fromEntries(
      fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    );
    if (vars.VITE_SUPABASE_URL && vars.SUPABASE_SERVICE_ROLE_KEY) return vars;
  }
  throw new Error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in .env.local or .env');
}

const [localPath, remoteArg] = process.argv.slice(2);
if (!localPath) {
  console.error('usage: node scripts/upload-site-media.mjs <local-file> [remote/path]');
  process.exit(1);
}
if (!fs.existsSync(localPath)) {
  console.error(`no such file: ${localPath}`);
  process.exit(1);
}

const ext = path.extname(localPath).toLowerCase();
const contentType = TYPES[ext];
if (!contentType) {
  console.error(`unsupported type ${ext}. Allowed: ${Object.keys(TYPES).join(', ')}`);
  process.exit(1);
}

const remote = (remoteArg || path.basename(localPath)).replace(/^\/+/, '');
const { VITE_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = env();
const body = fs.readFileSync(localPath);

const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${remote}`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': contentType,
    // Overwrite rather than 409 on re-upload, so re-cuts keep the same URL.
    'x-upsert': 'true',
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
  body,
});

if (!res.ok) {
  console.error(`upload failed ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const publicUrl = `${URL}/storage/v1/object/public/${BUCKET}/${remote}`;
console.log(`uploaded ${(body.length / 1024 / 1024).toFixed(2)}MB → ${BUCKET}/${remote}`);
console.log(publicUrl);
