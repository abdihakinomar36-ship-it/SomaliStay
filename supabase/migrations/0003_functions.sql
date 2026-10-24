-- SomaliStay migration 0003: server-side workflows (RPCs)

-- ============ booking reference generator ============
create or replace function public.generate_booking_reference() returns text
language plpgsql as $$
declare
  ref text;
begin
  loop
    ref := 'SS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.bookings where reference = ref);
  end loop;
  return ref;
end;
$$;

-- ============ create a booking REQUEST (pending; reserves nothing) ============
create or replace function public.create_booking_request(
  p_room_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests int,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_special_requests text
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_room public.rooms%rowtype;
  v_hotel public.hotels%rowtype;
  v_guest uuid := auth.uid();
  v_nights int;
  v_ref text;
begin
  if v_guest is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;
  if p_check_in < current_date then
    raise exception 'dates_in_past' using errcode = '22023';
  end if;

  v_nights := p_check_out - p_check_in;
  if v_nights > 30 then
    raise exception 'too_many_nights' using errcode = '22023';
  end if;

  if p_guests is null or p_guests < 1 then
    raise exception 'invalid_guests' using errcode = '22023';
  end if;

  if p_contact_name is null or char_length(btrim(p_contact_name)) < 2 then
    raise exception 'invalid_contact' using errcode = '22023';
  end if;

  -- rate limit: max 10 booking requests per guest per hour
  if (select count(*) from public.bookings
      where guest_id = v_guest and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0004';
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  select * into v_hotel from public.hotels where id = v_room.hotel_id;
  if v_hotel.status <> 'approved' then
    raise exception 'hotel_not_available' using errcode = 'P0003';
  end if;

  if p_guests > v_room.capacity then
    raise exception 'too_many_guests' using errcode = '22023';
  end if;

  -- owner-blocked dates must not overlap the requested stay
  if exists (
    select 1 from public.room_blocked_dates rbd
    where rbd.room_id = v_room.id
      and rbd.date >= p_check_in and rbd.date < p_check_out
  ) then
    raise exception 'dates_blocked' using errcode = 'P0003';
  end if;

  -- best-effort conflict check (authoritative check happens on acceptance)
  if exists (
    select 1 from public.bookings b
    where b.room_id = v_room.id
      and b.status = 'confirmed'
      and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) then
    raise exception 'room_unavailable' using errcode = 'P0003';
  end if;

  v_ref := public.generate_booking_reference();

  insert into public.bookings (
    reference, hotel_id, room_id, guest_id, check_in, check_out, guests, nights,
    price_per_night, total_price, currency, status, special_requests,
    contact_name, contact_phone, contact_email
  ) values (
    v_ref, v_hotel.id, v_room.id, v_guest, p_check_in, p_check_out, p_guests, v_nights,
    v_room.price_per_night, v_room.price_per_night * v_nights, v_room.currency, 'pending',
    p_special_requests, btrim(p_contact_name), p_contact_phone, p_contact_email
  );

  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  values ((select id from public.bookings where reference = v_ref), null, 'pending', v_guest, 'request_created');

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_guest, 'booking.created', 'booking', v_ref, jsonb_build_object('hotel', v_hotel.name, 'room', v_room.name));

  return v_ref;
end;
$$;

-- ============ hotel owner accepts / rejects a request ============
create or replace function public.respond_to_booking(
  p_booking_id uuid,
  p_decision text,
  p_note text
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_booking public.bookings%rowtype;
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

  if not exists (
    select 1 from public.hotels h
    where h.id = v_booking.hotel_id and h.owner_id = v_owner
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_booking.status <> 'pending' then
    raise exception 'booking_not_pending' using errcode = 'P0003';
  end if;

  if p_decision = 'accept' then
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

-- ============ guest cancels their booking ============
create or replace function public.cancel_booking(p_booking_id uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_booking public.bookings%rowtype;
  v_guest uuid := auth.uid();
begin
  if v_guest is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;
  if v_booking.guest_id <> v_guest then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_booking.status not in ('pending','confirmed') then
    raise exception 'booking_not_cancellable' using errcode = 'P0003';
  end if;

  update public.bookings set status = 'cancelled', updated_at = now()
   where id = p_booking_id;
  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  values (p_booking_id, v_booking.status, 'cancelled', v_guest, 'guest_cancelled');
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_guest, 'booking.cancelled', 'booking', v_booking.reference, null);
  return 'cancelled';
end;
$$;

-- ============ partner submits hotel for review ============
create or replace function public.submit_hotel_for_review(p_hotel_id uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hotel public.hotels%rowtype;
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  select * into v_hotel from public.hotels where id = p_hotel_id;
  if not found then
    raise exception 'hotel_not_found' using errcode = 'P0002';
  end if;
  if v_hotel.owner_id <> v_owner then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_hotel.status not in ('draft','rejected') then
    raise exception 'invalid_status' using errcode = 'P0003';
  end if;

  update public.hotels
     set status = 'pending_review',
         submitted_at = now(),
         rejection_reason = null,
         updated_at = now()
   where id = p_hotel_id;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_owner, 'hotel.submitted', 'hotel', p_hotel_id::text, null);
  return 'pending_review';
end;
$$;

-- ============ public search ============
create or replace function public.search_hotels(
  p_city_id int default null,
  p_check_in date default null,
  p_check_out date default null,
  p_guests int default null,
  p_room_type text default null,
  p_amenities text[] default null
) returns table (hotel_id uuid, min_price numeric, available_rooms bigint)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if p_check_in is not null and p_check_out is not null and p_check_out <= p_check_in then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;

  return query
  select r.hotel_id,
         min(r.price_per_night) as min_price,
         count(*) as available_rooms
  from public.rooms r
  join public.hotels h on h.id = r.hotel_id
  where h.status = 'approved'
    and (p_city_id is null or h.city_id = p_city_id)
    and (p_guests is null or r.capacity >= p_guests)
    and (p_room_type is null or r.room_type = p_room_type)
    and (p_amenities is null or p_amenities <@ h.amenities)
    and (
      p_check_in is null or p_check_out is null
      or (
        not exists (
          select 1 from public.room_blocked_dates rbd
          where rbd.room_id = r.id
            and rbd.date >= p_check_in and rbd.date < p_check_out
        )
        and not exists (
          select 1 from public.bookings b
          where b.room_id = r.id
            and b.status = 'confirmed'
            and daterange(b.check_in, b.check_out, '[)')
              && daterange(p_check_in, p_check_out, '[)')
        )
      )
    )
  group by r.hotel_id;
end;
$$;

-- ============ room availability check (single room, date range) ============
create or replace function public.check_room_availability(
  p_room_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests int
) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if p_check_out <= p_check_in then
    return false;
  end if;
  if not exists (
    select 1 from public.rooms r
    join public.hotels h on h.id = r.hotel_id
    where r.id = p_room_id and h.status = 'approved'
      and (p_guests is null or r.capacity >= p_guests)
      and not exists (
        select 1 from public.room_blocked_dates rbd
        where rbd.room_id = r.id
          and rbd.date >= p_check_in and rbd.date < p_check_out
      )
      and not exists (
        select 1 from public.bookings b
        where b.room_id = r.id
          and b.status = 'confirmed'
          and daterange(b.check_in, b.check_out, '[)')
            && daterange(p_check_in, p_check_out, '[)')
      )
  ) then
    return false;
  end if;
  return true;
end;
$$;

-- ============ admin: change hotel status ============
create or replace function public.admin_set_hotel_status(
  p_hotel_id uuid,
  p_status text,
  p_note text
) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status not in ('approved','rejected','suspended','pending_review') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.hotels
     set status = p_status,
         admin_notes = coalesce(p_note, admin_notes),
         rejection_reason = case when p_status = 'rejected' then coalesce(p_note, 'Not specified') else rejection_reason end,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         needs_re_review = false,
         updated_at = now()
   where id = p_hotel_id;

  if not found then
    raise exception 'hotel_not_found' using errcode = 'P0002';
  end if;
  return p_status;
end;
$$;

-- ============ admin: set user role ============
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_role not in ('guest','partner','admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot_demote_self' using errcode = 'P0003';
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'user.role_changed', 'user', p_user_id::text, jsonb_build_object('role', p_role));
  return p_role;
end;
$$;

-- ============ admin: resolve a report ============
create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_status text
) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status not in ('resolved','dismissed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  update public.reports
     set status = p_status, resolved_at = now(), resolved_by = auth.uid()
   where id = p_report_id;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;
  return p_status;
end;
$$;

-- ============ execute grants ============
grant execute on function public.search_hotels(int, date, date, int, text, text[]) to anon, authenticated;
grant execute on function public.check_room_availability(uuid, date, date, int) to anon, authenticated;
grant execute on function public.create_booking_request(uuid, date, date, int, text, text, text, text) to authenticated;
grant execute on function public.respond_to_booking(uuid, text, text) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.submit_hotel_for_review(uuid) to authenticated;
grant execute on function public.admin_set_hotel_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;
