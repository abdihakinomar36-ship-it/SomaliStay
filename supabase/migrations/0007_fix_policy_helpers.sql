-- SomaliStay migration 0007: allow RLS policy helpers to execute
-- The policies on profiles/hotels/storage reference is_admin() and
-- storage_path_hotel_approved(); the calling roles need EXECUTE on them.
-- These functions are safe: they return booleans based on the caller's
-- own session (auth.uid()) and reveal no other data. All privileged
-- workflows (admin_*, create_booking_request, respond_to_booking, ...)
-- remain revoked from anon/authenticated and check permissions internally.

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.storage_path_hotel_approved(text) to anon, authenticated;
