"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "./auth";

function localeFrom(formData: FormData): string {
  return String(formData.get("locale") ?? "so");
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("authRequired");
  return { supabase, user };
}

/** Guest submits a booking request (status: pending). */
export async function createBookingRequestAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (!rateLimit(`booking:${user.id}`, 10, 60_000)) {
      return { ok: false, error: "rateLimited" };
    }

    const roomId = String(formData.get("roomId"));
    const checkIn = String(formData.get("checkIn") ?? "");
    const checkOut = String(formData.get("checkOut") ?? "");
    const guests = Number(formData.get("guests"));
    const contactName = String(formData.get("contactName") ?? "").trim();
    const contactPhone = String(formData.get("contactPhone") ?? "").trim();
    const contactEmail = String(formData.get("contactEmail") ?? "").trim();
    const specialRequests = String(formData.get("specialRequests") ?? "").trim();

    if (!roomId || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
      return { ok: false, error: "invalidDates" };
    }

    const { data: reference, error } = await supabase.rpc("create_booking_request", {
      p_room_id: roomId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_contact_name: contactName,
      p_contact_phone: contactPhone || null,
      p_contact_email: contactEmail || null,
      p_special_requests: specialRequests || null,
    });

    if (error) {
      const code = error.message.replace("Error executing function: ", "");
      const known = [
        "auth_required", "rate_limited", "invalid_dates", "dates_in_past",
        "too_many_nights", "invalid_guests", "too_many_guests", "invalid_contact",
        "room_not_found", "hotel_not_available", "dates_blocked", "room_unavailable",
      ];
      return { ok: false, error: known.includes(code) ? code : "generic" };
    }

    revalidatePath(`/${localeFrom(formData)}/guest`);
    return { ok: true, reference: reference ?? undefined };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

/** Guest cancels their own booking. */
export async function cancelBookingAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const bookingId = String(formData.get("bookingId"));
  const locale = localeFrom(formData);
  await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  revalidatePath(`/${locale}/guest`);
  revalidatePath(`/${locale}/guest/bookings/${bookingId}`);
}

/** Hotel owner accepts or declines a request. */
export async function respondToBookingAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const bookingId = String(formData.get("bookingId"));
    const decision = String(formData.get("decision"));
    const note = String(formData.get("note") ?? "").trim();

    if (!rateLimit(`respond:${user.id}`, 30, 60_000)) {
      return { ok: false, error: "rateLimited" };
    }
    if (!["accept", "reject"].includes(decision)) {
      return { ok: false, error: "generic" };
    }

    const { error } = await supabase.rpc("respond_to_booking", {
      p_booking_id: bookingId,
      p_decision: decision,
      p_note: note || null,
    });
    if (error) {
      const code = error.message.replace("Error executing function: ", "");
      const known = [
        "auth_required", "not_authorized", "booking_not_pending", "booking_not_found",
        "booking_conflict", "invalid_decision",
      ];
      return { ok: false, error: known.includes(code) ? code : "generic" };
    }
    revalidatePath(`/${localeFrom(formData)}/partner/bookings`);
    revalidatePath(`/${localeFrom(formData)}/partner`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

/** Participant sends a message on a booking thread. */
export async function sendBookingMessageAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const bookingId = String(formData.get("bookingId"));
    const body = String(formData.get("body") ?? "").trim();

    if (!rateLimit(`msg:${user.id}`, 30, 60_000)) return { ok: false, error: "rateLimited" };
    if (body.length < 1 || body.length > 2000) return { ok: false, error: "generic" };

    const { error } = await supabase.from("booking_messages").insert({
      booking_id: bookingId,
      sender_id: user.id,
      body,
    });
    if (error) return { ok: false, error: "notAuthorized" };
    revalidatePath(`/${localeFrom(formData)}/guest/bookings/${bookingId}`);
    revalidatePath(`/${localeFrom(formData)}/partner/bookings/${bookingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}
