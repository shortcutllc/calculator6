import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// =============================================================================
// SmartLead Webhook → Google Sheets CRM Updater
// =============================================================================
// Receives real-time events from SmartLead (reply, bounce, unsubscribe)
// and updates the corresponding lead row in Google Sheets.
//
// Events handled:
//   EMAIL_REPLIED      → Interested / Not Interested / OOO (keyword classification)
//   EMAIL_BOUNCED      → Bounced
//   LEAD_UNSUBSCRIBED  → Not Interested
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-smartlead-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------------------------------------------------------------------------
// Stage colors for Google Sheets Column A formatting
// Matches shared.js in the lead prospecting workspace
// ---------------------------------------------------------------------------
const STAGE_COLORS: Record<string, { red: number; green: number; blue: number }> = {
  'New':            { red: 0.85, green: 0.85, blue: 0.85 },
  'Validated':      { red: 0.68, green: 0.85, blue: 0.90 },
  'No Reply':       { red: 1.00, green: 0.85, blue: 0.60 },
  'Interested':     { red: 0.60, green: 0.90, blue: 0.60 },
  'Not Interested': { red: 1.00, green: 0.75, blue: 0.75 },
  'Closed':         { red: 0.20, green: 0.66, blue: 0.33 },
  'OOO':            { red: 1.00, green: 1.00, blue: 0.60 },
  'Bounced':        { red: 1.00, green: 0.50, blue: 0.50 },
  'Invalid':        { red: 0.80, green: 0.30, blue: 0.30 },
  'Catch-all':      { red: 0.87, green: 0.81, blue: 0.68 },
  'No Email':       { red: 0.75, green: 0.75, blue: 0.75 },
  'Unverified':     { red: 0.93, green: 0.79, blue: 0.55 },
  'Duplicate':      { red: 0.75, green: 0.75, blue: 0.75 },
}

const DARK_STAGES = ['Invalid', 'Closed']

// 16 city tabs in the CRM sheet
const CITY_TABS = [
  'Boston', 'Miami', 'LA', 'SF', 'Chicago', 'Seattle',
  'Philadelphia', 'San Diego', 'Dallas-Fort Worth', 'Houston',
  'Austin', 'Portland', 'Washington DC', 'Minneapolis', 'Atlanta', 'New York',
]

// ---------------------------------------------------------------------------
// Reply classification (keyword heuristics — no LLM for real-time speed)
// Ported from cleanup_sheet.js
// ---------------------------------------------------------------------------

function isOOO(text: string): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  const patterns = [
    'out of office', 'out of the office', 'automatic reply', 'auto-reply',
    'autoreply', 'auto reply', 'i am currently out', 'i will be out',
    'away from', 'on vacation', 'on leave', 'on pto', 'on holiday',
    'limited access to email', 'not in the office', 'currently traveling',
    'maternity leave', 'paternity leave', 'parental leave',
    'return on', 'be back on', 'will return on', 'returning on',
    'business travel', 'traveling abroad', 'i am traveling', 'will be traveling',
    'limited access', 'offline', 'currently offline',
    'slow to respond', 'delayed response',
    'taking time off', 'taking some time off', 'day off', 'days off',
    'office is closed', 'offices are closed',
  ]
  return patterns.some(p => t.includes(p))
}

function isNotInterested(text: string): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  const patterns = [
    'not interested', 'no thanks', 'no thank you', 'unsubscribe',
    'remove me', 'stop emailing', 'take me off', 'opt out',
    'do not contact', "don't contact", 'please remove',
    'not the right fit', 'not a good fit', 'pass on this',
    'already have a', "we're all set", 'we are all set',
    'not looking', 'please stop', 'cease', 'desist',
    'no need', 'not for us', 'no longer need',
    'fully remote', 'no physical office', 'no longer with',
    'left the company', 'left the organization',
  ]
  return patterns.some(p => t.includes(p))
}

function classifyReply(replyBody: string): string {
  if (isOOO(replyBody)) return 'OOO'
  if (isNotInterested(replyBody)) return 'Not Interested'
  return 'Interested'
}

