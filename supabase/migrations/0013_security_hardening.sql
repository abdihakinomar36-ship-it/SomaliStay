-- SomaliStay migration 0013: acceptance revalidation, storage ownership,
-- restricted public names view, participant profile access, RPC grant hygiene

-- ============ 1. respond_to_booking: revalidate availability at acceptance ============
-- A partner may block dates after a request was created; acceptance must
-- re-check blocked dates and that the hotel is still approved.
create or replace function public.respond_to_booking(
  p_booking_id uuid,
  p_decision text,
  p_note text
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_booking public.bookings%rowtype;
  v_room public.rooms%rowtype;
  v_hotel public.hotels%rowtype;
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  if p_decision not in ('accept','reject') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  select * into v_hotel from public.hotels where id = v_booking.hotel_id;
  if v_hotel.owner_id is null or v_hotel.owner_id <> v_owner then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_booking.status <> 'pending' then
    raise exception 'booking_not_pending' using errcode = 'P0003';
  end if;

  if p_decision = 'accept' then
    if v_hotel.status <> 'approved' then
      raise exception 'hotel_not_approved' using errcode = 'P0003';
    end if;

    select * into v_room from public.rooms where id = v_booking.room_id;
    if v_room.capacity < v_booking.guests then
      raise exception 'too_many_guests' using errcode = '22023';
    end if;

    if exists (
      select 1 from public.room_blocked_dates rbd
      where rbd.room_id = v_booking.room_id
        and rbd.date >= v_booking.check_in
        and rbd.date < v_booking.check_out
    ) then
      raise exception 'dates_blocked' using errcode = 'P0003';
    end if;

    begin
      update public.bookings
         set status = 'confirmed',
             owner_response = coalesce(p_note, ''),
             updated_at = now()
       where id = v_booking.id;
    exception
      when exclusion_violation or unique_violation then
        -- exclusion constraint: another confirmed booking overlaps these dates
        raise exception 'booking_conflict' using errcode = 'P0003';
    end;
    insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
    values (p_booking_id, 'pending', 'confirmed', v_owner, coalesce(p_note, ''));
    insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
    values (v_owner, 'booking.confirmed', 'booking', v_booking.reference, jsonb_build_object('note', p_note));
    return 'confirmed';
  else
    update public.bookings
       set status = 'rejected',
           owner_response = coalesce(p_note, ''),
           updated_at = now()
     where id = p_booking_id;
    insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
    values (p_booking_id, 'pending', 'rejected', v_owner, coalesce(p_note, ''));
    insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
    values (v_owner, 'booking.rejected', 'booking', v_booking.reference, jsonb_build_object('note', p_note));
    return 'rejected';
  end if;
end;
$$;

grant execute on function public.respond_to_booking(uuid, text, text) to authenticated;
revoke execute on function public.respond_to_booking(uuid, text, text) from public;

-- ============ 2. Profiles: participants and admins may read rows they interact with ============
-- Booking participants (guest <-> hotel owner) and admins need each other's
-- basic profile rows; RLS keeps everyone else out.
create policy "profiles_read_participants" on public.profiles
  for select to authenticated
  using (
    public.is_admin()
    or id = auth.uid()
    or exists (
      select 1
      from public.bookings b
      join public.hotels h on h.id = b.hotel_id
      where (b.guest_id = auth.uid() and h.owner_id = profiles.id)
         or (h.owner_id = auth.uid() and b.guest_id = profiles.id)
    )
    or exists (
      select 1 from public.booking_messages bm
      join public.bookings b on b.id = bm.booking_id
      join public.hotels h on h.id = b.hotel_id
      where bm.sender_id = profiles.id
        and (b.guest_id = auth.uid() or h.owner_id = auth.uid())
    )
  );

-- ============ 3. profile_public: only users with public activity ============
-- Anonymous visitors may only see names attached to public content:
-- authors of reviews on approved hotels, and owners of approved hotels.
create or replace view public.profile_public as
  select p.id, p.full_name
  from public.profiles p
  where exists (
    select 1 from public.reviews r
    join public.hotels rh on rh.id = r.hotel_id
    where r.guest_id = p.id and rh.status = 'approved'
  )
  or exists (
    select 1 from public.hotels h
    where h.owner_id = p.id and h.status = 'approved'
  );

grant select on public.profile_public to anon, authenticated;

-- ============ 4. Storage: full path ownership validation ============
-- Path is {owner_id}/{hotel_id}/{filename}. Both segments must be consistent:
-- the hotel must belong to the folder owner. Prevents partner A from writing
-- into partner B's hotel folder and thereby publishing via approval checks.

create or replace function public.storage_path_owner_matches(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hotels h
    where h.id::text = split_part(p, '/', 2)
      and h.owner_id::text = split_part(p, '/', 1)
  );
$$;

-- Uploads: owner folder AND hotel-in-folder must belong to the uploader
drop policy if exists "hotel_photos_owner_insert" on storage.objects;
create policy "hotel_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hotel-photos'
    and split_part(name, '/', 1) = auth.uid()::text
    and public.storage_path_owner_matches(name)
  );

-- Reads: owner folder (with consistent hotel), admins, or approved-hotel photos
-- with a consistent owner/hotel pair (for signed URLs)
create or replace function public.storage_path_hotel_approved(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hotels h
    where h.id::text = split_part(p, '/', 2)
      and h.owner_id::text = split_part(p, '/', 1)
      and h.status = 'approved'
  );
$$;

drop policy if exists "hotel_photos_select" on storage.objects;
create policy "hotel_photos_select" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'hotel-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.storage_path_owner_matches(name))
      or public.is_admin()
      or public.storage_path_hotel_approved(name)
    )
  );

-- Deletes/updates: owner folder with consistent hotel, or admins
drop policy if exists "hotel_photos_owner_delete" on storage.objects;
create policy "hotel_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hotel-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.storage_path_owner_matches(name))
      or public.is_admin()
    )
  );

drop policy if exists "hotel_photos_owner_update" on storage.objects;
create policy "hotel_photos_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'hotel-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.storage_path_owner_matches(name))
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'hotel-photos'
    and (
      (split_part(name, '/', 1) = auth.uid()::text and public.storage_path_owner_matches(name))
      or public.is_admin()
    )
  );

grant execute on function public.storage_path_owner_matches(text) to anon, authenticated;

-- ============ 5. RPC grant hygiene ============
-- Postgres grants EXECUTE to PUBLIC by default; narrow every RPC to the roles
-- that need it. Anon only keeps the intentionally public read helpers.
revoke execute on function public.create_booking_request(uuid, date, date, int, text, text, text, text) from public;
revoke execute on function public.respond_to_booking(uuid, text, text) from public;
revoke execute on function public.cancel_booking(uuid) from public;
revoke execute on function public.submit_hotel_for_review(uuid) from public;
revoke execute on function public.admin_set_hotel_status(uuid, text, text) from public;
revoke execute on function public.admin_set_user_role(uuid, text) from public;
revoke execute on function public.admin_resolve_report(uuid, text) from public;
revoke execute on function public.search_hotels(int, date, date, int, text, text[]) from public;
revoke execute on function public.check_room_availability(uuid, date, date, int) from public;

grant execute on function public.create_booking_request(uuid, date, date, int, text, text, text, text) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.submit_hotel_for_review(uuid) to authenticated;
grant execute on function public.admin_set_hotel_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;
-- intentionally public (read-only search helpers):
grant execute on function public.search_hotels(int, date, date, int, text, text[]) to anon, authenticated;
grant execute on function public.check_room_availability(uuid, date, date, int) to anon, authenticated;
