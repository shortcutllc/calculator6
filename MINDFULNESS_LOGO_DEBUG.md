# Mindfulness Program Logo Handling - Debug Guide

## How Logo Handling Works

### 1. **Logo Upload (MindfulnessProgramModal)**
- Logo is uploaded to `client-logos` storage bucket (same as other systems)
- Logo URL is saved to `mindfulness_programs.client_logo_url` column
- Supports both file upload and URL paste

### 2. **Proposal Generation (MindfulnessProgramManager)**
- When generating a proposal, the system:
  1. Fetches the latest program data (including logo)
  2. Calls `generateMindfulnessProposalData()` which sets `clientLogoUrl: program.client_logo_url`
  3. Creates proposal with logo in both places:
     - `data.clientLogoUrl` (in JSONB data field)
     - `client_logo_url` (direct column on proposals table)

### 3. **Proposal Display (StandaloneMindfulnessProposalViewer)**
- Checks for logo in this order:
  1. `data.data?.clientLogoUrl` (from proposal's JSONB data)
  2. `data.client_logo_url` (from proposal's direct column)
  3. **NEW:** Fetches from linked `mindfulness_programs.client_logo_url` if not found in proposal

## Schema Verification

### Database Columns
- ✅ `mindfulness_programs.client_logo_url` (TEXT) - Added in migration `20250203000002_add_client_logo_to_mindfulness_programs.sql`
- ✅ `proposals.client_logo_url` (TEXT) - Added in migration `20250717025744_add_client_logo.sql`

### Storage Bucket
- ✅ `client-logos` bucket exists and is public for reads
- ✅ Policies allow authenticated users to upload/update/delete
- ✅ Policies allow public read access

## Comparison with Other Systems

### Holiday Pages / Generic Landing Pages
- Use `partnerLogoUrl` stored in JSONB `data` field
- Upload to `partner-logos` folder in storage
- Context handles upload via `uploadPartnerLogo()` function

### Proposals (Regular)
- Use `clientLogoUrl` in JSONB `data` field
- Use `client_logo_url` direct column
- Upload to `client-logos` bucket

### Mindfulness Programs
- Use `client_logo_url` in `mindfulness_programs` table
- Upload to `client-logos` bucket (same as proposals)
- Logo is copied to proposal when proposal is generated

## What to Check If Logo Still Not Working

### 1. **Check Database**
```sql
-- Verify logo is saved in mindfulness_programs
SELECT id, program_name, client_logo_url 
FROM mindfulness_programs 
WHERE client_logo_url IS NOT NULL;

-- Verify logo is in proposal
SELECT id, client_logo_url, data->>'clientLogoUrl' as data_logo
FROM proposals 
WHERE proposal_type = 'mindfulness-program';
```

### 2. **Check Storage Bucket**
- Verify `client-logos` bucket exists
- Check bucket policies allow public read
- Verify file was uploaded successfully

### 3. **Check Browser Console**
- Look for errors when loading logo image
- Check if logo URL is valid
- Verify CORS is not blocking the image

### 4. **Check Logo URL Format**
Logo URLs should look like:
```
https://[project].supabase.co/storage/v1/object/public/client-logos/logo-[timestamp].[ext]
```

### 5. **Common Issues**

**Issue:** Logo not showing in proposal
- **Fix:** The viewer now checks the program table as fallback
- **Check:** Ensure program has `client_logo_url` set

**Issue:** Logo upload fails
- **Check:** User must be authenticated
- **Check:** File must be < 5MB
- **Check:** File must be an image type

**Issue:** Logo shows in modal but not in proposal
- **Check:** Proposal was generated AFTER logo was added
- **Fix:** Regenerate proposal or the viewer will now fetch from program

## Recent Changes Made

1. ✅ Updated `StandaloneMindfulnessProposalViewer` to fetch logo from linked mindfulness program if not found in proposal
2. ✅ Verified logo upload uses correct `client-logos` bucket
3. ✅ Verified logo is properly passed through proposal generation chain

## Next Steps If Still Not Working

1. Check browser console for specific errors
2. Verify the logo URL in database is accessible
3. Test with a simple image URL (paste URL instead of upload)
4. Check if RLS policies are blocking access
5. Verify the proposal was created/updated after logo was added

