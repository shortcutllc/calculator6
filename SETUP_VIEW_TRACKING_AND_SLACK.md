# Setup Guide: View Tracking & Slack Notifications

## Overview
This guide will help you set up:
1. **Database table** to track proposal views
2. **Slack notifications** for proposal events (view, edit, approve)

---

## Part 1: Database Setup

### Table to Add: `proposal_views`

**Purpose**: Tracks when clients view standalone proposals

**Table Structure**:
```sql
CREATE TABLE proposal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

**Columns**:
- `id` - Unique identifier (auto-generated UUID)
- `proposal_id` - Links to the proposals table (foreign key)
- `viewed_at` - Timestamp when the view occurred
- `ip_address` - Client's IP address (optional)
- `user_agent` - Browser/device info (optional)
- `created_at` - Record creation timestamp

**Security**:
- Public users can INSERT (to track views)
- Only authenticated users (staff) can SELECT (to view analytics)

**Indexes**:
- Index on `proposal_id` for fast lookups
- Index on `viewed_at` for time-based queries

---

## Part 2: Step-by-Step Setup

### Step 1: Apply Database Migration

You have two options to run the migration:

#### Option A: Using Supabase CLI (Recommended)

1. **Navigate to your project directory**:
   ```bash
   cd /Users/willnewton/Documents/GitHub/calculator6
   ```

2. **Link to your Supabase project** (if not already linked):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Apply the migration**:
   ```bash
   supabase db push
   ```
   
   This will apply all pending migrations including `20260107152604_create_proposal_views_tracking.sql`

#### Option B: Using Supabase Dashboard (Manual)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to**: SQL Editor (left sidebar)
4. **Click**: "New query"
5. **Copy and paste** the entire contents of:
   ```
   supabase/migrations/20260107152604_create_proposal_views_tracking.sql
   ```
6. **Click**: "Run" (or press Cmd+Enter / Ctrl+Enter)
7. **Verify** the migration ran successfully

---

### Step 2: Create Slack Webhook

1. **Go to Slack API**: https://api.slack.com/apps
2. **Click**: "Create New App" → "From scratch"
3. **Name your app**: "Proposal Notifications" (or any name)
4. **Select workspace**: Choose your workspace
5. **Click**: "Create App"

6. **Navigate to**: "Incoming Webhooks" (left sidebar)
7. **Toggle**: "Activate Incoming Webhooks" to ON
8. **Click**: "Add New Webhook to Workspace"
9. **Select channel**: Choose where you want notifications (e.g., #proposals, #notifications)
10. **Click**: "Allow"
11. **Copy the Webhook URL**: It will look like:
    ```
    https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
    ```
12. **Save this URL** - you'll need it in Step 3

---

### Step 3: Configure Netlify Environment Variable

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Select your site**: calculator6 (or your site name)
3. **Navigate to**: Site settings → Environment variables
4. **Click**: "Add a variable"
5. **Add the variable**:
   - **Key**: `SLACK_WEBHOOK_URL`
   - **Value**: (Paste the webhook URL from Step 2)
   - **Scopes**: 
     - ✅ Production
     - ✅ Deploy previews (optional)
     - ✅ Branch deploys (optional)
6. **Click**: "Save"
7. **Important**: If your site is already deployed, you may need to trigger a new deployment for the environment variable to take effect:
   - Go to: Deploys
   - Click: "Trigger deploy" → "Deploy site"

---

### Step 4: Verify Setup

#### Test 1: Database Table

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run this query** to verify the table exists:
   ```sql
   SELECT * FROM proposal_views LIMIT 1;
   ```
   - Should return an empty result (no error = table exists)

3. **Check table structure**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'proposal_views';
   ```
   - Should show all columns listed above

#### Test 2: Slack Notification Function

1. **Go to Netlify Dashboard** → Functions
2. **Verify** `proposal-event-notification` appears in the list
3. **Check** that it has been deployed (should show in recent deploys)

#### Test 3: End-to-End Test

1. **Open a proposal** in standalone view (client view, not admin):
   ```
   https://proposals.getshortcut.co/proposal/[PROPOSAL_ID]
   ```

2. **Expected behavior**:
   - ✅ View is recorded in `proposal_views` table
   - ✅ Slack notification appears in your channel

