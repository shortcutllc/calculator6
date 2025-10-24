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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { type, table, record, old_record } = await req.json()

    console.log('📡 Webhook received:', { type, table, record })

    if (table === 'social_media_contact_requests' && type === 'INSERT') {
      const lead = record
      
      // Send Slack notification
      if (Deno.env.get('SLACK_WEBHOOK_URL')) {
        await sendSlackNotification(lead)
      }

      // Send Discord notification
      if (Deno.env.get('DISCORD_WEBHOOK_URL')) {
        await sendDiscordNotification(lead)
      }

      // Log for email notifications (would integrate with email service)
      console.log('📧 Email notification for lead:', {
        name: `${lead.first_name} ${lead.last_name}`,
        email: lead.email,
        platform: lead.platform,
        leadScore: lead.lead_score,
        company: lead.company
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function sendSlackNotification(lead: any) {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')
  if (!webhookUrl) return

  const message = {
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
            text: `*Name:* ${lead.first_name} ${lead.last_name}`
          },
          {
            type: 'mrkdwn',
            text: `*Email:* ${lead.email}`
          },
          {
            type: 'mrkdwn',
            text: `*Platform:* ${lead.platform.toUpperCase()}`
          },
          {
            type: 'mrkdwn',
            text: `*Lead Score:* ${lead.lead_score}/100`
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
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Campaign:* ${lead.utm_campaign || 'Direct'}\n*Source:* ${lead.utm_source || 'Unknown'}`
        }
      }
    ]
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  })
}

async function sendDiscordNotification(lead: any) {
  const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
  if (!webhookUrl) return

  const embed = {
    title: '🎯 New Social Media Lead!',
    color: lead.platform === 'linkedin' ? 0x0077B5 : 0x1877F2,
    fields: [
      { name: 'Name', value: `${lead.first_name} ${lead.last_name}`, inline: true },
      { name: 'Email', value: lead.email, inline: true },
      { name: 'Platform', value: lead.platform.toUpperCase(), inline: true },
      { name: 'Lead Score', value: `${lead.lead_score}/100`, inline: true },
      { name: 'Company', value: lead.company || 'N/A', inline: true },
      { name: 'Phone', value: lead.phone || 'N/A', inline: true },
      { name: 'Campaign', value: lead.utm_campaign || 'Direct', inline: true },
      { name: 'Source', value: lead.utm_source || 'Unknown', inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Social Media Lead System'
    }
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  })
}
