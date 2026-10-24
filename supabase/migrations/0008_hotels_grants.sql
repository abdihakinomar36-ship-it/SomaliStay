-- SomaliStay migration 0008: grants for hotel management by partners
-- (row-level rules in RLS policies still constrain what rows are affected)

grant insert on public.hotels to authenticated;
grant update on public.hotels to authenticated;
grant delete on public.hotels to authenticated;
