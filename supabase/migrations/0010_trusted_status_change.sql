-- SomaliStay migration 0010: allow RPC-driven status transitions
-- Server-side RPCs that already verified ownership may set a
-- transaction-local flag; direct table updates from API clients cannot.

create or replace function public.protect_hotel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and coalesce(current_setting('somalistay.trusted_status_change', true), '') <> 'true' then
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
  return new;
end;
$$;

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

  perform set_config('somalistay.trusted_status_change', 'true', true);

  update public.hotels
     set status = 'pending_review',
         submitted_at = now(),
         rejection_reason = null,
         updated_at = now()
   where id = p_hotel_id;

  perform set_config('somalistay.trusted_status_change', 'false', true);

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_owner, 'hotel.submitted', 'hotel', p_hotel_id::text, null);
  return 'pending_review';
end;
$$;

revoke execute on function public.submit_hotel_for_review(uuid) from public;
grant execute on function public.submit_hotel_for_review(uuid) to authenticated;
