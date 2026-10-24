-- SomaliStay migration 0009: refine role protection
-- guest -> partner promotion is harmless (it only means "has listings");
-- the security boundary is the admin role.

create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and (new.role = 'admin' or old.role = 'admin')
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'You are not allowed to change user roles';
  end if;
  return new;
end;
$$;