// ---------------------------------------------------------------------------
// Google Sheets auth (JWT → access token, no SDK)
// ---------------------------------------------------------------------------

// Base64url encode for JWT
function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64urlString(str: string): string {
  return base64url(new TextEncoder().encode(str))
}

async function getGoogleAccessToken(serviceAccountKey: string): Promise<string> {
  const sa = JSON.parse(serviceAccountKey)

  const now = Math.floor(Date.now() / 1000)
  const header = base64urlString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64urlString(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))

  const signInput = `${header}.${payload}`

  // Import the private key for RS256 signing
  // Strip PEM markers first (contain valid base64 chars), then strip all non-base64
  const pemBase64 = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '')
  const rawBinary = atob(pemBase64)
  const binaryKey = new Uint8Array(rawBinary.length)
  for (let i = 0; i < rawBinary.length; i++) {
    binaryKey[i] = rawBinary.charCodeAt(i)
  }

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signInput))
  )

  const jwt = `${signInput}.${base64url(signature)}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Google OAuth failed: ${tokenRes.status} ${err}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

// ---------------------------------------------------------------------------
// Google Sheets helpers
// ---------------------------------------------------------------------------

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

interface SheetTab {
  title: string
  sheetId: number
}

async function getSheetTabs(spreadsheetId: string, accessToken: string): Promise<SheetTab[]> {
  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`)
  const data = await res.json()
  return data.sheets.map((s: any) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }))
}

interface FoundRow {
  tab: string
  sheetId: number
  rowIndex: number // 0-based
  currentStage: string
}

