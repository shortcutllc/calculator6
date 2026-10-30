/**
 * Sample COIs from the post-approval event survey (ProposalSurveyForm), in the
 * private `coi-samples` bucket (supabase/migrations/20261029000000_survey_coi_samples_and_entry.sql).
 *
 *   POST { proposalId, fileName, contentType, size }  → { path, token }
 *     For the client filling in the survey (no sign-in): a one-time signed
 *     upload link for an APPROVED proposal, the only state that shows the
 *     survey. The browser then uploads with uploadToSignedUrl(path, token).
 *   GET ?path=<proposalId>/<file>                      → { url }
 *     For staff (lib/staff-auth.js): a 10 minute signed link to open a file.
 *
 * Neither anon nor authenticated users can touch the bucket directly; this
 * function holds the service role.
 */
import { authenticate, serviceClient } from './lib/staff-auth.js';

const BUCKET = 'coi-samples';
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (status, body) => Response.json(body, { status, headers: { ...CORS, 'Cache-Control': 'no-store' } });

/** "Building COI sample (2026).pdf" → "building-coi-sample-2026.pdf" */
function safeName(fileName, ext) {
  const base = String(fileName || 'coi')
    .replace(/\.[^.]*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'coi';
  return `${base}.${ext}`;
}

async function issueUpload(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { proposalId, fileName, contentType, size } = body || {};
  if (!UUID.test(String(proposalId || ''))) return json(400, { error: 'proposalId is required' });
  const ext = TYPES[contentType];
  if (!ext) return json(400, { error: 'Please upload a PDF, a Word document or an image.' });
  if (!(Number(size) > 0) || Number(size) > MAX_BYTES) return json(400, { error: 'Please upload a file under 10 MB.' });

  const supabase = serviceClient();
  const { data: proposal } = await supabase.from('proposals').select('id, status').eq('id', proposalId).maybeSingle();
  if (!proposal) return json(404, { error: 'Proposal not found' });
  if (proposal.status !== 'approved') return json(403, { error: 'Files can be added once the proposal is approved.' });

  const path = `${proposalId}/${Date.now()}-${safeName(fileName, ext)}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) {
    console.error('coi-sample: could not create an upload link:', error.message);
    return json(500, { error: 'Could not start the upload. Please try again.' });
  }
  return json(200, { path: data.path, token: data.token });
}

async function issueDownload(req) {
  try {
    await authenticate(req);
  } catch (err) {
    return json(err.statusCode || 401, { error: err.message || 'Unauthorized' });
  }
  const path = new URL(req.url).searchParams.get('path') || '';
  const [proposalId, file, ...rest] = path.split('/');
  if (!UUID.test(proposalId) || !file || rest.length) return json(400, { error: 'A valid path is required' });

  // No `download` option: staff click "Open", so PDFs and images show in the
  // tab. Word files still download, since the browser can't show them.
  const { data, error } = await serviceClient().storage.from(BUCKET).createSignedUrl(path, 600);
  if (error) return json(404, { error: 'File not found' });
  return json(200, { url: data.signedUrl });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method === 'POST') return issueUpload(req);
  if (req.method === 'GET') return issueDownload(req);
  return json(405, { error: 'Method not allowed' });
};
