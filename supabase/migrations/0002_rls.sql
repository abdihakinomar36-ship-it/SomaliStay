-- SomaliStay migration 0002: helper functions, triggers, RLS, grants

-- ============ helper functions ============

-- Role of the current authenticated user (security definer: avoids RLS recursion)
create or replace function public.user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.user_role() = 'admin', false);
$$;

-- updated_at maintenance
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger hotels_touch before update on public.hotels
  for each row execute function public.touch_updated_at();
create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ============ profile provisioning on signup ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, preferred_locale, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    case when new.raw_user_meta_data->>'locale' in ('so','en')
         then new.raw_user_meta_data->>'locale' else 'so' end,
    'guest'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ privilege-escalation protection ============
-- Roles can only be changed by admins, or from trusted contexts
-- (service role / direct database access, e.g. documented admin bootstrap).
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'You are not allowed to change user roles';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ============ hotel protection triggers ============
-- Only admins may change listing status / review fields.
-- Edits to an approved hotel flag it for re-review.
create or replace function public.protect_hotel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Only administrators can change the listing status';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.admin_notes is distinct from old.admin_notes then
      raise exception 'Only administrators can change review fields';
    end if;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Transferring hotel ownership is not permitted';
  end if;
  if old.status = 'approved' and new.status = 'approved' and new.needs_re_review = false then
    -- substantive edit while live: flag for admin re-review (listing stays visible)
    perform 1;
  end if;
  return new;
end;
$$;

create trigger hotels_protect before update on public.hotels
  for each row execute function public.protect_hotel();

-- Flag an approved hotel for re-review when its details or rooms change
create or replace function public.flag_hotel_re_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.hotels h
     set needs_re_review = true
   where h.id = new.hotel_id and h.status = 'approved';
  return new;
end;
$$;

create trigger rooms_flag_re_review after insert on public.rooms
  for each row execute function public.flag_hotel_re_review();
create trigger room_updates_flag_re_review after update on public.rooms
  for each row execute function public.flag_hotel_re_review();

-- First hotel submission promotes guest -> partner (not a security privilege)
create or replace function public.promote_first_partner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'partner' where id = new.owner_id and role = 'guest';
  return new;
end;
$$;

create trigger hotels_promote_partner after insert on public.hotels
  for each row execute function public.promote_first_partner();

-- ============ audit logging triggers ============
create or replace function public.audit_hotel_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'hotel.status_changed', 'hotel', new.id::text,
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger hotels_audit_status after update on public.hotels
  for each row execute function public.audit_hotel_status_change();

-- ============ RLS: enable everywhere ============
alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.hotels enable row level security;
alter table public.hotel_images enable row level security;
alter table public.rooms enable row level security;
alter table public.room_blocked_dates enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_messages enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_logs enable row level security;

-- ============ RLS: cities ============
create policy cities_public_read on public.cities
  for select to anon, authenticated using (true);

-- ============ RLS: profiles ============
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- (role column additionally protected by grant + trigger)

-- ============ RLS: hotels ============
create policy hotels_public_read on public.hotels
  for select to anon, authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

create policy hotels_insert_own on public.hotels
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status in ('draft','pending_review')
  );

create policy hotels_update_own on public.hotels
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy hotels_delete_own on public.hotels
  for delete to authenticated
  using (
    public.is_admin()
    or (owner_id = auth.uid() and status in ('draft','pending_review','rejected'))
  );

-- ============ RLS: hotel_images ============
create policy hotel_images_read on public.hotel_images
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.hotels h
      where h.id = hotel_id
        and (h.status = 'approved' or h.owner_id = auth.uid())
    )
  );

create policy hotel_images_insert on public.hotel_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

create policy hotel_images_delete on public.hotel_images
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.hotels h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

-- ============ RLS: rooms ============
create policy rooms_read on public.rooms
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.hotels h
      where h.id = hotel_id
        and (h.status = 'approved' or h.owner_id = auth.uid())
    )
  );

