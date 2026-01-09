exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { eventType, proposalId, clientName, clientEmail, proposalType, totalCost, eventDates, locations, surveyResults } = JSON.parse(event.body);
    
    if (!eventType || !proposalId) {
      throw new Error('eventType and proposalId are required');
    }

    // Get Slack webhook URL from environment variable
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
    
    if (!SLACK_WEBHOOK_URL) {
      console.error('SLACK_WEBHOOK_URL_PROPOSALS environment variable is not set');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Slack webhook URL not configured' }),
      };
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
      default:
        emoji = '📄';
        headerText = 'Proposal Event';
        color = '#6b7280'; // Gray
    }

    // Format dates and locations
    const datesFormatted = Array.isArray(eventDates) && eventDates.length > 0
      ? eventDates.slice(0, 3).join(', ') + (eventDates.length > 3 ? ` +${eventDates.length - 3} more` : '')
      : 'TBD';
    
    const locationsFormatted = Array.isArray(locations) && locations.length > 0
      ? locations.slice(0, 2).join(', ') + (locations.length > 2 ? ` +${locations.length - 2} more` : '')
      : 'TBD';

    // Build Slack message - match working slack-notification.js format exactly
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
          fields: [
            {
              type: 'mrkdwn',
              text: `*Client:* ${clientName || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:* ${clientEmail || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Proposal Type:* ${proposalType === 'mindfulness-program' ? 'Mindfulness Program' : 'Event Proposal'}`
            },
            {
              type: 'mrkdwn',
              text: `*Event:* ${eventType}`
            },
            {
              type: 'mrkdwn',
              text: `*Total Cost:* $${totalCost !== undefined && totalCost !== null ? Number(totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Dates:* ${datesFormatted}`
            }
          ]
        }
      ]
    };

    // Add locations in same section if we have space (max 10 fields per section)
    if (locationsFormatted && locationsFormatted !== 'TBD') {
      slackMessage.blocks[1].fields.push({
        type: 'mrkdwn',
        text: `*Locations:* ${locationsFormatted}`
      });
    }

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

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true, message: 'Slack notification sent successfully' }),
    };
  } catch (error) {
    console.error('Proposal event notification error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message || 'Failed to send Slack notification' }),
    };
  }
};
