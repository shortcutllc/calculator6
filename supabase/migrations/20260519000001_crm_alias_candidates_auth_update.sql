-- /education review page: let authenticated staff record approve/reject
-- decisions on the entity-resolution queue (status + decided_by/decided_at).
-- Reads were already allowed; this adds UPDATE. Internal triage tool —
-- row-level unrestricted; the page is PrivateRoute-gated.

create policy "crm_alias_candidates auth update"
  on public.crm_alias_candidates for update
  to authenticated using (true) with check (true);
