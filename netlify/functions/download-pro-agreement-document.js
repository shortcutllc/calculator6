/**
 * Download Pro Agreement Document — Netlify serverless function.
 *
 * GET ?agreementId=...&docIndex=0  → Fetch a signed document from DocuSeal server-side
 *                                     (using DOCUSEAL_API_KEY) and stream it back.
 *
 * The Agreements tab used to link straight to DocuSeal's own document URLs. Those
 * URLs require a DocuSeal-side session, so any teammate who'd never logged into
 * DocuSeal directly got `{"error":"Not authorized"}`. This proxies the fetch through
 * our backend, authenticated the same way the rest of this file already talks to
 * DocuSeal (X-Auth-Token), so only a valid Supabase session is required.
 *
 * Auth: Supabase JWT in Authorization header (Bearer token)
 */

import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function errorResponse(statusCode, message, code) {
  return jsonResponse(statusCode, { success: false, error: message, code });
}

async function validateAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Authorization required', code: 'AUTH_MISSING' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw { statusCode: 500, message: 'Server misconfigured', code: 'CONFIG_ERROR' };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw { statusCode: 401, message: 'Invalid or expired token', code: 'AUTH_INVALID' };
  }

  return { user, supabase };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  try {
    const { supabase } = await validateAuth(event);

    const params = event.queryStringParameters || {};
    const { agreementId } = params;
    const docIndex = parseInt(params.docIndex, 10) || 0;

    if (!agreementId) {
      return errorResponse(400, 'agreementId is required', 'VALIDATION_ERROR');
    }

    const docusealApiKey = process.env.DOCUSEAL_API_KEY;
    if (!docusealApiKey) {
      return errorResponse(500, 'DocuSeal not configured', 'CONFIG_ERROR');
    }

    const { data: agreement, error } = await supabase
      .from('pro_agreements')
      .select('documents_url, all_documents_urls, pro_name')
      .eq('id', agreementId)
      .single();

    if (error || !agreement) {
      return errorResponse(404, 'Agreement not found', 'NOT_FOUND');
    }

    const docs = agreement.all_documents_urls;
    let targetUrl;
    let fileName;

    if (Array.isArray(docs) && docs.length > 0) {
      const doc = docs[docIndex] || docs[0];
      targetUrl = doc.url;
      fileName = doc.name || `${agreement.pro_name || 'agreement'}.pdf`;
    } else {
      targetUrl = agreement.documents_url;
      fileName = `${agreement.pro_name || 'agreement'}.pdf`;
    }

    if (!targetUrl) {
      return errorResponse(404, 'No signed document available', 'NOT_FOUND');
    }

    const docResponse = await fetch(targetUrl, {
      headers: { 'X-Auth-Token': docusealApiKey }
    });

    if (!docResponse.ok) {
      console.error('DocuSeal document fetch failed:', docResponse.status, await docResponse.text());
      return errorResponse(502, 'Failed to fetch document from DocuSeal', 'DOCUSEAL_ERROR');
    }

    const contentType = docResponse.headers.get('content-type') || 'application/pdf';
    const arrayBuffer = await docResponse.arrayBuffer();
    const base64Body = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`
      },
      body: base64Body,
      isBase64Encoded: true
    };
  } catch (err) {
    if (err.statusCode && err.code) {
      return errorResponse(err.statusCode, err.message, err.code);
    }
    console.error('download-pro-agreement-document error:', err);
    return errorResponse(500, err.message || 'Internal server error', 'INTERNAL_ERROR');
  }
};
