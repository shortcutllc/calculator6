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
    const { lead } = JSON.parse(event.body);
    
    // Get Slack webhook URL from environment variable
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
    
    if (!SLACK_WEBHOOK_URL) {
      console.error('SLACK_WEBHOOK_URL environment variable is not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Slack webhook URL not configured' }),
      };
    }
    
    const slackMessage = {
      text: `🎯 New Social Media Lead!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎯 New Social Media Lead!'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Name:* ${lead.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:* ${lead.email}`
            },
            {
              type: 'mrkdwn',
              text: `*Platform:* ${lead.platform}`
            },
            {
              type: 'mrkdwn',
              text: `*Lead Score:* ${lead.leadScore}/100`
            },
            {
              type: 'mrkdwn',
              text: `*Company:* ${lead.company || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Phone:* ${lead.phone || 'N/A'}`
            }
          ]
        }
      ]
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Slack notification error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
