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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, employeeName, employeeEmail, galleryUrl, eventName, clientLogoUrl, selectionDeadline }: EmailRequest = await req.json()

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
      subject = `Your headshot photos are ready for selection - ${eventName}`
      html = getGalleryReadyHtml(employeeName, galleryUrl, eventName, clientLogoUrl, selectionDeadline)
      text = getGalleryReadyText(employeeName, galleryUrl, eventName, selectionDeadline)
    } else {
      subject = `Your retouched headshot is ready for download - ${eventName}`
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

function getGalleryReadyHtml(employeeName: string, galleryUrl: string, eventName: string, clientLogoUrl?: string, selectionDeadline?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Headshot Photos Are Ready</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: #45a049; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${clientLogoUrl ? `
        <div style="background: white; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
          <img src="${clientLogoUrl}" alt="Client Logo" style="height: 50px; width: auto; object-fit: contain;">
        </div>
        ` : ''}
        <div class="header">
          <h1>📸 Your Headshot Photos Are Ready!</h1>
          <p>Event: ${eventName}</p>
        </div>
        <div class="content">
          <h2>Hello ${employeeName}!</h2>
          <p>Great news! Your headshot photos from the <strong>${eventName}</strong> event are now ready for you to review and select your favorite.</p>
          
          <p>Please follow these steps:</p>
          <ol>
            <li>Click the button below to view your photos</li>
            <li>Review all the photos we captured</li>
            <li>Select the one you'd like us to retouch</li>
            <li>Confirm your selection</li>
          </ol>
          
          <p>Once you make your selection, we'll begin retouching your chosen photo and notify you when it's ready for download.</p>
          
          ${selectionDeadline ? `
          <div style="background: #fef3cd; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">
              ⏰ Important: Please make your selection by ${(() => {
                const dateStr = selectionDeadline.split('T')[0];
                const [year, month, day] = dateStr.split('-');
                const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return localDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              })()} to ensure we can process your retouched photo in a timely manner.
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${galleryUrl}" class="button">View Your Photos</a>
          </div>
          
          ${selectionDeadline ? `
          <p><strong>Important:</strong> Please make your selection by ${(() => {
            const dateStr = selectionDeadline.split('T')[0];
            const [year, month, day] = dateStr.split('-');
            const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return localDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          })()} to ensure we can process your retouched photo in a timely manner.</p>
          ` : `
          <p><strong>Important:</strong> Please make your selection within 7 days to ensure we can process your retouched photo in a timely manner.</p>
          `}
        </div>
        <div class="footer">
          <p>If you have any questions, please contact us.</p>
          <p>This link is unique to you - please do not share it with others.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getGalleryReadyText(employeeName: string, galleryUrl: string, eventName: string, selectionDeadline?: string): string {
  return `
    Your Headshot Photos Are Ready!
    
    Hello ${employeeName}!
    
    Great news! Your headshot photos from the ${eventName} event are now ready for you to review and select your favorite.
    
    Please follow these steps:
    1. Visit your gallery: ${galleryUrl}
    2. Review all the photos we captured
    3. Select the one you'd like us to retouch
    4. Confirm your selection
    
    Once you make your selection, we'll begin retouching your chosen photo and notify you when it's ready for download.
    
    ${selectionDeadline ? `Important: Please make your selection by ${(() => {
      const dateStr = selectionDeadline.split('T')[0];
      const [year, month, day] = dateStr.split('-');
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return localDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    })()} to ensure we can process your retouched photo in a timely manner.` : 'Important: Please make your selection within 7 days to ensure we can process your retouched photo in a timely manner.'}
    
    If you have any questions, please contact us.
    This link is unique to you - please do not share it with others.
  `
}

function getFinalPhotoReadyHtml(employeeName: string, galleryUrl: string, eventName: string, clientLogoUrl?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Retouched Headshot Is Ready</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: #1976D2; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .highlight { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        ${clientLogoUrl ? `
        <div style="background: white; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
          <img src="${clientLogoUrl}" alt="Client Logo" style="height: 50px; width: auto; object-fit: contain;">
        </div>
        ` : ''}
        <div class="header">
          <h1>🎉 Your Retouched Headshot Is Ready!</h1>
          <p>Event: ${eventName}</p>
        </div>
        <div class="content">
          <h2>Hello ${employeeName}!</h2>
          <p>Excellent news! Your retouched headshot from the <strong>${eventName}</strong> event is now ready for download.</p>
          
          <div class="highlight">
            <p><strong>✨ Your professional headshot has been retouched and is ready for use!</strong></p>
          </div>
          
          <p>Please follow these steps to download your photo:</p>
          <ol>
            <li>Click the button below to access your gallery</li>
            <li>Look for your final retouched photo (it will be clearly marked)</li>
            <li>Click the download button to save it to your device</li>
          </ol>
          
          <div style="text-align: center;">
            <a href="${galleryUrl}" class="button">Download Your Photo</a>
          </div>
          
          <p><strong>Photo Details:</strong></p>
          <ul>
            <li>High-resolution JPEG format</li>
            <li>Professional retouching completed</li>
            <li>Ready for professional use</li>
          </ul>
          
          <p>Thank you for participating in our headshot event! We hope you love your new professional photo.</p>
        </div>
        <div class="footer">
          <p>If you have any questions or need assistance, please contact us.</p>
          <p>This link is unique to you - please do not share it with others.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getFinalPhotoReadyText(employeeName: string, galleryUrl: string, eventName: string): string {
  return `
    Your Retouched Headshot Is Ready!
    
    Hello ${employeeName}!
    
    Excellent news! Your retouched headshot from the ${eventName} event is now ready for download.
    
    ✨ Your professional headshot has been retouched and is ready for use!
    
    Please follow these steps to download your photo:
    1. Visit your gallery: ${galleryUrl}
    2. Look for your final retouched photo (it will be clearly marked)
    3. Click the download button to save it to your device
    
    Photo Details:
    - High-resolution JPEG format
    - Professional retouching completed
    - Ready for professional use
    
    Thank you for participating in our headshot event! We hope you love your new professional photo.
    
    If you have any questions or need assistance, please contact us.
    This link is unique to you - please do not share it with others.
  `
}
