import { supabase } from '../lib/supabaseClient';

// Sample COIs from the post-approval event survey. Files live in the private
// `coi-samples` bucket; netlify/functions/coi-sample.js issues the one-time
// upload links (for the client) and the short-lived open links (for staff).

/** One uploaded file, as stored in proposal_survey_responses.coi_sample_files. */
export interface CoiSampleFile {
  path: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

const FUNCTION_URL = '/.netlify/functions/coi-sample';
export const COI_MAX_BYTES = 10 * 1024 * 1024;
export const COI_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';
const COI_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/** Uploads one file for an approved proposal and returns what to save. */
export async function uploadCoiSample(proposalId: string, file: File): Promise<CoiSampleFile> {
  if (!COI_TYPES.has(file.type)) throw new Error('Please upload a PDF, a Word document or an image.');
  if (file.size > COI_MAX_BYTES) throw new Error('Please upload a file under 10 MB.');

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, fileName: file.name, contentType: file.type, size: file.size }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.path || !body.token) throw new Error(body.error || 'Could not start the upload. Please try again.');

  const { error } = await supabase.storage
    .from('coi-samples')
    .uploadToSignedUrl(body.path, body.token, file, { contentType: file.type });
  if (error) throw new Error('The upload did not finish. Please try again.');

  return { path: body.path, name: file.name, size: file.size, contentType: file.type, uploadedAt: new Date().toISOString() };
}

/** Staff only: opens a file in a new tab through a 10 minute signed link. */
export async function openCoiSample(path: string): Promise<void> {
  // Open the tab first, inside the click, so a popup blocker allows it.
  const tab = window.open('', '_blank');
  try {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(`${FUNCTION_URL}?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${data.session?.access_token || ''}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.url) throw new Error(body.error || 'Could not open the file.');
    if (tab) tab.location.href = body.url;
    else window.location.href = body.url;
  } catch (err) {
    tab?.close();
    window.alert(err instanceof Error ? err.message : 'Could not open the file.');
  }
}
