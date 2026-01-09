# Mindfulness Program System - Supabase Tables

This document lists all the tables that need to be created in Supabase for the Mindfulness Program Management System.

## Migration Files

The tables are created via two migration files:

1. **`supabase/migrations/20250203000000_create_mindfulness_program_tables.sql`**
2. **`supabase/migrations/20250203000001_add_proposal_type_to_proposals.sql`**

## Tables to Create

### 1. `facilitators`
Stores facilitator information (Courtney Schulnick is the default facilitator).

**Columns:**
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255), NOT NULL)
- `email` (VARCHAR(255))
- `phone` (VARCHAR(50))
- `bio` (TEXT)
- `photo_url` (TEXT)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 2. `mindfulness_programs`
Main table for mindfulness programs.

**Columns:**
- `id` (UUID, Primary Key)
- `proposal_id` (UUID, Foreign Key → `proposals.id`)
- `program_name` (VARCHAR(255), NOT NULL)
- `facilitator_id` (UUID, Foreign Key → `facilitators.id`)
- `start_date` (DATE, NOT NULL)
- `end_date` (DATE, NOT NULL)
- `status` (VARCHAR(50), DEFAULT 'draft', CHECK: 'draft' | 'active' | 'completed' | 'archived')
- `total_participants` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 3. `participant_folders`
Stores participant information and their unique access tokens.

**Columns:**
- `id` (UUID, Primary Key)
- `program_id` (UUID, Foreign Key → `mindfulness_programs.id`, CASCADE DELETE)
- `participant_name` (VARCHAR(255), NOT NULL)
- `email` (VARCHAR(255), NOT NULL)
- `phone` (VARCHAR(50))
- `unique_token` (VARCHAR(255), UNIQUE, NOT NULL)
- `status` (VARCHAR(50), DEFAULT 'pending', CHECK: 'pending' | 'enrolled' | 'active' | 'completed')
- `notes` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 4. `program_documents`
Stores documents uploaded to participant folders (recordings, handouts, exercises).

**Columns:**
- `id` (UUID, Primary Key)
- `folder_id` (UUID, Foreign Key → `participant_folders.id`, CASCADE DELETE)
- `document_url` (TEXT, NOT NULL)
- `document_name` (VARCHAR(255))
- `document_type` (VARCHAR(50), CHECK: 'recording' | 'handout' | 'exercise' | 'other')
- `uploaded_by` (UUID, Foreign Key → `auth.users`)
- `uploaded_at` (TIMESTAMP WITH TIME ZONE)

### 5. `program_sessions`
Stores program session information (dates, times, content).

**Columns:**
- `id` (UUID, Primary Key)
- `program_id` (UUID, Foreign Key → `mindfulness_programs.id`, CASCADE DELETE)
- `session_number` (INTEGER, NOT NULL)
- `session_date` (DATE, NOT NULL)
- `session_time` (TIME)
- `session_duration_minutes` (INTEGER)
- `session_type` (VARCHAR(50), CHECK: 'in-person' | 'virtual')
- `session_title` (TEXT)
- `session_content` (TEXT)
- `location` (TEXT)
- `meeting_link` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- **UNIQUE CONSTRAINT:** `(program_id, session_number)`

### 6. `program_notifications`
Tracks notifications sent to participants (email, SMS, calendar invites).

**Columns:**
- `id` (UUID, Primary Key)
- `folder_id` (UUID, Foreign Key → `participant_folders.id`, CASCADE DELETE)
- `session_id` (UUID, Foreign Key → `program_sessions.id`, CASCADE DELETE)
- `notification_type` (VARCHAR(50), CHECK: 'email' | 'sms' | 'calendar_invite' | 'document_uploaded')
- `email_address` (VARCHAR(255))
- `phone_number` (VARCHAR(50))
- `message_content` (TEXT)
- `calendar_event_id` (TEXT)
- `status` (VARCHAR(50), DEFAULT 'sent', CHECK: 'pending' | 'sent' | 'failed' | 'delivered')
- `sent_at` (TIMESTAMP WITH TIME ZONE)

### 7. `facilitator_program_access`
Junction table for facilitator access to programs.

**Columns:**
- `id` (UUID, Primary Key)
- `facilitator_id` (UUID, Foreign Key → `facilitators.id`, CASCADE DELETE)
- `program_id` (UUID, Foreign Key → `mindfulness_programs.id`, CASCADE DELETE)
- `access_level` (VARCHAR(50), DEFAULT 'full', CHECK: 'read' | 'write' | 'full')
- `created_at` (TIMESTAMP WITH TIME ZONE)
- **UNIQUE CONSTRAINT:** `(facilitator_id, program_id)`

## Modified Tables

### `proposals` (existing table)
Added column:
- `proposal_type` (TEXT, DEFAULT 'event')
  - Values: 'event' (default) or 'mindfulness-program'

## Storage Buckets

### `mindfulness-program-documents`
Storage bucket for program documents (recordings, handouts, exercises).

- **Public:** false (private bucket)
- **Policies:**
  - Admin/facilitator: Full access
  - Public: Read-only access (for participant folder viewing)

## Indexes Created

All tables have appropriate indexes for performance:
- Status indexes
- Foreign key indexes
- Date indexes
- Token indexes (for participant folders)

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- **Admin access:** All authenticated users (admins)
- **Public read:** Participant folders, documents, and sessions (for token-based access)
- **Facilitator access:** Managed via `facilitator_program_access` table

## Default Data

The migration automatically inserts:
- **Courtney Schulnick** as the default facilitator

## How to Apply

Run the migration files in order:
1. `20250203000000_create_mindfulness_program_tables.sql`
2. `20250203000001_add_proposal_type_to_proposals.sql`

These can be applied via:
- Supabase Dashboard → SQL Editor
- Supabase CLI: `supabase migration up`
- Or manually copy/paste the SQL into Supabase SQL Editor



