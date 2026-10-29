import { createClient } from '@supabase/supabase-js';
import { clientIncluded } from './lib/client-picks.js';

const SERVICE_LABELS = {
  massage: 'Massage', facial: 'Facials', nails: 'Nails', hair: 'Hair', makeup: 'Makeup',
  'hair-makeup': 'Hair + makeup', headshot: 'Headshots', 'headshot-hair-makeup': 'Hair + makeup for headshots',
  mindfulness: 'Mindfulness', 'sound-bath': 'Sound bath', yoga: 'Yoga', stretch: 'Assisted stretch',
  'crystal-sound-bath': 'Crystal sound bath', 'somatic-sound-bath': 'Somatic movement + sound bath',
  'stretch-mobility': 'Stretch & mobility', 'dance-cardio': 'Dance cardio', 'strength-sculpt': 'Strength & sculpt',
};

/** "Massage (chair)", "Mindfulness (30 min)" for the change-request alert. */
function serviceLabel(svc) {
  const name = SERVICE_LABELS[svc.serviceType] || svc.serviceType;
  if (svc.serviceType === 'massage' && svc.massageType && svc.massageType !== 'massage') return `${name} (${svc.massageType})`;
  if (svc.classLength) return `${name} (${svc.classLength} min)`;
  return name;
}

