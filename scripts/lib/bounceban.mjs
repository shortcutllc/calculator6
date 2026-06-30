/**
 * bounceban.mjs — BounceBan second-pass catch-all verifier.
 *
 * Position in the pipeline: MillionVerifier runs first (fast, cheap, classifies
 * ok / catch_all / invalid / unknown). BounceBan is the SECOND pass for the
 * catch_all + unknown leads MV can't resolve — it probes true deliverability
 * (97%+ accuracy, no email sent) and turns a catch-all into deliverable /
 * undeliverable / risky. A 'deliverable' result promotes a parked catch-all into
 * the sendable pool; 'undeliverable' is suppressed; 'risky'/'unknown' stays parked.
 *
 * API (https://bounceban.com/public/doc/api.html): GET /v1/verify/single?email=
 * with the API key in the Authorization header. Quasi-synchronous: waits up to
 * ~80s for a result, 408 on timeout (we retry once). 1 credit per RESOLVED
 * verification (risky/unknown are not charged); credits roll over.
 *
 * Pure-ish + DI (apiKey + fetch injected) so it unit-tests with a mock.
 */

const BASE = 'https://api-waterfall.bounceban.com/v1';

// Normalize BounceBan's raw result string to our four buckets. (Exact raw values
// confirmed on first live call; this maps the documented + common variants.)
export function normalizeResult(raw) {
  const r = String(raw || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (/(^|_)(deliverable|valid|ok|safe)($|_)/.test(r)) return 'deliverable';
  if (/(undeliverable|invalid|bounce|bad|reject)/.test(r)) return 'undeliverable';
  if (/(risky|accept_all|catch_all|greylist|unverifiable)/.test(r)) return 'risky';
  return 'unknown';
}

/**
 * Verify one email. Returns { ok, result, score, http, raw }.
 *   result ∈ deliverable | undeliverable | risky | unknown
 *   ok=false means the call failed (network / auth / timeout) — caller decides.
 */
export async function verifyEmail(email, { apiKey, timeoutMs = 85000, fetchImpl = fetch, retries = 1 } = {}) {
  if (!apiKey) throw new Error('bounceban.verifyEmail: apiKey required');
  if (!email) return { ok: false, result: 'unknown', error: 'no_email' };
  const url = `${BASE}/verify/single?email=${encodeURIComponent(email)}`;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { method: 'GET', headers: { Authorization: apiKey, Accept: 'application/json' }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 408) { if (attempt < retries) continue; return { ok: false, result: 'unknown', http: 408, error: 'timeout' }; }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, result: 'unknown', http: res.status, error: body?.message || `http_${res.status}`, raw: body };
      const rawResult = body.result ?? body.status ?? body.state ?? body.data?.result;
      return { ok: true, result: normalizeResult(rawResult), score: body.score ?? body.confidence ?? null, http: res.status, raw: body };
    } catch (e) {
      clearTimeout(t);
      if (attempt < retries) continue;
      return { ok: false, result: 'unknown', error: e.name === 'AbortError' ? 'timeout' : e.message };
    }
  }
  return { ok: false, result: 'unknown', error: 'exhausted' };
}

/** Remaining BounceBan credits (best-effort; endpoint confirmed on first use). */
export async function credits({ apiKey, fetchImpl = fetch } = {}) {
  try { const r = await fetchImpl(`${BASE}/credits`, { headers: { Authorization: apiKey } }); return await r.json(); } catch (e) { return { error: e.message }; }
}

/**
 * Is a lead sendable given both verifiers? mv 'ok' OR BounceBan 'deliverable'.
 * Shared by the cold-list-evaluator + smartlead-launch so "verified" means the
 * same thing everywhere.
 */
export function isSendable({ mv_status, bounceban_status } = {}) {
  return mv_status === 'ok' || bounceban_status === 'deliverable';
}
