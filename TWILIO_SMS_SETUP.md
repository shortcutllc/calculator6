# Twilio SMS Setup Guide

## Overview
This guide will help you set up Twilio SMS notifications for the headshot gallery system.

## Prerequisites
- Twilio Account (you mentioned you have one)
- Access to Supabase Dashboard
- Netlify CLI or Supabase CLI

## Step 1: Get Your Twilio Credentials

1. Log in to your Twilio Console: https://console.twilio.com/
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Get your **Twilio Phone Number** (or purchase one if you don't have one)
   - Go to Phone Numbers → Manage → Active Numbers
   - Or buy a new number: Phone Numbers → Buy a Number

## Step 2: Deploy the Supabase Edge Function

The SMS function has been created at `supabase/functions/send-sms/index.ts`

### Deploy using Supabase CLI:

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-sms

# Set the environment secrets
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid_here
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** The Twilio phone number must be in E.164 format (e.g., +12345678901)

## Step 3: Test the SMS Function

You can test the function using curl or the Supabase dashboard:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-sms' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"to":"+12345678901","employeeName":"Test User","galleryUrl":"https://proposals.getshortcut.co/gallery/test","eventName":"Test Event"}'
```

## Step 4: Verify Phone Number Format

The SMS system expects phone numbers in one of these formats:
- `+12345678901` (E.164 format with country code)
- `2345678901` (10-digit US number - will be converted to +1 prefix)
- `(234) 567-8901` (formatted - will be cleaned and converted)

The system automatically:
- Removes non-numeric characters (except +)
- Adds +1 prefix for US numbers if not present

## Step 5: Deploy to Production

After setting up the Twilio credentials and deploying the function:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

## How It Works

### For Admins and Photographers:

1. **SMS Button Visibility:**
   - Button appears when:
     - Employee has a phone number
     - Photos have been uploaded
     - Employee hasn't made a selection yet

2. **Sending SMS:**
   - Click "Send SMS Reminder" button
   - Confirm the phone number
   - SMS is sent with:
     - Employee's name
     - Gallery link (with custom URL if available)
     - Selection deadline (if set)
     - Friendly reminder message

3. **SMS Message Format:**
   ```
   Hi [Employee Name]! This is a friendly reminder to select your headshot photo for [Event Name].

   Please make your selection by [Deadline Date].

   View your gallery: [Gallery URL]

   - Shortcut
   ```

## Troubleshooting

### SMS Not Sending
1. Check Twilio credentials are set correctly
2. Verify phone number format
3. Check Supabase function logs: `supabase functions logs send-sms`
4. Ensure Twilio account has sufficient balance
5. Verify phone number is verified (if using Twilio trial account)

### Phone Number Issues
- **Trial Account:** Twilio trial accounts can only send to verified phone numbers
- **International:** For non-US numbers, update the phone formatting logic in the Edge Function
- **Invalid Format:** The system will show an error if the phone number is invalid

### Function Deployment Issues
```bash
# Check if function is deployed
supabase functions list

# View function logs
supabase functions logs send-sms --tail

# Redeploy if needed
supabase functions deploy send-sms --no-verify-jwt
```

## Cost Considerations

- **Twilio SMS Pricing:** ~$0.0075 per SMS for US numbers
- **Supabase Functions:** Free tier includes 500K function invocations/month
- For 67 employees, sending reminders costs approximately $0.50

## Security Notes

- Twilio credentials are stored as Supabase secrets (encrypted)
- SMS function requires Supabase authentication
- Phone numbers are validated before sending
- Rate limiting is handled by Twilio

## Support

If you encounter issues:
1. Check Twilio Console for delivery status
2. Review Supabase function logs
3. Verify all environment variables are set correctly
4. Test with a single phone number first
