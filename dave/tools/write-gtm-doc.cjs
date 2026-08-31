/**
 * write-gtm-doc.cjs — render the Shortcut GTM one-pager into a Google Doc.
 * Uses openclaw's GCP service account (Drive scope) to replace the doc body
 * with converted HTML. The doc must be shared to the service account as EDITOR.
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const DOC_ID = '1mTzXGLnh7SikO9sdRYtbgyYT4i78PvVJ_kr4fZQjrEw';
const credPath = path.join(process.env.HOME, '.openclaw/workspace/gcp-credentials.json');
const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const BLUE = '#003756';
const CORAL = '#FF5050';

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;line-height:1.45;color:#032232;">
<h1 style="color:${BLUE};margin-bottom:2px;">Shortcut Go-To-Market Plan</h1>
<p style="color:#6b7a82;margin-top:0;"><em>One system, not five campaigns. Grounded in the v4 messaging spine and real receipts. Draft, July 2026.</em></p>

<h2 style="color:${BLUE};">1. Positioning &mdash; the hub everything hangs on</h2>
<p><strong>Top line:</strong> <span style="color:${BLUE};font-weight:bold;">&ldquo;Wellness your people show up for.&rdquo;</span></p>
<p>One outcome, two mechanisms. Not three equal claims:</p>
<ul>
<li><strong>Outcome (lead here, prove it):</strong> people actually show up. Near-total participation vs about 24% for typical wellness (Gallup). The part of the budget that doesn&rsquo;t sit unused.</li>
<li><strong>Mechanism 1, zero lift:</strong> one team runs it start to finish; you approve a date and do nothing.</li>
<li><strong>Mechanism 2, one vendor:</strong> your whole team, in office and remote.</li>
</ul>
<p><strong>The one thing only we can say:</strong> proven participation at scale. 90%+ of slots booked, 87% of clients rebook, 500+ companies, BCG and DraftKings at every US office. Behaviour, never invented ROI.</p>
<p><strong>Voice:</strong> calm, human, no perks theater, never sell the tech.</p>

<h2 style="color:${BLUE};">2. The GTM web &mdash; one system, not five campaigns</h2>
<p>Positioning is the hub. Each lever does one job around the same core:</p>
<ul>
<li><strong>Open new doors</strong> the cold market won&rsquo;t: conferences, CLE.</li>
<li><strong>Unlock the budget</strong> so price stops killing deals: carrier wellness funds, which cut across both the broker and the client conversation.</li>
<li><strong>Deepen and expand</strong> what&rsquo;s open: retreats and offsites, then land-and-expand into recurring.</li>
<li><strong>Warm the top of funnel</strong> at the only channel that converts: the personal founder lane.</li>
</ul>
<p>The flywheel: every door produces a first event, single-site-deep is our biggest expander class, that becomes recurring quarterly or annual, and whole-team plus remote is the expansion story. Healthcare funds make the recurring spend painless.</p>

<h2 style="color:${BLUE};">3. The levers</h2>

<h3 style="color:${BLUE};">A. Core company sales &mdash; the engine</h3>
<ul>
<li><strong>Target:</strong> HR and People, workplace experience, and office managers at talent-competitive employers of roughly 250 to 5,000 (tech-enabled and elite professional services). HR/People has the best close ratio; office manager is the biggest volume.</li>
<li><strong>Mechanism:</strong> positioning, then the site, then the proposal. Lead with the outcome, publish a price range, arm the champion to sell the CFO.</li>
<li><strong>Reality:</strong> cold converts about 1%, personal about 25x. Cold&rsquo;s only job is to manufacture a warm reply cheaply, then graduate it to the personal lane.</li>
</ul>

<h3 style="color:${BLUE};">B. Healthcare funds &mdash; broker side (channel)</h3>
<ul>
<li><strong>Target:</strong> tiered benefits brokers (Marsh/Mercer, Aon/NFP, Gallagher, WTW, Lockton; mid-market OneDigital, Sequoia, Newfront, EPIC) plus carrier health-engagement contacts at Cigna, Aetna, and Anthem, who are nearly unprospected.</li>
<li><strong>Mechanism:</strong> white-label wellness for their book, plus help clients spend unused carrier wellness dollars before year-end. Tier 1 leads with &ldquo;look like a hero&rdquo;; Tier 2 and 3 get a 5 to 10% revenue share.</li>
<li><strong>Play:</strong> aim high, expect the forward. Our one booked broker meeting came from the President of EPIC forwarding the note down to the person who books.</li>
<li><strong>Status:</strong> live. Target-firm list, broker data, and Brokers tab; 134 contacts.</li>
</ul>

<h3 style="color:${BLUE};">C. Healthcare funds &mdash; client side (the budget unlock)</h3>
<ul>
<li><strong>Target:</strong> employers whose medical carrier has an employer wellness fund (Cigna Health Improvement Fund, Aetna Wellness Allowance, Anthem Wellness Fund).</li>
<li><strong>Mechanism:</strong> they forward our invoice to the carrier and the carrier pays. Removes the no-budget objection entirely.</li>
<li><strong style="color:${CORAL};">Receipt:</strong> Burberry pays for Shortcut chair massage through their Aetna Wellness Allowance.</li>
<li><strong>Constraint:</strong> only fund-eligible services in this pitch: chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching. Not nails, facials, or headshots.</li>
<li><strong>Next:</strong> ship the /wellness-funds one-pager (approved, not yet built).</li>
</ul>

<h3 style="color:${BLUE};">D. Conferences and exhibitors (event channel)</h3>
<ul>
<li>One live page serves conferences, retreats, and offsites. Two buyers: companies running their own event, and companies exhibiting at a conference.</li>
<li>The exhibitor play is our own booth model sold to others: 10x the conversations, every sign-up a lead.</li>
<li><strong>Proof:</strong> Workhuman Live 2026, 400 massages, 200+ waitlist, 5 chairs.</li>
<li><strong>Pricing:</strong> use stations ($650 to $3,000). Bundles were drafted but not shipped and are mispriced; fix before quoting.</li>
</ul>

<h3 style="color:${BLUE};">E. Company retreats and offsites</h3>
<ul>
<li>Same offer: the in-person gather for a distributed team. Even fully remote companies do kickoffs and offsites, which are full-menu in-person moments. Pair with the client fund unlock.</li>
</ul>

<h3 style="color:${BLUE};">F. CLE &mdash; the credibility wedge (attorneys)</h3>
<ul>
<li><strong>Live:</strong> a 60-minute accredited CLE, 1.0 credit in Ethics and Professionalism, in NY, PA, and FL only. Shortcut is the accredited provider and handles submission, attendance, and reporting. $3,000 flat, any size.</li>
<li><strong>Why it matters:</strong> a regulator-recognized deliverable no wellness competitor can grant. Lead with it in skeptical rooms, then land-and-expand into full wellness.</li>
<li><strong style="color:${CORAL};">Expansion flag (not built):</strong> insurance and financial-professional CE are a different regulatory regime, with separate boards and accreditation. Attractive, but not a claim we can make today.</li>
</ul>

<h3 style="color:${BLUE};">G. The personal founder lane (cross-cutting)</h3>
<ul>
<li>Will&rsquo;s warm networking, brokers first and tech execs second. The only channel that converts at scale. Every other lever feeds it a reason to reach out.</li>
</ul>

<h2 style="color:${BLUE};">4. Focus &mdash; honest priorities</h2>
<ol>
<li>Keep the engine on-spine (site, proposal, warm-reply graduation). Cheapest compounding return.</li>
<li>Ship /wellness-funds. The fund unlock is the biggest objection-killer and works on both sides.</li>
<li>Brokers: fewer, principal-aimed, expect the forward.</li>
<li>Push the exhibitor and booth angle. Underused, and we have the Workhuman proof.</li>
<li>CLE: mine NY, PA, and FL firms; treat insurance and financial CE as a scoping project, not a claim.</li>
</ol>
</body></html>`;

(async () => {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });

  const meta = await drive.files.get({
    fileId: DOC_ID,
    fields: 'id,name,mimeType,capabilities(canEdit)',
    supportsAllDrives: true,
  });
  console.log('doc name :', meta.data.name);
  console.log('mimeType :', meta.data.mimeType);
  console.log('canEdit  :', meta.data.capabilities && meta.data.capabilities.canEdit);

  await drive.files.update({
    fileId: DOC_ID,
    media: { mimeType: 'text/html', body: html },
    supportsAllDrives: true,
  });
  console.log('RESULT: doc content replaced OK');
})().catch((e) => {
  const err = (e && (e.errors || e.response?.data?.error || e.message)) || e;
  console.error('ERROR:', JSON.stringify(err, null, 2));
  process.exit(1);
});
