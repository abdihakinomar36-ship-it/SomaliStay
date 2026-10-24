-- SomaliStay migration 0012: minimal public view of profile names
-- Review/report author names must be displayable to anonymous visitors,
-- but the profiles table (which contains phone numbers) stays locked.
-- The view exposes only id + full_name.

create or replace view public.profile_public as
  select id, full_name from public.profiles;

grant select on public.profile_public to anon, authenticated;