async function findLeadByEmail(
  spreadsheetId: string,
  accessToken: string,
  email: string,
  tabs: SheetTab[]
): Promise<FoundRow | null> {
  const emailLower = email.toLowerCase()

  // Only search city tabs
  const cityTabs = tabs.filter(t => CITY_TABS.includes(t.title))

  // Batch read Column A (Stage) and Column D (Email) from all city tabs
  const ranges = cityTabs.map(t => `'${t.title}'!A:D`)
  const rangeParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values:batchGet?${rangeParam}&majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Sheets batchGet error: ${res.status}`)
  const data = await res.json()

  for (let i = 0; i < cityTabs.length; i++) {
    const tab = cityTabs[i]
    const values = data.valueRanges?.[i]?.values || []
    // Skip header row (index 0), search from row 1
    for (let row = 1; row < values.length; row++) {
      const rowData = values[row] || []
      const cellEmail = (rowData[3] || '').toLowerCase().trim() // Column D = index 3
      if (cellEmail === emailLower) {
        return {
          tab: tab.title,
          sheetId: tab.sheetId,
          rowIndex: row, // 0-based (row 0 is header)
          currentStage: (rowData[0] || '').trim(), // Column A = index 0
        }
      }
    }
  }

  return null
}

async function updateLeadRow(
  spreadsheetId: string,
  accessToken: string,
  found: FoundRow,
  stage: string,
  replyDate: string | null,
  replyContent: string | null
): Promise<void> {
  const sheetRow = found.rowIndex + 1 // Convert to 1-based for Sheets API

  // Update Stage (Column A)
  await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/'${found.tab}'!A${sheetRow}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[stage]] }),
    }
  )

  // Update Reply Date (Q) and Reply Content (R) if provided
  if (replyDate || replyContent) {
    await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/'${found.tab}'!Q${sheetRow}:R${sheetRow}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[replyDate || '', replyContent || '']] }),
      }
    )
  }

  // Format Column A cell color
  const color = STAGE_COLORS[stage]
  if (color) {
    const textColor = DARK_STAGES.includes(stage)
      ? { red: 1, green: 1, blue: 1 }
      : { red: 0, green: 0, blue: 0 }

    await fetch(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          repeatCell: {
            range: {
              sheetId: found.sheetId,
              startRowIndex: found.rowIndex,
              endRowIndex: found.rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: color,
                textFormat: { bold: true, foregroundColor: textColor },
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        }],
      }),
    })
  }
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  )
  const expectedHex = Array.from(expected).map(b => b.toString(16).padStart(2, '0')).join('')
  return expectedHex === signature.toLowerCase()
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const payload = JSON.parse(rawBody)

    // Environment
    const webhookSecret = Deno.env.get('SMARTLEAD_WEBHOOK_SECRET')
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
    const spreadsheetId = Deno.env.get('GOOGLE_SHEETS_CRM_ID')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!serviceAccountKey || !spreadsheetId) {
      throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEETS_CRM_ID')
    }

    // Verify webhook signature (if secret is configured)
    if (webhookSecret) {
      const signature = req.headers.get('x-smartlead-signature') || ''
      if (signature) {
        const valid = await verifySignature(rawBody, signature, webhookSecret)
        if (!valid) {
          console.error('Invalid webhook signature')
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Idempotency check via Supabase
    const requestId = req.headers.get('x-request-id')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (requestId) {
      const { data: existing } = await supabase
        .from('smartlead_webhook_events')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle()

      if (existing) {
        console.log(`Duplicate webhook skipped: ${requestId}`)
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse event
    const eventType = payload.event || payload.type || ''
    const leadEmail = payload.lead?.email || payload.lead_email || ''
    const campaignId = payload.campaign_id || null
    const campaignName = payload.campaign_name || ''

    if (!eventType || !leadEmail) {
      console.error('Missing event type or lead email', { eventType, leadEmail })
      return new Response(
        JSON.stringify({ error: 'Missing event type or lead email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing: ${eventType} for ${leadEmail} (campaign: ${campaignName || campaignId})`)

    // Determine stage based on event type
    let stage: string
    let replyContent: string | null = null
    let replyDate: string | null = null

    switch (eventType) {
      case 'EMAIL_REPLIED': {
        const body = payload.reply?.body || payload.reply_body || ''
        replyContent = body.substring(0, 500) // Truncate for sheet cell
        replyDate = payload.reply?.received_at || payload.timestamp || new Date().toISOString()
        stage = classifyReply(body)
        break
      }
      case 'EMAIL_BOUNCED':
        stage = 'Bounced'
        break
      case 'LEAD_UNSUBSCRIBED':
        stage = 'Not Interested'
        break
      default:
        console.log(`Unhandled event type: ${eventType}`)
        return new Response(
          JSON.stringify({ success: true, message: `Ignored event: ${eventType}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Get Google Sheets access token — secret is raw JSON, no base64
    const accessToken = await getGoogleAccessToken(serviceAccountKey)

    // Find the lead in the CRM sheet
    const tabs = await getSheetTabs(spreadsheetId, accessToken)
    const found = await findLeadByEmail(spreadsheetId, accessToken, leadEmail, tabs)

    if (!found) {
      console.log(`Lead not found in CRM: ${leadEmail}`)
      // Still log the event even if lead isn't in our sheet
      if (requestId) {
        await supabase.from('smartlead_webhook_events').insert({
          request_id: requestId,
          event_type: eventType,
          lead_email: leadEmail,
          campaign_id: campaignId,
          stage_assigned: null,
        })
      }
      return new Response(
        JSON.stringify({ success: true, message: 'Lead not in CRM sheet' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Don't overwrite manually-set "Closed" stage
    if (found.currentStage === 'Closed') {
      console.log(`Skipping ${leadEmail} — stage is Closed (manual override)`)
      return new Response(
        JSON.stringify({ success: true, message: 'Lead is Closed, not overwriting' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the sheet row
    await updateLeadRow(spreadsheetId, accessToken, found, stage, replyDate, replyContent)

    console.log(`Updated ${leadEmail} in ${found.tab} row ${found.rowIndex + 1}: ${found.currentStage} → ${stage}`)

    // Log the event for idempotency and audit trail
    if (requestId || true) {
      await supabase.from('smartlead_webhook_events').insert({
        request_id: requestId || crypto.randomUUID(),
        event_type: eventType,
        lead_email: leadEmail,
        campaign_id: campaignId,
        stage_assigned: stage,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_email: leadEmail,
        tab: found.tab,
        row: found.rowIndex + 1,
        previous_stage: found.currentStage,
        new_stage: stage,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
