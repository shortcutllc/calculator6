/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { proposalId, clientName, totalCost, eventDates, locations } = await req.json();

    if (!proposalId) {
      throw new Error('Proposal ID is required');
    }

    // Email configuration
    const toEmail = 'will@getshortcut.co';
    const subject = `🎉 Proposal Approved: ${clientName}`;
    
    const eventDatesFormatted = Array.isArray(eventDates) 
      ? eventDates.map((date: string) => new Date(date).toLocaleDateString()).join(', ')
      : 'No dates specified';

    const locationsFormatted = Array.isArray(locations) 
      ? locations.join(', ')
      : 'No locations specified';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af; margin-bottom: 20px;">🎉 Proposal Approved!</h2>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #1e40af;">Client Details</h3>
          <p><strong>Client Name:</strong> ${clientName}</p>
          <p><strong>Total Cost:</strong> $${totalCost?.toFixed(2) || '0.00'}</p>
          <p><strong>Event Dates:</strong> ${eventDatesFormatted}</p>
          <p><strong>Locations:</strong> ${locationsFormatted}</p>
        </div>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #92400e;">Next Steps</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Review the approved proposal details</li>
            <li>Contact the client to confirm logistics</li>
            <li>Begin scheduling and preparation</li>
            <li>Send confirmation and next steps to client</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="https://proposals.getshortcut.co/proposal/${proposalId}" 
             style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Proposal Details
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
          This approval was submitted via the client portal.
        </p>
      </div>
    `;

    // Send email using SendGrid
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      throw new Error('Missing SENDGRID_API_KEY environment variable');
    }

    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail }],
            subject: subject,
          },
        ],
        from: { email: 'notifications@getshortcut.co', name: 'Shortcut Proposals' },
        content: [
          {
            type: 'text/html',
            value: emailBody,
          },
        ],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      throw new Error(`SendGrid error: ${errorText}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Approval notification sent successfully',
        proposalId
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in proposal-approval function:', {
      message: error.message,
      stack: error.stack,
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while processing the approval';

    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
}); 