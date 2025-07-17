import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { proposalId, clientEmail, clientName, shareNote } = await req.json()

    if (!proposalId || !clientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing proposalId or clientEmail' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get proposal data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get SendGrid API key
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({ error: 'SendGrid API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate shared proposal URL
    const proposalUrl = `${Deno.env.get('SITE_URL') || 'https://proposals.getshortcut.co'}/proposal/${proposalId}?shared=true`

    // Prepare email content with custom message
    const customMessage = shareNote ? `<p style="margin: 20px 0; line-height: 1.6;">${shareNote.replace(/\n/g, '<br>')}</p>` : '';

    const emailData = {
      personalizations: [
        {
          to: [{ email: clientEmail }],
          subject: `Your Proposal from Shortcut - ${clientName || proposal.data.clientName}`
        }
      ],
      from: { email: 'noreply@getshortcut.co', name: 'Shortcut Team' },
      content: [
        {
          type: 'text/html',
          value: `
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #175071; color: white; padding: 30px; text-align: center; }
                  .content { padding: 30px; background-color: #f9f9f9; }
                  .button { background-color: #175071; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                  .footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 14px; color: #666; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Your Proposal is Ready!</h1>
                  </div>
                  <div class="content">
                    ${customMessage}
                    <p>We're excited to share your custom wellness proposal with you!</p>
                    <p>Please click the button below to view your proposal:</p>
                    <div style="text-align: center;">
                      <a href="${proposalUrl}" class="button">View Your Proposal</a>
                    </div>
                    <p style="margin-top: 30px;">If you have any questions or need to make changes, please don't hesitate to reach out to us.</p>
                  </div>
                  <div class="footer">
                    <p>Best regards,<br>The Shortcut Team</p>
                    <p>This email was sent from a notification-only address that cannot accept incoming email. Please do not reply to this message.</p>
                  </div>
                </div>
              </body>
            </html>
          `
        }
      ]
    }

    // Send email via SendGrid
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text()
      console.error('SendGrid error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update proposal to mark as shared
    const { error: updateError } = await supabase
      .from('proposals')
      .update({ 
        is_shared: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)

    if (updateError) {
      console.error('Error updating proposal:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Proposal shared successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in proposal-share function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 