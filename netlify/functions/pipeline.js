/**
 * pipeline — the rep's Pipeline board for /sales-intelligence.
 *
 * GET  /pipeline            → the caller's own board (built by lib/pipeline-board.js)
 * GET  /pipeline?rep=Name   → another rep's board, MANAGERS ONLY
 * POST /pipeline { action:'move', key, stage, suggested?, company?, contact?, email?, rep? }
 *                           → upsert the caller's manual placement (rep param managers only)
 * POST /pipeline { action:'reset', key, rep? } → drop the override, back to the suggestion
 *
 * Visibility rule (Will, 2026-09-02): a rep sees ONLY their own board. The
 * board is resolved from the caller's verified JWT → their connected Gmail
 * (gmail_accounts) → assigneeForGmail. The `rep` query param is honoured
 * only for the MANAGERS allowlist; anyone else gets their own board no
 * matter what they pass. Overrides are keyed per rep, so a manager moving
 * a card on Marc's board changes Marc's board, not their own.
 */
import { createClient } from '@supabase/supabase-js';
import { assigneeForGmail } from './lib/assignee.js';
import { buildBoard, REPS, STAGES } from './lib/pipeline-board.js';

const MANAGERS = ['will@getshortcut.co'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'Server misconfigured' });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(auth.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  // Who is this? Connected Gmail first (it is the rep registry), auth email second.
  const { data: gAcct } = await sb.from('gmail_accounts').select('email').eq('supabase_user_id', user.id).maybeSingle();
  const myEmail = lc(gAcct?.email) || lc(user.email);
  const myRep = assigneeForGmail(myEmail);
  const isManager = MANAGERS.includes(lc(user.email)) || MANAGERS.includes(myEmail);

  const requested = event.httpMethod === 'GET'
    ? event.queryStringParameters?.rep
    : (() => { try { return JSON.parse(event.body || '{}').rep; } catch { return null; } })();
  let rep = myRep;
  if (requested && REPS[requested]) {
    if (isManager) rep = requested;
    else if (requested !== myRep) return json(403, { error: 'You can only see your own board.' });
  }
  if (!rep) return json(200, { success: true, board: null, viewer: { email: myEmail, rep: null, is_manager: isManager, reps: isManager ? Object.keys(REPS) : [] }, note: `No board is set up for ${myEmail}. Connect your Gmail from the header so we can match you to your leads.` });

  if (event.httpMethod === 'GET') {
    try {
      const board = await buildBoard(sb, rep);
      return json(200, { success: true, board, viewer: { email: myEmail, rep: myRep, is_manager: isManager, reps: isManager ? Object.keys(REPS) : [myRep] } });
    } catch (e) {
      return json(500, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'GET or POST' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad json' }); }
  const leadKey = String(body.key || '').slice(0, 180);
  if (!leadKey) return json(400, { error: 'key required' });

  if (body.action === 'reset') {
    const { error: e } = await sb.from('pipeline_stage_overrides').delete().eq('rep_name', rep).eq('lead_key', leadKey);
    if (e) return json(500, { error: e.message });
    return json(200, { success: true, key: leadKey, stage: null });
  }
  if (body.action === 'move') {
    if (!STAGES.includes(body.stage)) return json(400, { error: `stage must be one of ${STAGES.join(', ')}` });
    const row = {
      rep_name: rep, lead_key: leadKey, stage: body.stage, suggested: body.suggested || null,
      company: body.company || null, contact: body.contact || null, email: lc(body.email) || null,
      set_by: myEmail, set_at: new Date().toISOString(),
    };
    const { error: e } = await sb.from('pipeline_stage_overrides').upsert(row, { onConflict: 'rep_name,lead_key' });
    if (e) return json(500, { error: /relation .* does not exist/i.test(e.message) ? 'Moves are not enabled yet: the pipeline_stage_overrides table is missing.' : e.message });
    return json(200, { success: true, key: leadKey, stage: body.stage });
  }
  return json(400, { error: 'unknown action' });
};
