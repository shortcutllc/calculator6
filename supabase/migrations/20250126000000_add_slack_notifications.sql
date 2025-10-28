-- Add Slack notifications via Edge Function for social media contact requests
-- This trigger will call the lead-notifications Edge Function when a new lead is created

-- Create the function to call the Edge Function (using pg_net for HTTP requests)
CREATE OR REPLACE FUNCTION notify_slack_on_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  url text;
  payload jsonb;
BEGIN
  -- Construct the webhook payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'social_media_contact_requests',
    'record', jsonb_build_object(
      'id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'company', NEW.company,
      'location', NEW.location,
      'service_type', NEW.service_type,
      'event_date', NEW.event_date,
      'appointment_count', NEW.appointment_count,
      'message', NEW.message,
      'platform', NEW.platform,
      'campaign_id', NEW.campaign_id,
      'ad_set_id', NEW.ad_set_id,
      'ad_id', NEW.ad_id,
      'status', NEW.status,
      'utm_source', NEW.utm_source,
      'utm_medium', NEW.utm_medium,
      'utm_campaign', NEW.utm_campaign,
      'utm_term', NEW.utm_term,
      'utm_content', NEW.utm_content,
      'referrer', NEW.referrer,
      'user_agent', NEW.user_agent,
      'lead_score', NEW.lead_score,
      'conversion_value', NEW.conversion_value
    )
  );

  -- Get the Edge Function URL from environment or construct it
  -- This will be set in Supabase Dashboard as a secret
  url := current_setting('app.settings.edge_function_url', true);
  
  -- If URL is not set, try default Supabase Edge Function URL
  IF url IS NULL OR url = '' THEN
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/lead-notifications';
  END IF;

  -- Call the Edge Function asynchronously (using pg_net)
  -- Note: We use pg_net.post() for HTTP requests from within PostgreSQL
  PERFORM 
    net.http_post(
      url => COALESCE(url, 'https://your-project.supabase.co/functions/v1/lead-notifications'),
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body => payload::text,
      timeout_milliseconds => 5000
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the insert
    RAISE WARNING 'Failed to send Slack notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_slack_on_social_media_lead ON social_media_contact_requests;
CREATE TRIGGER trigger_notify_slack_on_social_media_lead
AFTER INSERT ON social_media_contact_requests
FOR EACH ROW
EXECUTE FUNCTION notify_slack_on_new_lead();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_slack_on_new_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_slack_on_new_lead() TO anon;

