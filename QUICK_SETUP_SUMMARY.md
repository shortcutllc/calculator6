# Quick Setup Summary: View Tracking & Slack Notifications

## 📊 Database Table

### Table: `proposal_views`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `proposal_id` | uuid | Foreign key → `proposals.id` |
| `viewed_at` | timestamptz | When the view occurred |
| `ip_address` | text | Client IP (optional) |
| `user_agent` | text | Browser/device info (optional) |
| `created_at` | timestamptz | Record creation time |

**Relationships**: 
- Links to `proposals` table via `proposal_id`
- Cascades on delete (if proposal deleted, views are deleted)

**Security**:
- ✅ Public can INSERT (clients viewing proposals)
- ✅ Authenticated can SELECT (staff viewing analytics)

---

## 🚀 Quick Setup Steps

### 1️⃣ Run Database Migration

**Option A: Supabase CLI**
```bash
cd /Users/willnewton/Documents/GitHub/calculator6
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project → SQL Editor
3. Copy/paste contents of `supabase/migrations/20260107152604_create_proposal_views_tracking.sql`
4. Click "Run"

---

### 2️⃣ Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Create new app → "From scratch"
3. Name it "Proposal Notifications"
4. Go to "Incoming Webhooks" → Activate
5. "Add New Webhook to Workspace"
6. Choose channel (e.g., #proposals)
7. **Copy the webhook URL** (starts with `https://hooks.slack.com/services/...`)

---

### 3️⃣ Configure Netlify

1. Go to https://app.netlify.com
2. Select your site → Site settings → Environment variables
3. Add variable:
   - **Key**: `SLACK_WEBHOOK_URL`
   - **Value**: (paste webhook URL from step 2)
   - **Scopes**: ✅ Production
4. Save
5. **Trigger new deployment** (Deploys → Trigger deploy)

---

## ✅ Verification Checklist

- [ ] Database migration applied (check Supabase SQL Editor)
- [ ] `proposal_views` table exists
- [ ] Slack webhook created and URL copied
- [ ] `SLACK_WEBHOOK_URL` added to Netlify environment variables
- [ ] Netlify function deployed (`proposal-event-notification`)
- [ ] Test: View a proposal → Check Slack channel
- [ ] Test: Approve a proposal → Check Slack channel

---

## 🔍 Quick Verification Queries

**Check if table exists**:
```sql
SELECT * FROM proposal_views LIMIT 1;
```

**View recent proposal views**:
```sql
SELECT p.client_name, pv.viewed_at 
FROM proposal_views pv
JOIN proposals p ON pv.proposal_id = p.id
ORDER BY pv.viewed_at DESC
LIMIT 10;
```

**Count views per proposal**:
```sql
SELECT p.client_name, COUNT(pv.id) as view_count
FROM proposals p
LEFT JOIN proposal_views pv ON p.id = pv.proposal_id
GROUP BY p.id, p.client_name
ORDER BY view_count DESC;
```

---

## 📋 Files Modified/Created

✅ `supabase/migrations/20260107152604_create_proposal_views_tracking.sql` (new)  
✅ `netlify/functions/proposal-event-notification.js` (new)  
✅ `src/components/StandaloneProposalViewer.tsx` (modified)  
✅ `src/components/StandaloneMindfulnessProposalViewer.tsx` (modified)  

---

## 🎯 What Gets Tracked

### Events Tracked:
1. **View** 👁️ - When client first views a proposal
2. **Changes Submitted** ✏️ - When client submits edits
3. **Approved** ✅ - When client approves proposal

### Slack Notifications Include:
- Client name & email
- Proposal type (Event or Mindfulness Program)
- Total cost
- Event dates & locations
- Action buttons (View Proposal, Admin View)

---

## 🐛 Quick Troubleshooting

**No Slack notifications?**
→ Check `SLACK_WEBHOOK_URL` in Netlify environment variables

**Views not being tracked?**
→ Check browser console for errors
→ Verify proposal exists and is client view (not admin)

**Function not working?**
→ Check Netlify function logs (Functions → proposal-event-notification → View logs)

---

**For detailed setup instructions, see `SETUP_VIEW_TRACKING_AND_SLACK.md`**
