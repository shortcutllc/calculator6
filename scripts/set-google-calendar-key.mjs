#!/usr/bin/env node
/**
 * Give the proposals site a key for the calendar service account, for sponsor
 * page call booking (netlify/functions/lib/gcal.js).
 *
 *   node scripts/set-google-calendar-key.mjs            create a new key with gcloud
 *   node scripts/set-google-calendar-key.mjs key.json   use a key file you have
 *
 * 1. Creates a JSON key for site-call-booking@shortcut-seo-tools-2026 with
 *    gcloud (signed in as a project owner), into a private temp folder.
 * 2. Packs it to `rsa-pq.<key id>.<p>.<q>`, about 400 characters. The full
 *    file is 2.3KB, and in Lambda compatibility mode AWS caps all of a
 *    function's env vars at 4KB together (see gcal.js).
 * 3. Checks the packed key with Google: a token for every host in
 *    lib/call-hours.js CALL_HOSTS and a free/busy read of their next day.
 *    Read only: nothing is written to any calendar.
 * 4. Sets GOOGLE_CALENDAR_SA_KEY on the proposals site (secret, Functions
 *    scope, production + deploy-preview + branch-deploy) through the Netlify
 *    CLI. Functions only see it after the next deploy.
 * 5. Deletes the temp file, whatever happened. A key this script created
 *    is also deleted from Google if anything before step 4 finished fails.
 *
 * Nothing secret is printed: the key id, the packed length and the checks.
 * Stops before step 4 if Google refuses the key for any host.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE_ID = '4e5328e9-618a-4e5c-9cd9-c74e6fa1988d'; // resplendent-narwhal-3de33b, proposals.getshortcut.co
const PROJECT = 'shortcut-seo-tools-2026';
const ENV_KEY = 'GOOGLE_CALENDAR_SA_KEY';

const { packKey, freeBusy, SERVICE_ACCOUNT } = await import('../netlify/functions/lib/gcal.js');
const { CALL_HOSTS } = await import('../netlify/functions/lib/call-hours.js');

const given = process.argv[2];
const dir = given ? null : mkdtempSync(join(tmpdir(), 'gcal-key-'));
const file = given || join(dir, 'key.json');
let createdId = '';
let done = false;

try {
  if (!given) {
    execFileSync('gcloud', ['iam', 'service-accounts', 'keys', 'create', file, `--iam-account=${SERVICE_ACCOUNT}`, `--project=${PROJECT}`], { stdio: ['ignore', 'ignore', 'pipe'] });
  }
  const key = JSON.parse(readFileSync(file, 'utf8'));
  if (!given) createdId = key.private_key_id;
  if (key.client_email !== SERVICE_ACCOUNT) throw new Error(`that key is for ${key.client_email}, not ${SERVICE_ACCOUNT}`);
  const packed = packKey(key.private_key, key.private_key_id);
  console.log(`key ${key.private_key_id}, packed to ${packed.length} characters`);

  process.env[ENV_KEY] = packed;
  const from = Date.now() + 24 * 3600_000;
  let bad = 0;
  for (const h of CALL_HOSTS) {
    try {
      const busy = await freeBusy(h.email, from, from + 8 * 3600_000);
      console.log(`  ${h.email}: readable (${busy.length} busy blocks tomorrow)`);
    } catch (err) {
      bad++;
      console.log(`  ${h.email}: REFUSED ${String(err?.message || err).replaceAll(packed, '[key]')}`);
    }
  }
  if (bad) throw new Error(`${bad} calendar(s) refused; ${ENV_KEY} was NOT set`);

  try {
    execFileSync('netlify', ['env:set', ENV_KEY, packed, '--secret', '--force', '--scope', 'functions', '--context', 'production', 'deploy-preview', 'branch-deploy'], {
      env: { ...process.env, NETLIFY_SITE_ID: SITE_ID },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (err) {
    throw new Error(`netlify env:set failed: ${String(err?.stderr || err?.message || err).replaceAll(packed, '[key]')}`);
  }
  done = true;
  console.log(`${ENV_KEY} set on the proposals site. Deploy for the functions to see it.`);
} catch (err) {
  console.error(String(err?.message || err));
  process.exitCode = 1;
} finally {
  if (dir) rmSync(dir, { recursive: true, force: true });
  if (createdId && !done) {
    try {
      execFileSync('gcloud', ['iam', 'service-accounts', 'keys', 'delete', createdId, `--iam-account=${SERVICE_ACCOUNT}`, `--project=${PROJECT}`, '--quiet'], { stdio: ['ignore', 'ignore', 'pipe'] });
      console.error(`deleted the unused key ${createdId} from Google`);
    } catch {
      console.error(`could not delete the unused key ${createdId}: remove it in Google Cloud → IAM → Service accounts → site-call-booking → Keys`);
    }
  }
}
