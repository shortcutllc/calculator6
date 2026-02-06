/**
 * Slack Notifier — sends Block Kit notifications for proposal events.
 * Follows the pattern from proposal-event-notification.js.
 * Non-fatal: failures are logged but don't block the API response.
 */

const PROPOSAL_BASE_URL = 'https://proposals.getshortcut.co/proposal';

/**
 * Send a Slack notification when a proposal is created via API.
 *
 * @param {object} proposal - The created proposal record from Supabase
 * @param {object} proposalData - The ProposalData object
 * @returns {object} { slackNotified, error? }
 */
async function notifyProposalCreated(proposal, proposalData) {
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL_PROPOSALS;

  if (!SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL_PROPOSALS not configured, skipping notification');
    return { slackNotified: false, error: 'Webhook URL not configured' };
  }

  try {
    const proposalUrl = `${PROPOSAL_BASE_URL}/${proposal.id}`;
    const summary = proposalData.summary || {};

    const totalCostFormatted = formatCurrency(summary.totalEventCost);
    const appointmentsFormatted = typeof summary.totalAppointments === 'number'
      ? summary.totalAppointments.toString()
      : 'N/A';

    const datesFormatted = formatDates(proposalData.eventDates);
    const locationsFormatted = formatLocations(proposalData.locations);

    // Collect all service types for display
    const serviceTypes = extractServiceTypes(proposalData);
    const servicesFormatted = serviceTypes.length > 0
      ? serviceTypes.map(capitalizeFirst).join(', ')
      : 'N/A';

    const slackMessage = {
      text: `🤖 New Proposal Auto-Generated: ${proposalData.clientName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🤖 New Proposal Auto-Generated'
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Client:* ${proposalData.clientName}` },
            { type: 'mrkdwn', text: `*Services:* ${servicesFormatted}` },
            { type: 'mrkdwn', text: `*Total Cost:* ${totalCostFormatted}` },
            { type: 'mrkdwn', text: `*Appointments:* ${appointmentsFormatted}` },
            { type: 'mrkdwn', text: `*Locations:* ${locationsFormatted}` },
            { type: 'mrkdwn', text: `*Dates:* ${datesFormatted}` }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Proposal' },
              url: proposalUrl,
              style: 'primary'
            }
          ]
        }
      ]
    };

    // Add email field if available
    if (proposalData.clientEmail) {
      slackMessage.blocks[1].fields.push({
        type: 'mrkdwn',
        text: `*Email:* ${proposalData.clientEmail}`
      });
    }

    await sendSlackMessage(SLACK_WEBHOOK_URL, slackMessage);
    return { slackNotified: true };
  } catch (err) {
    console.error('Slack notification failed (create):', err.message);
    return { slackNotified: false, error: err.message };
  }
}

/**
 * Send a Slack notification when a proposal is edited via API.
 *
 * @param {object} proposal - The updated proposal record
 * @param {object} proposalData - The updated ProposalData
 * @param {Array} changesSummary - Array of { op, description } from the editor
 * @returns {object} { slackNotified, error? }
 */
async function notifyProposalEdited(proposal, proposalData, changesSummary) {
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL_PROPOSALS;

  if (!SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL_PROPOSALS not configured, skipping notification');
    return { slackNotified: false, error: 'Webhook URL not configured' };
  }

  try {
    const proposalUrl = `${PROPOSAL_BASE_URL}/${proposal.id}`;
    const summary = proposalData.summary || {};

    // Format changes as a bullet list
    const changesText = changesSummary.length > 0
      ? changesSummary.map(c => `• ${c.description}`).join('\n')
      : '• No specific changes recorded';

    const slackMessage = {
      text: `✏️ Proposal Updated via API: ${proposalData.clientName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✏️ Proposal Updated via API'
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Client:* ${proposalData.clientName}` },
            { type: 'mrkdwn', text: `*New Total:* ${formatCurrency(summary.totalEventCost)}` },
            { type: 'mrkdwn', text: `*Appointments:* ${summary.totalAppointments || 'N/A'}` },
            { type: 'mrkdwn', text: `*Status:* ${proposal.status || 'draft'}` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Changes:*\n${changesText}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Proposal' },
              url: proposalUrl,
              style: 'primary'
            }
          ]
        }
      ]
    };

    await sendSlackMessage(SLACK_WEBHOOK_URL, slackMessage);
    return { slackNotified: true };
  } catch (err) {
    console.error('Slack notification failed (edit):', err.message);
    return { slackNotified: false, error: err.message };
  }
}

// --- Helpers ---

async function sendSlackMessage(webhookUrl, message) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${response.statusText} - ${responseText}`);
  }
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'N/A';
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDates(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return 'TBD';
  const display = dates.slice(0, 3).join(', ');
  return dates.length > 3 ? `${display} +${dates.length - 3} more` : display;
}

function formatLocations(locations) {
  if (!Array.isArray(locations) || locations.length === 0) return 'TBD';
  const display = locations.slice(0, 2).join(', ');
  return locations.length > 2 ? `${display} +${locations.length - 2} more` : display;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractServiceTypes(proposalData) {
  const types = new Set();
  if (proposalData.services) {
    Object.values(proposalData.services).forEach(locationData => {
      Object.values(locationData).forEach(dateData => {
        if (dateData.services && Array.isArray(dateData.services)) {
          dateData.services.forEach(service => {
            if (service.serviceType) types.add(service.serviceType);
          });
        }
      });
    });
  }
  return Array.from(types);
}

export {
  notifyProposalCreated,
  notifyProposalEdited
};