3. **Test approval** (if proposal is not yet approved):
   - Click "Approve Proposal" button
   - ✅ Slack notification appears with approval message

4. **Test changes** (if editing is enabled):
   - Make an edit to the proposal
   - Submit changes
   - ✅ Slack notification appears with changes message

---

## Part 3: Troubleshooting

### Issue: Migration Fails

**Error**: `relation "proposal_views" already exists`
- **Solution**: Table already exists, migration is safe (uses `IF NOT EXISTS`)

**Error**: `permission denied`
- **Solution**: Make sure you're using a database admin account or service role key

**Error**: `relation "proposals" does not exist`
- **Solution**: The `proposals` table must exist first. Check your existing migrations.

---

### Issue: Slack Notifications Not Working

**Symptom**: No messages appearing in Slack

**Check 1**: Verify webhook URL is correct
- Go to Netlify → Environment variables
- Ensure `SLACK_WEBHOOK_URL` is set correctly

**Check 2**: Test webhook manually
```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'
```
- Should post a message to your Slack channel

**Check 3**: Check Netlify function logs
- Go to Netlify Dashboard → Functions → `proposal-event-notification`
- Click "View logs"
- Look for error messages

**Check 4**: Verify function is deployed
- Go to Netlify Dashboard → Deploys
- Ensure latest deploy includes the function

**Check 5**: Verify client-side code
- Open browser console (F12)
- Look for errors when viewing a proposal
- Should see: "Error tracking proposal view" if there's an issue

---

### Issue: Views Not Being Tracked

**Symptom**: No records in `proposal_views` table

**Check 1**: Verify user is viewing as client (not admin)
- Admin views (with `user_id` set) are NOT tracked
- Only standalone client views are tracked

**Check 2**: Check browser console
- Open browser console (F12)
- Look for errors related to Supabase

**Check 3**: Verify RLS policies
```sql
-- Test if you can insert (should work for public)
INSERT INTO proposal_views (proposal_id) 
VALUES ('00000000-0000-0000-0000-000000000000');
```
- Should succeed (even if proposal doesn't exist)

**Check 4**: Verify proposal exists
```sql
SELECT id FROM proposals WHERE id = 'YOUR_PROPOSAL_ID';
```
- Should return a result

---

## Part 4: Viewing Tracked Data

### Query View Counts by Proposal

```sql
SELECT 
  p.id,
  p.client_name,
  COUNT(pv.id) as view_count,
  MAX(pv.viewed_at) as last_viewed_at
FROM proposals p
LEFT JOIN proposal_views pv ON p.id = pv.proposal_id
GROUP BY p.id, p.client_name
ORDER BY view_count DESC;
```

### Query Recent Views

```sql
SELECT 
  p.client_name,
  pv.viewed_at,
  pv.user_agent
FROM proposal_views pv
JOIN proposals p ON pv.proposal_id = p.id
ORDER BY pv.viewed_at DESC
LIMIT 50;
```

### Query Views by Date

```sql
SELECT 
  DATE(pv.viewed_at) as view_date,
  COUNT(*) as views_per_day
FROM proposal_views pv
GROUP BY DATE(pv.viewed_at)
ORDER BY view_date DESC;
```

---

## Summary

✅ **Database**: `proposal_views` table created and configured  
✅ **Slack**: Webhook configured in Netlify environment variables  
✅ **Function**: Netlify function deployed and ready  
✅ **Tracking**: Views, edits, and approvals are now tracked  

**Files Modified/Created**:
- ✅ `supabase/migrations/20260107152604_create_proposal_views_tracking.sql` (migration)
- ✅ `netlify/functions/proposal-event-notification.js` (Slack function)
- ✅ `src/components/StandaloneProposalViewer.tsx` (view tracking + notifications)
- ✅ `src/components/StandaloneMindfulnessProposalViewer.tsx` (view tracking + notifications)

---

## Next Steps

1. ✅ Apply the database migration
2. ✅ Set up Slack webhook
3. ✅ Add `SLACK_WEBHOOK_URL` to Netlify environment variables
4. ✅ Test with a real proposal
5. ✅ Monitor Slack channel for notifications

Questions? Check the troubleshooting section above or review the function logs in Netlify.
