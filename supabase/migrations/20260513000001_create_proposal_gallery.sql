-- ---------------------------------------------------------------------------
-- proposal_gallery — real photo/video gallery surfaced by the V2 GalleryCard.
--
-- One row per media asset. Tagged by service_type so the client viewer can
-- filter to the services present in the current proposal (e.g. show massage
-- + headshot media on a proposal that includes both, hide nails).
--
-- Storage bucket `proposal-gallery` is also provisioned here with public read
-- access — the V2 viewer renders these to anonymous clients via a shared link.
-- Writes are gated to authenticated users (staff).
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_gallery (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  poster_url text,
  duration_seconds integer,
  sort_order integer default 0,
  is_featured boolean default false,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_proposal_gallery_service_type
  on public.proposal_gallery (service_type)
  where is_published;
create index if not exists idx_proposal_gallery_sort
  on public.proposal_gallery (sort_order, created_at desc);

-- RLS — public read of published rows, authenticated write.
alter table public.proposal_gallery enable row level security;

drop policy if exists "proposal_gallery_public_read" on public.proposal_gallery;
create policy "proposal_gallery_public_read"
  on public.proposal_gallery for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "proposal_gallery_staff_write" on public.proposal_gallery;
create policy "proposal_gallery_staff_write"
  on public.proposal_gallery for all
  to authenticated
  using (true)
  with check (true);

-- Storage bucket. Public read so anon clients can fetch via shared links.
insert into storage.buckets (id, name, public)
values ('proposal-gallery', 'proposal-gallery', true)
on conflict (id) do update set public = true;

drop policy if exists "proposal_gallery_storage_read" on storage.objects;
create policy "proposal_gallery_storage_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'proposal-gallery');

drop policy if exists "proposal_gallery_storage_write" on storage.objects;
create policy "proposal_gallery_storage_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'proposal-gallery');

drop policy if exists "proposal_gallery_storage_update" on storage.objects;
create policy "proposal_gallery_storage_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'proposal-gallery');

drop policy if exists "proposal_gallery_storage_delete" on storage.objects;
create policy "proposal_gallery_storage_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'proposal-gallery');
