/**
 * pipeline-board — builds ONE rep's pipeline board from the signals we
 * already have (Gmail sends/replies, Workhuman leads + personal notes,
 * proposals, the client event graph, suppression) and layers the rep's
 * manual stage overrides (pipeline_stage_overrides) on top.
 *
 * Scoping is by rep from the first query, never "pull everything and
 * filter": a rep's board is built from their own sends, their own
 * Workhuman assignments, and leads graduated to them. Nothing about
 * another rep's book is ever loaded.
 *
 * Stage vocabulary (suggested + overridable):
 *   discovery · active · proposal_sent · negotiation · closing · won · future
 *   account (existing client) · cold (emailed, no reply) · no_for_now · hidden
 * negotiation / closing / hidden are only ever set by hand.
 *
 * Same rules as the Sep 2 2026 board artifact; see memory
 * project_team_pipeline_board for the data traps each rule handles.
 */

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const norm = (s) => (lc(s) || '').replace(/&/g, 'and').replace(/\b(inc|llc|llp|corp|corporation|co|company|ltd|group|the|usa|us)\b/g, '').replace(/[^a-z0-9]/g, '');
const days = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);

export const REPS = {
  'Will Newton':      { first: 'Will',   emails: ['will@getshortcut.co'], self: /newton/i },
  'Jaimie Pritchard': { first: 'Jaimie', emails: ['jaimie@getshortcut.co', 'jaimiepr@shortcutcorpwellness.com'], self: /pritchard/i },
  'Marc Levitan':     { first: 'Marc',   emails: ['marc@getshortcut.co'], self: /levitan/i },
  'Caren Skutch':     { first: 'Caren',  emails: ['caren@getshortcut.co'], self: /skutch/i },
};
export const STAGES = ['discovery', 'active', 'proposal_sent', 'negotiation', 'closing', 'won', 'future', 'account', 'cold', 'no_for_now', 'hidden'];

