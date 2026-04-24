-- Fix: workhuman_signups needs a policy for authenticated users (not just anon).
-- The CRM runs as authenticated once a teammate logs in, so inserts from the
-- Book-at-Booth modal were being silently rejected.
-- Mirror the workhuman_leads pattern.
-- 2026-04-22

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'workhuman_signups' and policyname = 'Allow all for authenticated users') then
    create policy "Allow all for authenticated users" on public.workhuman_signups
      for all to authenticated using (true) with check (true);
  end if;
end $$;
