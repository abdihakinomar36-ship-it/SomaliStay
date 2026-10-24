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

/** Submit a review for a confirmed, completed booking. */
export async function createReviewAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const hotelId = String(formData.get("hotelId"));
    const bookingId = String(formData.get("bookingId"));
    const rating = Number(formData.get("rating"));
    const comment = String(formData.get("comment") ?? "").trim();

    if (!rateLimit(`review:${user.id}`, 10, 60_000)) return { ok: false, error: "rateLimited" };
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: "generic" };
    }

    // eligibility is enforced by RLS: confirmed booking, own, stay completed
    const { error } = await supabase.from("reviews").insert({
      hotel_id: hotelId,
      guest_id: user.id,
      booking_id: bookingId,
      rating,
      comment: comment || null,
    });
    if (error) return { ok: false, error: "notAuthorized" };

    const locale = localeFrom(formData);
    revalidatePath(`/${locale}/hotels/${String(formData.get("slug") ?? "")}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

/** Submit a report or complaint. */
export async function createReportAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const hotelId = String(formData.get("hotelId") ?? "") || null;
    const bookingId = String(formData.get("bookingId") ?? "") || null;

    if (!rateLimit(`report:${user.id}`, 5, 60_000)) return { ok: false, error: "rateLimited" };
    if (subject.length < 3 || body.length < 10) return { ok: false, error: "generic" };

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      hotel_id: hotelId,
      booking_id: bookingId,
      subject,
      body,
    });
    if (error) return { ok: false, error: "generic" };
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}
