/**
 * Tells ops the moment a proposal is approved (Pedro, Nov 2026), so he starts lining
 * up Pros. Runs every 5 minutes.
 *
 * Approval is a status write from the client's browser, and the Slack ping that goes
 * with it is best effort (and an approval set through the API sends none), so this
 * reads the table instead: every approved proposal without an approved_alerted_at in
 * ops_proposal_flags gets one alert (lib/ops-notify.js: the event ops channel + a DM to
 * Pedro), then is stamped so it never alerts twice.
 *
 * First run: there is no history yet, so it stamps every proposal already approved
 * WITHOUT alerting; only approvals from then on reach Slack.
 *
 * Stamps cron_heartbeats as 'ops-approval-watch'.
 */
import { serviceClient } from './lib/staff-auth.js';
import { stampHeartbeat } from './lib/heartbeat.js';
import { notifyOps } from './lib/ops-notify.js';
import { alertText, clientName, looksLikeTest } from './lib/ops-staffing.js';

export const config = { schedule: '*/5 * * * *' };

const DAY_MS = 24 * 3600 * 1000;

async function alertedIDs(sb, ids) {
  const done = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb
      .from('ops_proposal_flags')
      .select('proposal_id, approved_alerted_at')
      .in('proposal_id', ids.slice(i, i + 200));
    if (error) throw new Error(`flags: ${error.message}`);
    (data || []).forEach((f) => f.approved_alerted_at && done.add(f.proposal_id));
  }
  return done;
}

async function stamp(sb, ids, at) {
  for (let i = 0; i < ids.length; i += 200) {
    const rows = ids.slice(i, i + 200).map((id) => ({ proposal_id: id, approved_alerted_at: at, updated_at: at }));
    const { error } = await sb.from('ops_proposal_flags').upsert(rows, { onConflict: 'proposal_id' });
    if (error) throw new Error(`stamp: ${error.message}`);
  }
}

export async function runApprovalWatch(sb, { notify = notifyOps, siteUrl } = {}) {
  const now = new Date().toISOString();

  const { count, error: countErr } = await sb
    .from('ops_proposal_flags')
    .select('proposal_id', { count: 'exact', head: true })
    .not('approved_alerted_at', 'is', null);
  if (countErr) throw new Error(`count: ${countErr.message}`);

  if (!count) {
    // First run: everything approved so far is history, not news.
    const ids = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from('proposals')
        .select('id')
        .eq('status', 'approved')
        .order('id')
        .range(from, from + 999);
      if (error) throw new Error(`seed: ${error.message}`);
      ids.push(...(data || []).map((p) => p.id));
      if (!data || data.length < 1000) break;
    }
    await stamp(sb, ids, now);
    return { seeded: ids.length, alerted: 0 };
  }

  // Approved and touched in the last three days: an approval updates the row.
  const { data: recent, error } = await sb
    .from('proposals')
    .select('id, client_name, status, data, is_test')
    .eq('status', 'approved')
    .gte('updated_at', new Date(Date.now() - 3 * DAY_MS).toISOString())
    .limit(200);
  if (error) throw new Error(`proposals: ${error.message}`);

  const candidates = (recent || []).filter((p) => !p.is_test && !looksLikeTest(clientName(p)));
  const done = await alertedIDs(sb, candidates.map((p) => p.id));
  let alerted = 0;
  for (const p of candidates.filter((c) => !done.has(c.id))) {
    const sent = await notify(alertText('approved', p, { siteUrl }));
    // Only stamped once it reached someone, so a Slack outage retries next run.
    if (sent.reached) {
      await stamp(sb, [p.id], new Date().toISOString());
      alerted += 1;
    }
  }
  return { seeded: 0, alerted };
}

export default async () => {
  const sb = serviceClient();
  try {
    const result = await runApprovalWatch(sb, { siteUrl: process.env.URL });
    await stampHeartbeat(sb, 'ops-approval-watch', {
      note: result.seeded ? `seeded ${result.seeded}` : `${result.alerted} alerted`,
      host: 'netlify',
    });
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[ops-approval-watch]', e.message);
    await stampHeartbeat(sb, 'ops-approval-watch', { status: 'error', note: e.message, host: 'netlify' });
    return new Response(e.message, { status: 500 });
  }
};
