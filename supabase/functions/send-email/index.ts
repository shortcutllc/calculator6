import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'gallery_ready' | 'final_photo_ready'
  employeeName: string
  employeeEmail: string
  galleryUrl: string
  eventName: string
  clientLogoUrl?: string
  selectionDeadline?: string
  selectionsAllowed?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, employeeName, employeeEmail, galleryUrl, eventName, clientLogoUrl, selectionDeadline, selectionsAllowed }: EmailRequest = await req.json()

    // Validate required fields
    if (!type || !employeeName || !employeeEmail || !galleryUrl || !eventName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get SendGrid API key from environment
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY not found in environment variables')
    }

    // Get from email from environment (use your existing email)
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'hello@getshortcut.co'

    // Create email content based on type
    let subject: string
    let html: string
    let text: string

    if (type === 'gallery_ready') {
      subject = `Your headshots are ready to pick`
      html = getGalleryReadyHtml(employeeName, galleryUrl, eventName, clientLogoUrl, selectionDeadline, selectionsAllowed)
      text = getGalleryReadyText(employeeName, galleryUrl, eventName, selectionDeadline, selectionsAllowed)
    } else {
      subject = `Your retouched headshot is ready`
      html = getFinalPhotoReadyHtml(employeeName, galleryUrl, eventName, clientLogoUrl)
      text = getFinalPhotoReadyText(employeeName, galleryUrl, eventName)
    }

    // Send email via SendGrid
    const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: employeeEmail, name: employeeName }],
            subject: subject,
          },
        ],
        from: {
          email: fromEmail,
          name: 'Shortcut Headshots',
        },
        content: [
          {
            type: 'text/plain',
            value: text,
          },
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`SendGrid API error: ${emailResponse.status} ${errorText}`)
    }

    // Log the notification in the database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the gallery ID from the URL (assuming format: /gallery/{token})
    const token = galleryUrl.split('/gallery/')[1]
    if (token) {
      const { data: gallery } = await supabase
        .from('employee_galleries')
        .select('id')
        .eq('unique_token', token)
        .single()

      if (gallery) {
        await supabase
          .from('headshot_notifications')
          .insert({
            gallery_id: gallery.id,
            type: type,
            email_address: employeeEmail,
            message_content: `${type === 'gallery_ready' ? 'Gallery ready' : 'Final photo ready'} notification sent to ${employeeName}`,
            status: 'sent'
          })
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/** Shared shell so both emails look like Shortcut. Table based for Outlook. */
function shell(bodyHtml: string, clientLogoUrl?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin:0; padding:0; background:#F1F6F5;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F6F5; padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#FFFFFF; border-radius:18px; overflow:hidden; box-shadow:0 10px 30px rgba(3,34,50,.06);">

              <tr>
                <td style="padding:22px 32px; border-bottom:1px solid #E2E9E8;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    ${clientLogoUrl ? `
                    <td style="padding-right:14px;">
                      <img src="${clientLogoUrl}" alt="" style="height:26px; width:auto; display:block;">
                    </td>
                    <td style="padding-right:14px; border-left:1px solid rgba(0,0,0,.1); height:22px;"></td>
                    ` : ''}
                    <td style="font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#003756; letter-spacing:-.01em;">
                      ${clientLogoUrl ? '<span style="color:rgba(3,34,50,.45); font-weight:600;">with </span>' : ''}Shortcut
                    </td>
                  </tr></table>
                </td>
              </tr>

              <tr><td style="padding:34px 32px 36px;">${bodyHtml}</td></tr>

              <tr>
                <td style="padding:22px 32px 28px; border-top:1px solid #E2E9E8;">
                  <p style="margin:0 0 6px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.5; color:#45596A;">
                    This link is yours alone. Please do not forward it.
                  </p>
                  <p style="margin:0; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.5; color:#45596A;">
                    Questions? <a href="mailto:hello@getshortcut.co" style="color:#003756; font-weight:700; text-decoration:none;">hello@getshortcut.co</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

function coralButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr>
      <td style="background:#FF5050; border-radius:999px;">
        <a href="${href}" style="display:inline-block; padding:14px 30px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none;">
          ${label}
        </a>
      </td>
    </tr></table>
  `
}

function prettyDate(selectionDeadline: string): string {
  const dateStr = selectionDeadline.split('T')[0]
  const [year, month, day] = dateStr.split('-')
  const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return localDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getGalleryReadyHtml(employeeName: string, galleryUrl: string, eventName: string, clientLogoUrl?: string, selectionDeadline?: string, selectionsAllowed = 1): string {
  const n = selectionsAllowed > 1 ? selectionsAllowed : 1
  const many = n > 1
  const firstName = employeeName.split(' ')[0] || employeeName

  const body = `
    <p style="margin:0 0 12px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:#45596A;">
      ${eventName}
    </p>
    <h1 style="margin:0 0 14px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:30px; line-height:1.12; font-weight:800; letter-spacing:-.02em; color:#003756;">
      Your headshots are ready.
    </h1>
    <p style="margin:0 0 18px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.55; color:#032232;">
      Hi ${firstName}. Your photos are up. Take a look and pick
      ${many ? `<strong style="color:#003756;">the ${n} you want us to retouch</strong>` : `<strong style="color:#003756;">the one you want us to retouch</strong>`}.
    </p>
    <p style="margin:0; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.55; color:#032232;">
      We will do the retouching and email you the ${many ? 'finals' : 'final'} to download. It takes a couple of minutes on your end.
    </p>

    ${coralButton(galleryUrl, many ? `Pick your ${n} photos` : 'Pick your photo')}

    ${selectionDeadline ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;">
      <tr><td style="background:#F1F6F5; border-radius:14px; padding:16px 18px;">
        <p style="margin:0; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; line-height:1.5; color:#032232;">
          Please choose by <strong style="color:#003756;">${prettyDate(selectionDeadline)}</strong> so we can get ${many ? 'them' : 'it'} retouched on time.
        </p>
      </td></tr>
    </table>
    ` : ''}
  `
  return shell(body, clientLogoUrl)
}

function getGalleryReadyText(employeeName: string, galleryUrl: string, eventName: string, selectionDeadline?: string, selectionsAllowed = 1): string {
  const n = selectionsAllowed > 1 ? selectionsAllowed : 1
  const many = n > 1
  const firstName = employeeName.split(' ')[0] || employeeName
  return `Your headshots are ready.

Hi ${firstName}. Your photos from ${eventName} are up. Take a look and pick ${many ? `the ${n} you want us to retouch` : 'the one you want us to retouch'}.

We will do the retouching and email you the ${many ? 'finals' : 'final'} to download.

${many ? `Pick your ${n} photos:` : 'Pick your photo:'} ${galleryUrl}
${selectionDeadline ? `
Please choose by ${prettyDate(selectionDeadline)} so we can get ${many ? 'them' : 'it'} retouched on time.
` : ''}
This link is yours alone. Please do not forward it.
Questions? hello@getshortcut.co
`
}

function getFinalPhotoReadyHtml(employeeName: string, galleryUrl: string, eventName: string, clientLogoUrl?: string): string {
  const firstName = employeeName.split(' ')[0] || employeeName
  const body = `
    <p style="margin:0 0 12px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:#45596A;">
      ${eventName}
    </p>
    <h1 style="margin:0 0 14px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:30px; line-height:1.12; font-weight:800; letter-spacing:-.02em; color:#003756;">
      Your headshot is ready.
    </h1>
    <p style="margin:0 0 18px; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.55; color:#032232;">
      Hi ${firstName}. Retouching is done. Your photo is ready to download in full resolution.
    </p>
    <p style="margin:0; font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.55; color:#032232;">
      Use it wherever you need it. LinkedIn, your email signature, the company site.
    </p>
    ${coralButton(galleryUrl, 'Download your headshot')}
  `
  return shell(body, clientLogoUrl)
}

function getFinalPhotoReadyText(employeeName: string, galleryUrl: string, eventName: string): string {
  const firstName = employeeName.split(' ')[0] || employeeName
  return `Your headshot is ready.

Hi ${firstName}. Retouching is done on your photo from ${eventName}. It is ready to download in full resolution.

Download it here: ${galleryUrl}

This link is yours alone. Please do not forward it.
Questions? hello@getshortcut.co
`
}