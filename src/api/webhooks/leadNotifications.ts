// Webhook endpoint for real-time lead notifications
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  old_record?: any;
}

interface NotificationConfig {
  slackWebhookUrl?: string;
  emailNotifications?: string[];
  discordWebhookUrl?: string;
}

const notificationConfig: NotificationConfig = {
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  emailNotifications: process.env.EMAIL_NOTIFICATIONS?.split(','),
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL
};

export async function handleWebhook(payload: WebhookPayload) {
  try {
    console.log('📡 Webhook received:', payload);

    if (payload.table === 'social_media_contact_requests' && payload.type === 'INSERT') {
      const lead = payload.record;
      
      // Send notifications
      await Promise.all([
        sendSlackNotification(lead),
        sendDiscordNotification(lead),
        sendEmailNotification(lead)
      ]);
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    throw error;
  }
}

async function sendSlackNotification(lead: any) {
  if (!notificationConfig.slackWebhookUrl) return;

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
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View in Admin'
            },
            url: `${process.env.APP_URL}/social-media-pages`,
            style: 'primary'
          }
        ]
      }
    ]
  };

  await fetch(notificationConfig.slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
}

async function sendDiscordNotification(lead: any) {
  if (!notificationConfig.discordWebhookUrl) return;

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
  };

  await fetch(notificationConfig.discordWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}

async function sendEmailNotification(lead: any) {
  if (!notificationConfig.emailNotifications?.length) return;

  // This would integrate with your email service (SendGrid, Mailgun, etc.)
  console.log('📧 Email notification would be sent to:', notificationConfig.emailNotifications);
  console.log('📧 Lead details:', {
    name: `${lead.first_name} ${lead.last_name}`,
    email: lead.email,
    platform: lead.platform,
    leadScore: lead.lead_score,
    company: lead.company
  });
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

// Bot protection helper
export function detectBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
    /googlebot/i, /bingbot/i, /yandexbot/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}
