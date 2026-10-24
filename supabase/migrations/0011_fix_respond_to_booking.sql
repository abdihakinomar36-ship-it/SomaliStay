-- SomaliStay migration 0011: fix variable reference in respond_to_booking
-- The accept branch updated `where id = v_booking_id` (nonexistent variable).
-- It now updates the row fetched and locked earlier in the function.

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

grant execute on function public.respond_to_booking(uuid, text, text) to authenticated;
