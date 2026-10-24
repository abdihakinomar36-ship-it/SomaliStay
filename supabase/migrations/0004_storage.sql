-- SomaliStay migration 0004: storage bucket and photo access policies

-- Private bucket for hotel photos. Object paths: {owner_id}/{hotel_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hotel-photos', 'hotel-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Helper: is the hotel in storage path segment 2 approved?
create or replace function public.storage_path_hotel_approved(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hotels h
    where h.id::text = split_part(p, '/', 2)
      and h.status = 'approved'
  );
$$;

-- Uploads: authenticated users may only write inside their own folder
create policy "hotel_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hotel-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Reads: owner folder, admins, or photos of APPROVED hotels (for signed URLs)
create policy "hotel_photos_select" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'hotel-photos'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin()
      or public.storage_path_hotel_approved(name)
    )
  );

-- Deletes/updates: owner folder or admins
create policy "hotel_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hotel-photos'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "hotel_photos_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'hotel-photos'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'hotel-photos'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin()
    )
  );
