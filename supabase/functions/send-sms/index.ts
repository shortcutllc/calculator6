import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

interface SMSRequest {
  to: string;
  employeeName: string;
  galleryUrl: string;
  eventName: string;
  deadline?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
      },
    });
  }

  try {
    const { to, employeeName, galleryUrl, eventName, deadline }: SMSRequest = await req.json();

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    if (!to || !employeeName || !galleryUrl) {
      throw new Error('Missing required fields: to, employeeName, galleryUrl');
    }

    // Format phone number (remove any non-numeric characters except +)
    const formattedPhone = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

    // Create SMS message
    let message = `Hi ${employeeName}! This is a friendly reminder to select your headshot photo for ${eventName}.\n\n`;
    
    if (deadline) {
      // Parse and format deadline
      const dateStr = deadline.split('T')[0];
      const [year, month, day] = dateStr.split('-');
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const formattedDeadline = localDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      message += `Please make your selection by ${formattedDeadline}.\n\n`;
    } else {
      message += `Please make your selection soon to ensure timely processing.\n\n`;
    }
    
    message += `View your gallery: ${galleryUrl}\n\n`;
    message += `- Shortcut`;

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append('To', formattedPhone);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error('Twilio error:', errorData);
      throw new Error(`Twilio API error: ${errorData.message || 'Unknown error'}`);
    }

    const result = await twilioResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        message: 'SMS sent successfully' 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
