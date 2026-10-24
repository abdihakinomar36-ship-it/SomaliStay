-- SomaliStay migration 0006: harden function privileges

-- Restrict security-definer workflows to authenticated users
-- (anon callers are rejected inside the functions anyway, but do not expose them).
revoke execute on function
  public.admin_resolve_report(uuid, text),
  public.admin_set_hotel_status(uuid, text, text),
  public.admin_set_user_role(uuid, text),
  public.cancel_booking(uuid),
  public.create_booking_request(uuid, date, date, int, text, text, text, text),
  public.respond_to_booking(uuid, text, text),
  public.submit_hotel_for_review(uuid),
  public.handle_new_user(),
  public.audit_hotel_status_change(),
  public.protect_profile_role(),
  public.protect_hotel(),
  public.flag_hotel_re_review(),
  public.promote_first_partner(),
  public.touch_updated_at(),
  public.user_role(),
  public.is_admin(),
  public.storage_path_hotel_approved(text),
  public.generate_booking_reference()
from public;

-- Internal helpers: never callable through the API
revoke execute on function
  public.protect_profile_role(),
  public.protect_hotel(),
  public.flag_hotel_re_review(),
  public.promote_first_partner(),
  public.touch_updated_at(),
  public.handle_new_user(),
  public.audit_hotel_status_change(),
  public.user_role(),
  public.is_admin(),
  public.storage_path_hotel_approved(text),
  public.generate_booking_reference()
from anon, authenticated;

-- Stable search paths for remaining mutable functions
alter function public.touch_updated_at() set search_path = public;
alter function public.generate_booking_reference() set search_path = public;
