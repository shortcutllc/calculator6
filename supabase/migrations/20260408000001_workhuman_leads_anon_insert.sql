-- Allow anonymous users to insert into workhuman_leads (public booking form)
CREATE POLICY "Allow insert for anon users" ON workhuman_leads
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous users to update existing leads (upsert on email conflict)
CREATE POLICY "Allow update for anon users" ON workhuman_leads
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
