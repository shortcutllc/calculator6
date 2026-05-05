-- Allow anon DELETE on workhuman_leads. Mirrors the existing INSERT/UPDATE
-- policies from 20260408000001_workhuman_leads_anon_insert.sql. Used by the
-- post-event consolidation scripts that physically remove walk-in duplicate
-- rows after merging their data into the canonical main lead.
-- 2026-05-05

CREATE POLICY "Allow delete for anon users" ON workhuman_leads
  FOR DELETE TO anon USING (true);
