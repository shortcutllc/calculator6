-- ---------------------------------------------------------------------------
-- recurringFrequency → optionsState backfill
--
-- V1 stored per-service recurring as
--   data.services[loc][date].services[idx].recurringFrequency.occurrences
--
-- V2's `useServiceSelections` hook reads
--   data.optionsState["${loc}|${date}|${idx}"].frequency
--
-- The hook already has a legacy fallback (Phase 2B) that reads the V1 field
-- if `optionsState` is missing, so this migration is **not required** for
-- correctness — it just normalizes the data so the legacy fallback can be
-- dropped in a future cleanup. Run it manually when you're ready; the rest
-- of the V2 surface keeps working either way.
--
-- WHAT IT DOES
--   For every proposal row whose `data.services` has at least one service
--   with `isRecurring = true` and `recurringFrequency.occurrences > 1`,
--   merges a fresh `data.optionsState` entry per such service so V2 reads
--   the same frequency without falling back. Existing entries are NOT
--   overwritten — if you've already manually set `optionsState[key].frequency`
--   the migration leaves it alone.
--
-- WHAT IT DOES NOT DO
--   It does not delete `recurringFrequency` from the source data — keep the
--   field around so V1 (still gated to `?redesign=0`) renders correctly while
--   the cutover is in flight. A second cleanup migration can drop the field
--   once V1 is retired.
--
-- USAGE
--   Run from the Supabase dashboard SQL editor, or:
--     supabase db push
-- ---------------------------------------------------------------------------

do $$
declare
  prow record;
  loc_key text;
  date_key text;
  svc_idx integer;
  svc jsonb;
  occ integer;
  selection_key text;
  new_state jsonb;
  next_data jsonb;
begin
  for prow in
    select id, data
    from public.proposals
    where data ? 'services'
      and jsonb_typeof(data->'services') = 'object'
  loop
    next_data := prow.data;
    -- Build a working copy of optionsState (empty object if missing).
    if next_data ? 'optionsState' and jsonb_typeof(next_data->'optionsState') = 'object' then
      new_state := next_data->'optionsState';
    else
      new_state := '{}'::jsonb;
    end if;

    -- Walk every location → date → service.
    for loc_key in select jsonb_object_keys(next_data->'services')
    loop
      for date_key in
        select jsonb_object_keys(next_data->'services'->loc_key)
        where jsonb_typeof(next_data->'services'->loc_key) = 'object'
      loop
        svc_idx := 0;
        for svc in
          select * from jsonb_array_elements(
            coalesce(next_data->'services'->loc_key->date_key->'services', '[]'::jsonb)
          )
        loop
          if (svc->>'isRecurring')::boolean
             and (svc->'recurringFrequency'->>'occurrences') is not null then
            occ := nullif((svc->'recurringFrequency'->>'occurrences'), '')::integer;
            if occ is not null and occ > 1 then
              selection_key := loc_key || '|' || date_key || '|' || svc_idx::text;
              -- Only set if not already present in optionsState. This keeps
              -- any client overrides untouched.
              if not (new_state ? selection_key) then
                new_state := new_state || jsonb_build_object(
                  selection_key,
                  jsonb_build_object('included', true, 'frequency', occ)
                );
              end if;
            end if;
          end if;
          svc_idx := svc_idx + 1;
        end loop;
      end loop;
    end loop;

    -- Only update if we actually added anything.
    if new_state <> coalesce(prow.data->'optionsState', '{}'::jsonb) then
      next_data := jsonb_set(next_data, '{optionsState}', new_state, true);
      update public.proposals
         set data = next_data,
             updated_at = now()
       where id = prow.id;
    end if;
  end loop;
end$$;