const INTERNAL = /@(getshortcut\.co|shortcutcorpwellness\.com|shortcutemployeewellness\.com|getshortcutcorporate\.com|shortcut\.co|shortcutapp\.co|shortcutwellness\.com|workhuman\.com)$/i;
const VENDOR = /@(worktechevents\.co\.uk|medialoft\.com|tshirtexpress\.com|gcuc\.co|wellbeingatwork\.world|calendly\.com|etsy\.com|stripe\.com|smartlead\.ai|apollo\.io)$/i;
const FREEMAIL = /^(gmail|yahoo|hotmail|outlook|icloud|me|aol|live|msn)\.com$/i;
const NOTE_RE = /\[[^\[\]]*·[^\[\]]*\]/;
const DECLINE = /\b(no|not|isn'?t|zero) (current |real )?(interest|need)|unable to (provide|move|fund)|not able to|no budget|don'?t have (the )?budget|pass for now|not moving forward|decided (not|against)|won'?t be (moving|able)|not a (good )?fit|going (with|in) (another|a different)|unsubscribe|remove me/i;
const LATER = /\b(next year|next quarter|later this year|in the fall|in q[1-4]|early 20\d\d|revisit|circle back|check back|reach (back )?out in|after the summer|budget (cycle|season|planning))\b/i;
const LOGISTICS = /\b(appt|appointment|cancel|reschedul|slot|spot|code|booked|book(ing)?|schedule|time|1[0-9]?:[0-9]{2}|am|pm|massage today|reminder)\b/i;
const BOOTH = (d) => d && d >= '2026-04-24' && d <= '2026-05-02';   // Workhuman Live week
const TEST_PROPOSAL = /^(test|testy|dsfg|api test|acme|william newton|mikimoto \(copy\)|mikimoto test|nike spring|big$|workhuman live)/i;

export const leadKey = (email, company) => {
  const raw = email || ('co~' + norm(company));
  return raw.toLowerCase().replace(/[^a-z0-9_\-.~:@+]/g, '-').slice(0, 180);
};

async function all(q, pageSize = 1000) {
  const out = []; let from = 0;
  for (;;) {
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
async function inChunks(sb, table, select, col, values, extra) {
  const out = [];
  for (let i = 0; i < values.length; i += 200) {
    let q = sb.from(table).select(select).in(col, values.slice(i, i + 200));
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
  }
  return out;
}

/**
 * @param sb service-role supabase client
 * @param repName canonical assignee name, e.g. 'Marc Levitan'
 * @param opts { since?: 'YYYY-MM-DD' }
 */
export async function buildBoard(sb, repName, opts = {}) {
  const rep = REPS[repName];
  if (!rep) throw new Error(`unknown rep ${repName}`);
  const since = opts.since || `${new Date().getFullYear()}-01-01`;
  const repEmails = rep.emails;

  // ---- 1. the rep's book: their sends, their Workhuman leads, their graduations, their legacy campaigns
  const [camps, wh, gradContacts, mySends] = await Promise.all([
    all(sb.from('outreach_campaigns').select('campaign_id,name')),
    all(sb.from('workhuman_leads').select('id,name,email,company,title,tier,tier_1a,tier_1b,outreach_status,notes,assigned_to,lead_score,landing_page_url,page_view_count,page_last_viewed_at,personal_email,linked_main_lead_id').eq('assigned_to', repName)),
    all(sb.from('outreach_contacts').select('email').eq('graduated_owner', repName)),
    all(sb.from('outreach_sends').select('email,campaign_id,sent_time,reply_time,sender_email,thread_id').in('sender_email', repEmails).gte('sent_time', since).order('sent_time', { ascending: true })),
  ]);
  const myCampIds = camps.filter((c) => new RegExp(`\\b${rep.first}\\b`, 'i').test(c.name || '')).map((c) => c.campaign_id);
  const campName = new Map(camps.map((c) => [c.campaign_id, c.name]));
  const campSends = myCampIds.length
    ? await inChunks(sb, 'outreach_sends', 'email,campaign_id,sent_time,reply_time,sender_email,thread_id', 'campaign_id', myCampIds, (q) => q.gte('sent_time', since))
    : [];
  const sends = [...mySends, ...campSends.filter((s) => !s.sender_email)];

  const emailSet = new Set();
  for (const s of sends) if (s.email && !INTERNAL.test(s.email)) emailSet.add(lc(s.email));
  for (const c of gradContacts) if (c.email && !INTERNAL.test(c.email)) emailSet.add(lc(c.email));
  for (const w of wh) {
    if (!w.email || INTERNAL.test(w.email)) continue;
    if (NOTE_RE.test(w.notes || '') || ['responded', 'meeting_booked', 'vip_booked', 'emailed'].includes(w.outreach_status)) emailSet.add(lc(w.email));
  }
  const emails = [...emailSet];

  // ---- 2. everything else, scoped to those emails (plus small global tables)
  const [replies, contacts, suppRows, cos, propsRaw, overridesRaw] = await Promise.all([
    inChunks(sb, 'outreach_replies', 'email,campaign_id,reply_date,reply_sentiment,is_ooo,reply_content', 'email', emails, (q) => q.gte('reply_date', since)),
    inChunks(sb, 'outreach_contacts', 'email,name,title,company,graduated_at,graduated_owner', 'email', emails),
    inChunks(sb, 'crm_suppression', 'email,reason', 'email', emails),
    all(sb.from('crm_companies').select('display_name,aliases,is_internal,total_events,test_events,first_event_at,last_event_at,activity_status,contact_domains')),
    all(sb.from('proposals').select('id,created_at,client_name,client_email,status,user_id,is_test,is_shared').gte('created_at', since)),
    all(sb.from('pipeline_stage_overrides').select('lead_key,stage,suggested,set_by,set_at').eq('rep_name', repName)).catch(() => []),
  ]);
  const { data: ga } = await sb.from('gmail_accounts').select('email,supabase_user_id');
  const userToRep = {};
  for (const g of ga || []) for (const [n, r] of Object.entries(REPS)) if (r.emails.includes(lc(g.email))) userToRep[g.supabase_user_id] = n;

  // ---- 3. lookups
  const repliesBy = new Map(); for (const r of replies) { const k = lc(r.email); (repliesBy.get(k) || repliesBy.set(k, []).get(k)).push(r); }
  const sendsBy = new Map(); for (const s of sends) { const k = lc(s.email); if (!k) continue; (sendsBy.get(k) || sendsBy.set(k, []).get(k)).push(s); }
  const contactBy = new Map(contacts.map((c) => [lc(c.email), c]));
  const supp = new Map(suppRows.map((s) => [lc(s.email), s]));
  const whById = new Map(wh.map((w) => [w.id, w]));
  const whBy = new Map(); for (const w of wh) { if (w.email) whBy.set(lc(w.email), w); if (w.personal_email && !whBy.has(lc(w.personal_email))) whBy.set(lc(w.personal_email), w); }
  const overrides = new Map(overridesRaw.map((o) => [o.lead_key, o]));

  const clientsByNorm = new Map(), clientsByDomain = new Map();
  for (const c of cos) {
    if (c.is_internal || !((c.total_events || 0) - (c.test_events || 0) > 0) || /test/i.test(c.display_name || '')) continue;
    const rec = { name: c.display_name, events: c.total_events, first: c.first_event_at?.slice(0, 10) || null, last: c.last_event_at?.slice(0, 10) || null, status: c.activity_status };
    for (const n of [c.display_name, ...(c.aliases || [])]) { const k = norm(n); if (k.length >= 3) clientsByNorm.set(k, rec); }
    for (const d of (c.contact_domains || [])) clientsByDomain.set(lc(d), rec);
  }
  const clientByName = (company) => {
    if (!company) return null;
    const n = norm(company); if (n.length >= 3 && clientsByNorm.has(n)) return clientsByNorm.get(n);
    const seg = norm(String(company).split(/[+,\/|(]/)[0]); if (seg.length >= 3 && clientsByNorm.has(seg)) return clientsByNorm.get(seg);
    const first = (lc(company) || '').split(/[^a-z0-9]+/).filter((t) => t.length >= 5)[0];
    if (first) for (const [k, v] of clientsByNorm) if (k === first || (k.startsWith(first) && k.length <= first.length + 4)) return v;
    return null;
  };
  const clientFor = (company, email) => {
    const d = lc((email || '').split('@')[1] || '');
    if (d && !FREEMAIL.test(d) && clientsByDomain.has(d)) return clientsByDomain.get(d);
    return clientByName(company);
  };
  const wonOrAccount = (cl) => ((cl.first && cl.first >= since) ? 'won' : 'account');

  const ADMIN_PRO = '42c7eb9e-7ab1-4ba4-bfc7-f23d367d4884';   // Pro (Slack) creates proposals as this user
  const props = propsRaw.filter((p) => !p.is_test && !TEST_PROPOSAL.test(p.client_name || ''));
  const propsByEmail = new Map(), propsByCompany = new Map();
  for (const p of props) {
    if (p.client_email && !INTERNAL.test(p.client_email)) { const k = lc(p.client_email); (propsByEmail.get(k) || propsByEmail.set(k, []).get(k)).push(p); }
    const n = norm(p.client_name); if (n.length >= 3) (propsByCompany.get(n) || propsByCompany.set(n, []).get(n)).push(p);
  }
  const fmtProp = (p) => ({ id: p.id, client: p.client_name, status: p.status, shared: !!p.is_shared, created: p.created_at.slice(0, 10), by: userToRep[p.user_id] || (p.user_id === ADMIN_PRO ? 'Pro (Slack)' : 'unknown') });

  // ---- 4. one row per email
  const rows = [];
  for (const email of emails) {
    const c = contactBy.get(email);
    let w = whBy.get(email); if (w?.linked_main_lead_id && whById.get(w.linked_main_lead_id)) w = whById.get(w.linked_main_lead_id);
    const sl = (sendsBy.get(email) || []).sort((a, b) => (a.sent_time < b.sent_time ? -1 : 1));
    const rl = (repliesBy.get(email) || []).sort((a, b) => (a.reply_date < b.reply_date ? -1 : 1));
    const lastSend = sl.at(-1);
    const cls = rl.map((r) => {
      const d = r.reply_date?.slice(0, 10); const txt = (r.reply_content || '').replace(/\s+/g, ' ');
      let s = r.reply_sentiment || 'neutral';
      if (s === 'ooo' || r.is_ooo) s = 'ooo';
      else if (DECLINE.test(txt)) s = 'decline';
      else if (BOOTH(d) && LOGISTICS.test(txt)) s = 'logistics';
      else if (s === 'maybe_later' || LATER.test(txt)) s = 'later';
      else if (/^re: (appointment canceled|automatic reply)/i.test(txt)) s = 'logistics';
      return { d, s, txt: txt.slice(0, 200) };
    });
    const real = cls.filter((x) => !['ooo', 'logistics'].includes(x.s)); const lastReal = real.at(-1); const lastAny = cls.at(-1);
    const pos = real.filter((x) => x.s === 'positive');

    const dom = lc(email.split('@')[1] || '');
    const domCo = (!FREEMAIL.test(dom) && dom) ? dom.replace(/\.(com|co|org|net|edu|io|tv|world|uk|ai|media)(\.[a-z]{2})?$/, '').split('.').pop().split(/[-_]/).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' ') : null;
    const name = w?.name || c?.name || null;
    const pe = propsByEmail.get(email) || [];
    const co0 = w?.company || c?.company || null;
    const pc = co0 ? (propsByCompany.get(norm(co0)) || []) : (domCo ? (propsByCompany.get(norm(domCo)) || []) : []);
    const ps = [...new Map([...pe, ...pc].map((p) => [p.id, p])).values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const company = co0 || ps[0]?.client_name || domCo || null;
    const approved = ps.find((p) => p.status === 'approved'); const shared = ps.find((p) => p.is_shared);
    const client = clientFor(company, email);
    const isNote = NOTE_RE.test(w?.notes || '');
    const noteLine = isNote ? String(w.notes).split(/\n/).filter((x) => NOTE_RE.test(x)).at(-1) : null;
    const noteText = noteLine ? noteLine.replace(/^\[[^\]]*\]\s*/, '').trim() : null;
    const noteMeta = noteLine?.match(/^\[([^\]]*)\]/)?.[1] || null;
    const suppressed = supp.get(email);
    const saidNo = lastReal?.s === 'decline' || lastReal?.s === 'negative';

    let excluded = null;
    if (rep.self.test(email) || (name && rep.self.test(name))) excluded = 'Your own address';
    else if (VENDOR.test(email)) excluded = 'Vendor or event partner';
    else if (/no-email\.placeholder$/.test(email)) excluded = 'Placeholder email';
    if (excluded) continue;

    let stage; const flags = [];
    if ((client || approved) && (suppressed || saidNo)) { stage = approved ? 'won' : wonOrAccount(client); flags.push(suppressed ? `On the suppression list (${suppressed.reason || 'unknown'}), check before emailing` : 'Latest reply reads as a no, verify'); }
    else if (suppressed || saidNo) { stage = 'no_for_now'; if (lastReal?.s === 'decline') flags.push('Auto-read as a decline, verify'); if (suppressed) flags.push(`Suppressed: ${suppressed.reason || 'unknown'}`); }
    else if (approved) stage = 'won';
    else if (client) stage = wonOrAccount(client);
    else if (ps.length) { stage = 'proposal_sent'; if (!shared) flags.push('Proposal drafted, not shared yet'); }
    else if (pos.length || ['meeting_booked', 'responded'].includes(w?.outreach_status)) stage = 'active';
    else if (lastReal?.s === 'later') stage = 'future';
    else if (lastReal) stage = 'discovery';
    else if (isNote || w?.outreach_status === 'vip_booked') stage = 'discovery';
    else if (sl.length) stage = 'cold';
    else continue;
    if (cls.some((x) => x.s === 'logistics') && !real.length) flags.push('Only booth-logistics replies so far');
    if (approved) { const by = userToRep[approved.user_id]; if (by && by !== repName) flags.push(`Approved proposal by ${REPS[by].first}`); else if (approved.user_id === ADMIN_PRO) flags.push('Approved proposal created in Pro (Slack)'); }

    let score = 0;
    if (client) score += (wonOrAccount(client) === 'won' ? 320 : 260); if (approved) score += 250; else if (ps.length) score += 180;
    if (lastReal) score += ({ positive: 100, neutral: 40, later: 50, decline: -200, negative: -200 })[lastReal.s] ?? 20; score += pos.length * 15;
    if (isNote) score += 60; if (w?.outreach_status === 'meeting_booked') score += 90; if (w?.outreach_status === 'vip_booked') score += 25; if (w?.tier_1a) score += 20; score += Math.min(30, (w?.page_view_count || 0) * 4);
    const rd = days(lastReal?.d); if (rd != null) score += Math.max(0, 80 - rd / 3);
    const sd = days(lastSend?.sent_time); if (sd != null && !lastReal) score += Math.max(0, 20 - sd / 10);

    const replyAfterSend = lastReal && (!lastSend || lastReal.d > lastSend.sent_time.slice(0, 10));
    let next = null;
    if (stage === 'account') next = client.last && days(client.last) > 150 ? `Re-engage, last event ${client.last}` : 'Keep the account warm';
    else if (stage === 'won') next = 'Confirm the event logistics, then ask about the next one';
    else if (stage === 'proposal_sent') next = !shared ? 'Share the proposal' : (sd != null && sd >= 5 ? `Nudge on the proposal, ${sd}d quiet` : 'Wait for their reply');
    else if (stage === 'active') next = replyAfterSend ? 'Reply: offer two times or send the proposal' : (sd != null && sd >= 7 ? `Follow up, ${sd}d since your last note` : 'Send times or a proposal');
    else if (stage === 'discovery') { if (!sl.length) next = 'Send the first note, never emailed'; else if (replyAfterSend) next = 'Reply and ask for a time'; else if (sd >= 4) next = `Follow up, ${sd}d and ${sl.length} touches`; else next = 'Wait a few days, then follow up'; }
    else if (stage === 'future') next = 'Set a reminder for the date they named';
    else if (stage === 'cold') next = sl.length >= 3 ? 'Park it or try a new angle' : `Follow up, ${sd}d and ${sl.length} touches`;

    rows.push({
      key: leadKey(email, company), suggested: stage, score: Math.round(score), flags, email, emails: [email], name,
      title: w?.title || c?.title || null, company,
      client: client ? { name: client.name, events: client.events, first: client.first, last: client.last } : null,
      tier: w ? (w.tier_1a ? '1A' : w.tier_1b ? '1B' : (w.tier || '').replace('tier_', '')) : null,
      wh_status: w?.outreach_status || null, note: noteText, note_meta: noteMeta, lp_views: w?.page_view_count || 0, landing_page: w?.landing_page_url || null, thread_id: lastSend?.thread_id || null,
      sends: sl.length, last_send: lastSend?.sent_time?.slice(0, 10) || null, replies: real.length, positive: pos.length,
      last_reply: lastReal?.d || lastAny?.d || null, last_sentiment: lastReal?.s || lastAny?.s || null, last_snippet: (lastReal || lastAny)?.txt || null,
      proposals: ps.map(fmtProp), next,
      person_key: (norm(name) || email) + '|' + norm(company),
    });
  }

  // ---- 5. merge the same person across work + personal addresses
  const byPerson = new Map();
  for (const r of rows) {
    const k = r.name && r.company ? r.person_key : r.email;
    const cur = byPerson.get(k);
    if (!cur) { byPerson.set(k, r); continue; }
    const keep = r.score > cur.score ? r : cur, drop = r.score > cur.score ? cur : r;
    byPerson.set(k, { ...keep, emails: [...cur.emails, ...r.emails], sends: keep.sends + drop.sends, note: keep.note || drop.note, note_meta: keep.note_meta || drop.note_meta });
  }
  const leads = [...byPerson.values()];

  // ---- 6. company-level proposal rows the rep made (or Pro made for their lead) that matched no contact
  const linked = new Set(leads.flatMap((x) => x.proposals.map((p) => p.id)));
  const ownedCompanies = new Set(), ownedTok = new Set();
  for (const x of leads) { const n = norm(x.company); if (n.length >= 3) ownedCompanies.add(n); const d = lc((x.email || '').split('@')[1] || ''); const tok = d.split('.')[0]; if (tok && tok.length >= 4 && !FREEMAIL.test(d)) ownedTok.add(tok.replace(/[^a-z0-9]/g, '')); }
  const groups = new Map();
  for (const p of props) { if (linked.has(p.id)) continue; const n = norm(p.client_name); (groups.get(n) || groups.set(n, []).get(n)).push(p); }
  for (const [n, ps0] of groups) {
    const ps = ps0.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const mine = ps.some((p) => userToRep[p.user_id] === repName);
    const firstTok = (lc(ps[0].client_name) || '').split(/[^a-z0-9]+/).filter((t) => t.length >= 4)[0];
    const viaCompany = !mine && (ownedCompanies.has(n) || (firstTok && ownedTok.has(firstTok))) && ps.every((p) => !userToRep[p.user_id]);
    if (!mine && !viaCompany) continue;
    const approved = ps.find((p) => p.status === 'approved'), shared = ps.find((p) => p.is_shared); const client = clientByName(ps[0].client_name);
    const stage = approved ? 'won' : client ? wonOrAccount(client) : 'proposal_sent';
    const flags = []; if (!client && !approved && !shared) flags.push('Proposal drafted, not shared yet'); if (viaCompany) flags.push('Created in Pro (Slack), matched to your lead by company'); if (approved && userToRep[approved.user_id] && userToRep[approved.user_id] !== repName) flags.push(`Approved proposal by ${REPS[userToRep[approved.user_id]].first}`);
    const d0 = days(ps[0].created_at);
    leads.push({
      key: leadKey(null, ps[0].client_name), suggested: stage, score: Math.round((client ? (wonOrAccount(client) === 'won' ? 320 : 260) : approved ? 250 : 180) + Math.max(0, 60 - d0 / 3)), flags,
      email: null, emails: [], name: null, title: null, company: ps[0].client_name,
      client: client ? { name: client.name, events: client.events, first: client.first, last: client.last } : null,
      tier: null, wh_status: null, note: null, note_meta: null, lp_views: 0, landing_page: null, thread_id: null, sends: 0, last_send: null, replies: 0, positive: 0, last_reply: null, last_sentiment: null, last_snippet: null,
      proposals: ps.map(fmtProp),
      next: client ? (client.last && days(client.last) > 150 ? `Re-engage, last event ${client.last}` : 'Keep the account warm') : approved ? 'Confirm the event logistics, then ask about the next one' : (!shared ? 'Share the proposal' : `Nudge on the proposal, ${d0}d since drafted`),
    });
  }

  // ---- 7. overrides win
  for (const r of leads) {
    const o = overrides.get(r.key);
    r.stage = o?.stage || r.suggested;
    r.moved = o ? { set_by: o.set_by, set_at: o.set_at } : null;
    delete r.person_key;
  }
  leads.sort((a, b) => b.score - a.score);
  const counts = {}; for (const r of leads) counts[r.stage] = (counts[r.stage] || 0) + 1;
  return { rep: repName, first: rep.first, since, generated_at: new Date().toISOString(), counts, rows: leads };
}
