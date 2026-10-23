/**
 * MCP endpoint: lets a teammate's own AI (Claude, ChatGPT, Cursor, anything
 * that speaks the Model Context Protocol) create and edit proposals, landing
 * pages, sponsor pages and QR signs as that teammate.
 *
 *   URL:  https://proposals.getshortcut.co/.netlify/functions/mcp
 *   Auth: Authorization: Bearer sk_shortcut_...  (or ?key=sk_shortcut_... for
 *         clients that only take a URL). Keys: scripts/api-keys.mjs.
 *   Docs: docs/AI_INTEGRATION.md
 *
 * The tools ARE Pro's: the same definitions (lib/slack-ai.js TOOLS) and the
 * same handlers (lib/slack-tools.js), so a tool taught to Pro is one line in
 * EXPOSED away from every teammate's AI. Lead, email and invoice tools stay
 * Slack-only: they draft and send as a rep, or bill a client.
 *
 * Streamable HTTP, stateless: every POST carries one JSON-RPC message (or a
 * batch) and gets a JSON reply. No sessions and no server-sent stream, so
 * GET is refused, which the spec allows.
 */
import { TOOLS, SYSTEM_PROMPT_TEXT } from './lib/slack-ai.js';
import { executeTool } from './lib/slack-tools.js';
import { authenticate } from './lib/staff-auth.js';
import { buildPositioningBlock } from './lib/positioning.js';
import { notifyProposalCreated, notifyProposalEdited } from './lib/slack-notifier.js';

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'shortcut-proposals', title: 'Shortcut proposals', version: '1.0.0' };

const EXPOSED = new Set([
  'create_proposal', 'edit_proposal', 'search_proposals', 'get_proposal', 'duplicate_proposal',
  'calculate_pricing', 'lookup_client', 'search_logo',
  'create_proposal_option', 'link_proposals', 'unlink_proposal', 'rename_proposal_option', 'reorder_proposal_option',
  'create_landing_page', 'get_landing_page',
  'create_sponsor_page', 'edit_sponsor_page', 'get_sponsor_page', 'list_sponsor_pages',
  'create_qr_code_sign', 'get_qr_code_sign', 'list_qr_code_signs', 'edit_qr_code_sign',
]);

/* Some clients never show the server's instructions to the model, so the
   same text is also a tool the model can call. */
const GUIDE_TOOL = {
  name: 'get_guide',
  description: 'Call this FIRST, before creating or editing anything: the rules, service menu, pricing, edit operations and URL rules for proposals, landing pages, sponsor pages and QR signs, and how to write the words a client reads.',
  inputSchema: { type: 'object', properties: {} },
};

const TOOL_LIST = [
  GUIDE_TOOL,
  ...TOOLS.filter((t) => EXPOSED.has(t.name))
    .map(({ name, description, input_schema }) => ({ name, description, inputSchema: input_schema })),
];

/* Pro's own rules, from CRITICAL RULES on. What comes before that is Slack
   formatting and lead handling, which don't apply here. */
const PRO_RULES = SYSTEM_PROMPT_TEXT.slice(SYSTEM_PROMPT_TEXT.indexOf('## CRITICAL RULES'));

function guide(email) {
  return [
    `You are connected to Shortcut's proposals site (proposals.getshortcut.co) as ${email}. Everything you create is saved under their name and is live at the URL the tool returns.`,
    '',
    'You have the proposal, landing page, sponsor page, QR sign, pricing, client lookup and logo tools. The lead, email drafting and invoice tools are only in Slack (Pro). Where the rules below say to call lookup_lead, read_thread or draft_email, skip that step and ask the user instead.',
    'The rules below are the ones Pro follows in Slack. Ignore anything about Slack formatting.',
    '',
    '## Words the client reads',
    'customNote, heroTitle, signupLinkTitle and signupLinkDescription appear on the client\'s page. Write them the way you would explain it on a call: plain full sentences, no taglines or wordplay, no dashes as punctuation. Sponsor page fields are facts only, never copy. Follow this positioning:',
    buildPositioningBlock(),
    '',
    PRO_RULES,
  ].join('\n');
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status, body) => Response.json(body, {
  status,
  headers: { ...CORS, 'Cache-Control': 'no-store' },
});

const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const textContent = (text, isError = false) => ({ content: [{ type: 'text', text }], isError });

/** Posts to #proposals like the HTTP API does. Never fails the tool call. */
async function notify(name, result, supabase) {
  if (!['create_proposal', 'duplicate_proposal', 'edit_proposal'].includes(name) || !result.proposalId) return;
  try {
    const { data: row } = await supabase.from('proposals').select('*').eq('id', result.proposalId).single();
    if (!row) return;
    if (name === 'edit_proposal') await notifyProposalEdited(row, row.data, result.changesSummary);
    else await notifyProposalCreated(row, row.data);
  } catch (err) {
    console.warn('mcp: Slack notification failed:', err.message);
  }
}

async function callTool(params, ctx) {
  const name = params?.name;
  if (name === GUIDE_TOOL.name) return textContent(guide(ctx.user.email));
  if (!EXPOSED.has(name)) return textContent(`Unknown tool: ${name}`, true);

  const input = { ...(params.arguments || {}) };
  if (name === 'create_proposal' && !input.notes) input.notes = `Created via API by ${ctx.user.email}`;

  const result = await executeTool(name, input, ctx.supabase, ctx.user.id, { callerEmail: ctx.user.email });
  console.log(`mcp: ${ctx.user.email} ${name} ${result?.error ? `failed: ${result.error}` : 'ok'}`);
  if (result?.success) await notify(name, result, ctx.supabase);
  return textContent(JSON.stringify(result, null, 2), !!result?.error);
}

/** The reply to one JSON-RPC message, or null for a notification. */
async function handle(msg, ctx) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return rpcError(msg?.id, -32600, 'Invalid request');
  }
  const isNotification = msg.id === undefined || msg.id === null;
  if (isNotification) return null; // notifications/initialized, notifications/cancelled

  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params?.protocolVersion;
      return rpcResult(msg.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: guide(ctx.user.email),
      });
    }
    case 'ping':
      return rpcResult(msg.id, {});
    case 'tools/list':
      return rpcResult(msg.id, { tools: TOOL_LIST });
    case 'tools/call':
      return rpcResult(msg.id, await callTool(msg.params, ctx));
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') {
    return new Response('This MCP endpoint takes JSON-RPC over POST. Setup: docs/AI_INTEGRATION.md', {
      status: 405,
      headers: { ...CORS, Allow: 'POST, OPTIONS' },
    });
  }

  let ctx;
  try {
    ctx = await authenticate(req, { allowQueryKey: true });
  } catch (err) {
    return json(err.statusCode || 401, rpcError(null, -32001, err.message || 'Unauthorized'));
  }

  const raw = await req.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, rpcError(null, -32700, 'Parse error'));
  }

  const batch = Array.isArray(body);
  const replies = [];
  for (const msg of batch ? body : [body]) {
    const reply = await handle(msg, ctx);
    if (reply) replies.push(reply);
  }
  if (!replies.length) return new Response(null, { status: 202, headers: CORS });
  return json(200, batch ? replies : replies[0]);
};