export default async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { eventType, proposalId, clientName, clientEmail, proposalType, totalCost, eventDates, locations, surveyResults, invoiceUrl, invoiceAmount } = JSON.parse(await req.text());

    if (!eventType) {
      throw new Error('eventType is required');
    }

    // Throttle view notifications: if a prior view was recorded for this
    // proposal within VIEW_NOTIFICATION_WINDOW_HOURS, suppress this Slack
    // ping. The view row is still written by the client for analytics.
    // Set VIEW_NOTIFICATION_WINDOW_HOURS=0 to disable throttling.
    if (eventType === 'view' && proposalId) {
      try {
        const windowHours = parseInt(process.env.VIEW_NOTIFICATION_WINDOW_HOURS || '24', 10);
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (windowHours > 0 && supabaseUrl && serviceRoleKey) {
          const supabase = createClient(supabaseUrl, serviceRoleKey);
          const now = Date.now();
          const cutoff = new Date(now - windowHours * 60 * 60 * 1000).toISOString();

          // The client awaits the proposal_views insert before calling this
          // function, so the just-inserted row is committed and visible by the
          // time we query. Total count >= 2 means there's at least one prior
          // view in the window — throttle. count <= 1 means this is the only
          // (or first-after-quiet) view — notify.
          const { count, error: countError } = await supabase
            .from('proposal_views')
            .select('*', { count: 'exact', head: true })
            .eq('proposal_id', proposalId)
            .gte('viewed_at', cutoff);

          if (!countError && (count || 0) > 1) {
            console.log(`View notification throttled for ${proposalId}: ${count} view(s) in last ${windowHours}h`);
            return new Response(JSON.stringify({ success: true, throttled: true, windowHours, priorViews: count }), { status: 200, headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
              } });
          }
        }
      } catch (throttleErr) {
        // Fail open — if the throttling check itself errors, send the notification.
        console.error('View throttling check failed, sending notification anyway:', throttleErr);
      }
    }

    // Get Slack webhook URL from environment variable
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
    
    if (!SLACK_WEBHOOK_URL) {
      console.error('SLACK_WEBHOOK_URL_PROPOSALS environment variable is not set');
      return new Response(JSON.stringify({ error: 'Slack webhook URL not configured' }), { status: 500, headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        } });
    }

    // Build proposal URL
    const proposalUrl = `https://proposals.getshortcut.co/proposal/${proposalId}`;
    const adminUrl = `https://proposals.getshortcut.co/proposal/${proposalId}`;

    // Determine emoji and message based on event type
    let emoji, headerText, color;
    switch (eventType) {
      case 'view':
        emoji = '👁️';
        headerText = 'Client Viewed Proposal';
        color = '#3b82f6'; // Blue
        break;
      case 'edit':
      case 'changes_submitted':
        emoji = '✏️';
        headerText = 'Client Submitted Changes';
        color = '#f59e0b'; // Amber
        break;
      case 'approve':
      case 'approved':
        emoji = '✅';
        headerText = 'Proposal Approved!';
        color = '#10b981'; // Green
        break;
      case 'survey_completed':
        emoji = '📋';
        headerText = 'Post-Event Survey Completed';
        color = '#8b5cf6'; // Purple
        break;
      case 'invoice_created':
        emoji = '💳';
        headerText = 'Invoice Sent';
        color = '#635BFF'; // Stripe indigo
        break;
      case 'invoice_paid':
        emoji = '💰';
        headerText = 'Invoice Paid!';
        color = '#10b981'; // Green
        break;
      default:
        emoji = '📄';
        headerText = 'Proposal Event';
        color = '#6b7280'; // Gray
    }

    const isInvoiceEvent = eventType === 'invoice_created' || eventType === 'invoice_paid';

    // Build fields based on event type
    let fields;
    if (isInvoiceEvent) {
      const amount = invoiceAmount !== undefined && invoiceAmount !== null
        ? `$${Number(invoiceAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'N/A';
      fields = [
        { type: 'mrkdwn', text: `*Client:* ${clientName || 'Unknown'}` },
        { type: 'mrkdwn', text: `*Email:* ${clientEmail || 'N/A'}` },
        { type: 'mrkdwn', text: `*Amount:* ${amount}` }
      ];
      if (invoiceUrl) {
        fields.push({ type: 'mrkdwn', text: `*Invoice:* <${invoiceUrl}|View Invoice>` });
      }
      if (proposalId) {
        const proposalUrl = `https://proposals.getshortcut.co/proposal/${proposalId}`;
        fields.push({ type: 'mrkdwn', text: `*Proposal:* <${proposalUrl}|View Proposal>` });
      }
    } else {
      // Format dates and locations for proposal events
      const datesFormatted = Array.isArray(eventDates) && eventDates.length > 0
        ? eventDates.slice(0, 3).join(', ') + (eventDates.length > 3 ? ` +${eventDates.length - 3} more` : '')
        : 'TBD';
      const locationsFormatted = Array.isArray(locations) && locations.length > 0
        ? locations.slice(0, 2).join(', ') + (locations.length > 2 ? ` +${locations.length - 2} more` : '')
        : 'TBD';

      fields = [
        { type: 'mrkdwn', text: `*Client:* ${clientName || 'Unknown'}` },
        { type: 'mrkdwn', text: `*Email:* ${clientEmail || 'N/A'}` },
        { type: 'mrkdwn', text: `*Proposal Type:* ${proposalType === 'mindfulness-program' ? 'Mindfulness Program' : 'Event Proposal'}` },
        { type: 'mrkdwn', text: `*Event:* ${eventType}` },
        { type: 'mrkdwn', text: `*Total Cost:* $${totalCost !== undefined && totalCost !== null ? Number(totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}` },
        { type: 'mrkdwn', text: `*Dates:* ${datesFormatted}` }
      ];
      if (locationsFormatted && locationsFormatted !== 'TBD') {
        fields.push({ type: 'mrkdwn', text: `*Locations:* ${locationsFormatted}` });
      }
    }

    // Build Slack message
    const slackMessage = {
      text: `${emoji} ${headerText}: ${clientName || 'Unknown Client'}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${headerText}`
          }
        },
        {
          type: 'section',
          fields
        }
      ]
    };

    // Add survey results section if this is a survey_completed event
    if (eventType === 'survey_completed' && surveyResults) {
      const surveyFields = [];
      
      // Parse office addresses if it's JSON
      let officeAddressDisplay = 'N/A';
      if (surveyResults.office_address) {
        try {
          const parsed = JSON.parse(surveyResults.office_address);
          if (typeof parsed === 'object') {
            officeAddressDisplay = Object.entries(parsed)
              .map(([location, address]) => `*${location}:* ${address}`)
              .join('\n');
          } else {
            officeAddressDisplay = surveyResults.office_address;
          }
        } catch {
          officeAddressDisplay = surveyResults.office_address;
        }
      }

      // Add survey fields
      if (surveyResults.table_or_chair_preference) {
        surveyFields.push({
          type: 'mrkdwn',
          text: `*Table/Chair Preference:* ${surveyResults.table_or_chair_preference}`
        });
      }
      
      if (surveyResults.preferred_gender) {
        surveyFields.push({
          type: 'mrkdwn',
          text: `*Preferred Gender:* ${surveyResults.preferred_gender}`
        });
      }
      
      if (officeAddressDisplay !== 'N/A') {
        surveyFields.push({
          type: 'mrkdwn',
          text: `*Office Address(es):*\n${officeAddressDisplay}`
        });
      }
      
      if (surveyResults.massage_space_name) {
        surveyFields.push({
          type: 'mrkdwn',
          text: `*Massage Space Name:* ${surveyResults.massage_space_name}`
        });
      }
      
      if (surveyResults.point_of_contact) {
        surveyFields.push({
          type: 'mrkdwn',
          text: `*Point of Contact:* ${surveyResults.point_of_contact}`
        });
      }
      
      if (surveyResults.billing_contact) {
        surveyFields.push({
          type: 'mrkdwn',
          text: `*Billing Contact:* ${surveyResults.billing_contact}`
        });
      }
      
      if (surveyResults.coi_required !== null && surveyResults.coi_required !== undefined) {
        surveyFields.push({
          type: 'mrkdwn',
          text: `*COI Required:* ${surveyResults.coi_required ? 'Yes' : 'No'}`
        });
      }

      // Add survey results as a new section
      if (surveyFields.length > 0) {
        slackMessage.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📋 Survey Results:*'
          }
        });
        
        // Split into multiple sections if we have more than 10 fields (Slack limit)
        for (let i = 0; i < surveyFields.length; i += 10) {
          slackMessage.blocks.push({
            type: 'section',
            fields: surveyFields.slice(i, i + 10)
          });
        }
      }
    }

    // A client's change request: their note and what the proposal holds now,
    // read from the row, so the alert says what they asked for instead of
    // just that something changed.
    if (eventType === 'changes_submitted' && proposalId) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: row } = await supabase
          .from('proposals')
          .select('data, customization')
          .eq('id', proposalId)
          .single();
        const d = row?.data || {};
        const who = row?.customization?.contactFirstName?.trim() || 'the client';
        const note = String(d.clientChangesNote || '').trim();
        if (note) {
          slackMessage.blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `*Note from ${who}:*\n>${note.slice(0, 2800).replace(/\n/g, '\n>')}` },
          });
        }
        const lines = [];
        Object.entries(d.services || {}).forEach(([loc, byDate]) => {
          Object.entries(byDate || {}).forEach(([date, day]) => {
            (day?.services || []).forEach((svc, i) => {
              const included = clientIncluded(d, loc, date, i, svc);
              const option = svc.pricingOptions?.[svc.selectedOption ?? 0]?.name;
              const cost = Number(svc.serviceCost || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
              lines.push(`${included ? '✅' : '⬜️'} ${loc}, ${date}: ${serviceLabel(svc)}${option ? ` (${option})` : ''}, ${cost}`);
            });
          });
        });
        if (lines.length) {
          slackMessage.blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `*What the proposal holds now* (✅ included, ⬜️ switched off):\n${lines.join('\n').slice(0, 2900)}` },
          });
        }
      } catch (err) {
        console.error('Could not add the client note to the alert:', err);
      }
    }

    // Send to Slack
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Slack webhook error:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        message: JSON.stringify(slackMessage, null, 2)
      });
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText} - ${responseText}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Slack notification sent successfully' }), { status: 200, headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } });
  } catch (error) {
    console.error('Proposal event notification error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to send Slack notification' }), { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } });
  }
};
