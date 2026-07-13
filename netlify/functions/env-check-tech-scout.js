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
  const to = withTimeout(12000);
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
    const r = await fetch('https://api-waterfall.bounceban.com/v1/credits', { headers: { Authorization: BB }, signal });
    const j = await r.json().catch(() => ({}));
    const ok = r.status === 200 && !j.error;
    return { status: r.status, ok, note: ok ? `credits ok: ${JSON.stringify(j).slice(0, 120)}` : `bad key or error (${j.error || 'HTTP ' + r.status})` };
  }));

  const allOk = results.every((x) => x.ok);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allOk, present, results }, null, 2),
  };
};
