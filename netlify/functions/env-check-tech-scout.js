/**
 * env-check-tech-scout.js — TEMPORARY diagnostic. Confirms the three tech-scout
 * API keys are present in Netlify env AND valid, by making the cheapest possible
 * authenticated call to each provider (credits endpoints for MV/BounceBan = free;
 * a per_page:1 Apollo search = no enrichment credits spent). Never echoes any key
 * value — only presence booleans + HTTP status + an ok flag.
 *
 * Delete this file after verifying (it exposes nothing sensitive, but it's scratch).
 *   curl -s https://proposals.getshortcut.co/.netlify/functions/env-check-tech-scout
 */

const withTimeout = (ms) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) }; };

async function check(name, fn) {
  const to = withTimeout(8000);   // stay under Netlify's 10s sync-function limit
  try {
    const { status, ok, note } = await fn(to.signal);
    return { key: name, status, ok, note };
  } catch (e) {
    return { key: name, status: null, ok: false, note: `error: ${e.message}` };
  } finally { to.done(); }
}

export const handler = async () => {
  const APOLLO = (process.env.APOLLO_API_KEY || '').trim();
  const MV = (process.env.MILLIONVERIFIER_API_KEY || '').trim();
  const BB = (process.env.BOUNCEBAN_API_KEY || '').trim();

  const present = {
    APOLLO_API_KEY: !!APOLLO,
    MILLIONVERIFIER_API_KEY: !!MV,
    BOUNCEBAN_API_KEY: !!BB,
  };

  const results = [];

  results.push(await check('APOLLO_API_KEY', async (signal) => {
    if (!APOLLO) return { status: null, ok: false, note: 'MISSING from Netlify env' };
    const r = await fetch('https://api.apollo.io/api/v1/organizations/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO },
      body: JSON.stringify({ page: 1, per_page: 1 }), signal,
    });
    return { status: r.status, ok: r.status === 200, note: r.status === 200 ? 'auth ok' : `HTTP ${r.status} (401=bad key)` };
  }));

  results.push(await check('MILLIONVERIFIER_API_KEY', async (signal) => {
    if (!MV) return { status: null, ok: false, note: 'MISSING from Netlify env' };
    const r = await fetch(`https://api.millionverifier.com/api/v3/credits?api=${encodeURIComponent(MV)}`, { signal });
    const j = await r.json().catch(() => ({}));
    const credits = typeof j.credits === 'number' ? j.credits : (j.credits?.total ?? null);
    const ok = r.status === 200 && credits != null && !j.error;
    return { status: r.status, ok, note: ok ? `credits available: ${credits}` : `bad key or error (${j.error || 'no credits field'})` };
  }));

  results.push(await check('BOUNCEBAN_API_KEY', async (signal) => {
    if (!BB) return { status: null, ok: false, note: 'MISSING from Netlify env' };
    // Real verify endpoint (reserved domain resolves fast, ~1 credit). A 200 with a
    // result field = auth + key valid. (A bad key returns 401/403, not this.)
    const r = await fetch('https://api-waterfall.bounceban.com/v1/verify/single?email=verify-test@example.com', {
      method: 'GET', headers: { Authorization: BB, Accept: 'application/json' }, signal,
    });
    const j = await r.json().catch(() => ({}));
    const result = j.result ?? j.status ?? j.state ?? j.data?.result;
    const ok = r.status === 200 && result != null;
    return { status: r.status, ok, note: ok ? `auth ok (result: ${result})` : `HTTP ${r.status} (${j.message || j.error || 'no result field'})` };
  }));

  const allOk = results.every((x) => x.ok);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allOk, present, results }, null, 2),
  };
};