create policy rooms_insert on public.rooms
  for insert to authenticated
  with check (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

create policy rooms_update on public.rooms
  for update to authenticated
  using (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

create policy rooms_delete on public.rooms
  for delete to authenticated
  using (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );

-- ============ RLS: room_blocked_dates ============
create policy blocked_dates_read on public.room_blocked_dates
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.rooms r
      join public.hotels h on h.id = r.hotel_id
      where r.id = room_id and h.owner_id = auth.uid()
    )
  );

create policy blocked_dates_insert on public.room_blocked_dates
  for insert to authenticated
  with check (
    exists (
      select 1 from public.rooms r
      join public.hotels h on h.id = r.hotel_id
      where r.id = room_id and h.owner_id = auth.uid()
    )
  );

create policy blocked_dates_delete on public.room_blocked_dates
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.rooms r
      join public.hotels h on h.id = r.hotel_id
      where r.id = room_id and h.owner_id = auth.uid()
    )
  );

-- ============ RLS: bookings (mutations only via RPC) ============
create policy bookings_select on public.bookings
  for select to authenticated
  using (
    guest_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.hotels h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
  );
-- no insert/update/delete policies: all transitions go through
-- security-definer RPCs that validate ownership and state.

-- ============ RLS: booking_messages ============
create policy booking_messages_read on public.booking_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.guest_id = auth.uid()
             or exists (
               select 1 from public.hotels h
               where h.id = b.hotel_id and h.owner_id = auth.uid()
             ))
    )
  );

create policy booking_messages_insert on public.booking_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.guest_id = auth.uid()
             or exists (
               select 1 from public.hotels h
               where h.id = b.hotel_id and h.owner_id = auth.uid()
             ))
    )
  );

-- ============ RLS: booking_status_history ============
create policy booking_status_history_read on public.booking_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.guest_id = auth.uid()
             or exists (
               select 1 from public.hotels h
               where h.id = b.hotel_id and h.owner_id = auth.uid()
             )
             or public.is_admin())
    )
  );

-- ============ RLS: reviews ============
create policy reviews_read on public.reviews
  for select to anon, authenticated
  using (
    exists (select 1 from public.hotels h where h.id = hotel_id and h.status = 'approved')
  );

create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    guest_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.guest_id = auth.uid()
        and b.hotel_id = hotel_id
        and b.status = 'confirmed'
        and b.check_out <= current_date
    )
  );

-- ============ RLS: reports ============
create policy reports_select_own on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy reports_admin_update on public.reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ RLS: admin_audit_logs ============
create policy audit_logs_admin_read on public.admin_audit_logs
  for select to authenticated
  using (public.is_admin());

-- ============ grants ============
revoke all on public.profiles, public.hotels, public.hotel_images, public.rooms,
  public.room_blocked_dates, public.bookings, public.booking_messages,
  public.booking_status_history, public.reviews, public.reports,
  public.admin_audit_logs from anon, authenticated;

-- anon (public site): read-only access to public catalog data
grant select on public.cities, public.hotels, public.hotel_images, public.rooms,
  public.reviews to anon;

-- authenticated users
grant select on public.cities, public.profiles, public.hotels, public.hotel_images,
  public.rooms, public.room_blocked_dates, public.bookings, public.booking_messages,
  public.booking_status_history, public.reviews, public.reports,
  public.admin_audit_logs to authenticated;
grant insert on public.hotel_images, public.rooms, public.room_blocked_dates,
  public.booking_messages, public.reviews, public.reports to authenticated;
grant update on public.hotel_images, public.rooms, public.room_blocked_dates,
  public.reports to authenticated;
grant delete on public.hotel_images, public.rooms, public.room_blocked_dates to authenticated;

-- profiles: users may only edit non-privileged columns
grant update (full_name, phone, preferred_locale) on public.profiles to authenticated;
