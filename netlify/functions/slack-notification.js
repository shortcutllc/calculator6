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
    const { lead } = JSON.parse(await req.text());
    
    // Get Slack webhook URL from environment variable
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
    
    if (!SLACK_WEBHOOK_URL) {
      console.error('SLACK_WEBHOOK_URL environment variable is not set');
      return new Response(JSON.stringify({ error: 'Slack webhook URL not configured' }), { status: 500 });
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

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } });
  } catch (error) {
    console.error('Slack notification error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } });
  }
};
