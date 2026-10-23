#!/usr/bin/env node
/**
 * Issue, list and revoke the personal API keys a teammate's AI uses to
 * create proposals, landing pages, sponsor pages and QR signs as them.
 * See docs/AI_INTEGRATION.md for what the key unlocks and how to connect it.
 *
 * USAGE
 *   node scripts/api-keys.mjs issue <email> "<label>"   e.g. issue marc@getshortcut.co "Marc, Claude desktop"
 *   node scripts/api-keys.mjs list
 *   node scripts/api-keys.mjs revoke <key prefix or id>
 *
 * The key is printed ONCE, at issue. Only its SHA-256 is stored, so a lost
 * key is revoked and a new one issued. Issuing by hand is the staff check:
 * email signup is open, so a signed-in account proves nothing on its own.
 *
 * Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, from the
 * environment, .env.local or .env, and the staff_api_keys migration
 * (supabase/migrations/20261023000000_create_staff_api_keys.sql).
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { newApiKey } from '../netlify/functions/lib/staff-auth.js';

function env() {
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env;
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
  throw new Error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in the environment, .env.local or .env');
}

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env();
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function allUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function issue(email, label) {
  if (!email || !label) fail('Usage: node scripts/api-keys.mjs issue <email> "<label>"');
  const wanted = email.trim().toLowerCase();
  if (!wanted.endsWith('@getshortcut.co')) fail(`${email} is not a getshortcut.co address. Keys are for the team only.`);
  const user = (await allUsers()).find((u) => (u.email || '').toLowerCase() === wanted);
  if (!user) fail(`No account for ${email}. They need to sign in to proposals.getshortcut.co once first.`);

  const { key, hash, prefix } = newApiKey();
  const { error } = await supabase
    .from('staff_api_keys')
    .insert({ user_id: user.id, label: label.trim(), key_prefix: prefix, key_hash: hash });
  if (error) fail(`Could not save the key: ${error.message}`);

  console.log(`\nKey for ${user.email} (${label.trim()}). Shown once, so send it to them now:\n`);
  console.log(`  ${key}\n`);
  console.log('Setup steps: docs/AI_INTEGRATION.md');
}

async function list() {
  const { data, error } = await supabase
    .from('staff_api_keys')
    .select('id, user_id, label, key_prefix, created_at, last_used_at, revoked_at')
    .order('created_at', { ascending: false });
  if (error) fail(`Could not list keys: ${error.message}`);
  if (!data.length) return console.log('No keys yet.');
  const emails = new Map((await allUsers()).map((u) => [u.id, u.email]));
  const day = (t) => (t ? t.slice(0, 10) : 'never');
  for (const k of data) {
    const state = k.revoked_at ? `REVOKED ${day(k.revoked_at)}` : `last used ${day(k.last_used_at)}`;
    console.log(`${k.key_prefix}…  ${emails.get(k.user_id) || k.user_id}  "${k.label}"  issued ${day(k.created_at)}  ${state}  (${k.id})`);
  }
}

async function revoke(ref) {
  if (!ref) fail('Usage: node scripts/api-keys.mjs revoke <key prefix or id>');
  const column = /^[0-9a-f-]{36}$/i.test(ref) ? 'id' : 'key_prefix';
  const value = ref.replace(/…$/, '');
  const { data, error } = await supabase
    .from('staff_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq(column, value)
    .is('revoked_at', null)
    .select('key_prefix, label');
  if (error) fail(`Could not revoke: ${error.message}`);
  if (!data.length) fail(`No active key matches ${ref}.`);
  for (const k of data) console.log(`Revoked ${k.key_prefix}… "${k.label}"`);
}

const [command, ...args] = process.argv.slice(2);
if (command === 'issue') await issue(args[0], args.slice(1).join(' '));
else if (command === 'list') await list();
else if (command === 'revoke') await revoke(args[0]);
else fail('Usage: node scripts/api-keys.mjs issue <email> "<label>" | list | revoke <key prefix or id>');
