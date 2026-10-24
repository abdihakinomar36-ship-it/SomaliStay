"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";
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

// ---------- hotels ----------

export async function createHotelAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (!rateLimit(`hotel:${user.id}`, 10, 60_000)) return { ok: false, error: "rateLimited" };

    const name = String(formData.get("name") ?? "").trim();
    const cityId = Number(formData.get("cityId"));
    const description = String(formData.get("description") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const amenities = formData.getAll("amenities").map(String);

    if (name.length < 2 || !Number.isInteger(cityId) || cityId <= 0) {
      return { ok: false, error: "generic" };
    }

    const { data: hotel, error } = await supabase
      .from("hotels")
      .insert({
        owner_id: user.id,
        name,
        slug: slugify(name),
        description: description || null,
        city_id: cityId,
        address: address || null,
        region: region || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        amenities,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !hotel) return { ok: false, error: "generic" };
    revalidatePath(`/${localeFrom(formData)}/partner`);
    redirect(`/${localeFrom(formData)}/partner/hotels/${hotel.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { ok: false, error: "authRequired" };
  }
}

export async function updateHotelAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const hotelId = String(formData.get("hotelId"));
    const name = String(formData.get("name") ?? "").trim();
    const cityId = Number(formData.get("cityId"));
    const description = String(formData.get("description") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const amenities = formData.getAll("amenities").map(String);

    // ownership check (RLS also enforces)
    const { data: hotel } = await supabase
      .from("hotels")
      .select("id")
      .eq("id", hotelId)
      .eq("owner_id", user.id)
      .single();
    if (!hotel) return { ok: false, error: "notAuthorized" };

    if (name.length < 2 || !Number.isInteger(cityId) || cityId <= 0) {
      return { ok: false, error: "generic" };
    }

    const { error } = await supabase
      .from("hotels")
      .update({
        name,
        description: description || null,
        city_id: cityId,
        address: address || null,
        region: region || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        amenities,
      })
      .eq("id", hotelId);
    if (error) return { ok: false, error: "generic" };
    revalidatePath(`/${localeFrom(formData)}/partner`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

export async function submitHotelForReviewAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const hotelId = String(formData.get("hotelId"));

    // require at least one room and one photo before submission
    const [{ count: rooms }, { count: images }] = await Promise.all([
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId),
      supabase.from("hotel_images").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId),
    ]);
    if (!rooms || !images) return { ok: false, error: "submitInvalid" };

    const { error } = await supabase.rpc("submit_hotel_for_review", { p_hotel_id: hotelId });
    if (error) {
      if (error.message.includes("not_authorized")) return { ok: false, error: "notAuthorized" };
      return { ok: false, error: "generic" };
    }
    revalidatePath(`/${localeFrom(formData)}/partner`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

export async function deleteHotelAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const hotelId = String(formData.get("hotelId"));
  await supabase.from("hotels").delete().eq("id", hotelId).eq("owner_id", user.id);
  revalidatePath(`/${localeFrom(formData)}/partner`);
}

// ---------- rooms ----------

export async function saveRoomAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const roomId = String(formData.get("roomId") ?? "");
    const hotelId = String(formData.get("hotelId"));
    const name = String(formData.get("name") ?? "").trim();
    const roomType = String(formData.get("roomType") ?? "");
    const capacity = Number(formData.get("capacity"));
    const price = Number(formData.get("price"));
    const currency = String(formData.get("currency") ?? "USD");
    const description = String(formData.get("description") ?? "").trim();
    const amenities = formData.getAll("amenities").map(String);

    const { data: hotel } = await supabase
      .from("hotels")
      .select("id")
      .eq("id", hotelId)
      .eq("owner_id", user.id)
      .single();
    if (!hotel) return { ok: false, error: "notAuthorized" };

    if (
      name.length < 1 ||
      !["single", "double", "twin", "suite", "family", "deluxe"].includes(roomType) ||
      !Number.isInteger(capacity) || capacity < 1 || capacity > 12 ||
      !Number.isFinite(price) || price <= 0 || price > 100000 ||
      !["USD", "EUR", "GBP", "SOS", "KES", "AED", "ETB"].includes(currency)
    ) {
      return { ok: false, error: "generic" };
    }

    const values = {
      hotel_id: hotelId,
      name,
      room_type: roomType,
      capacity,
      price_per_night: price,
      currency,
      description: description || null,
      amenities,
    };

    const { error } = roomId
      ? await supabase.from("rooms").update(values).eq("id", roomId)
      : await supabase.from("rooms").insert(values);
    if (error) return { ok: false, error: "generic" };
    revalidatePath(`/${localeFrom(formData)}/partner/hotels/${hotelId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

export async function deleteRoomAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const roomId = String(formData.get("roomId"));
  const hotelId = String(formData.get("hotelId"));
  const { data: hotel } = await supabase
    .from("hotels")
    .select("id")
    .eq("id", hotelId)
    .eq("owner_id", user.id)
    .single();
  if (hotel) {
    await supabase.from("rooms").delete().eq("id", roomId).eq("hotel_id", hotelId);
  }
  revalidatePath(`/${localeFrom(formData)}/partner/hotels/${hotelId}`);
}

// ---------- images ----------

export async function recordImageAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const hotelId = String(formData.get("hotelId"));
    const storagePath = String(formData.get("storagePath") ?? "");
    const caption = String(formData.get("caption") ?? "").trim();

    if (!storagePath.startsWith(`${user.id}/`)) {
      return { ok: false, error: "notAuthorized" };
    }

    const { count } = await supabase
      .from("hotel_images")
      .select("id", { count: "exact", head: true })
      .eq("hotel_id", hotelId);
    const isFirst = !count;

    const { error } = await supabase.from("hotel_images").insert({
      hotel_id: hotelId,
      storage_path: storagePath,
      caption: caption || null,
      is_cover: isFirst,
      sort_order: count ?? 0,
      uploaded_by: user.id,
    });
    if (error) return { ok: false, error: "uploadFailed" };
    revalidatePath(`/${localeFrom(formData)}/partner/hotels/${hotelId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

export async function deleteImageAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const imageId = String(formData.get("imageId"));
  const hotelId = String(formData.get("hotelId"));
  const locale = localeFrom(formData);

  const { data: image } = await supabase
    .from("hotel_images")
    .select("id, storage_path")
    .eq("id", imageId)
    .single();
  if (image) {
    const { data: hotel } = await supabase
      .from("hotels")
      .select("id")
      .eq("id", hotelId)
      .eq("owner_id", user.id)
      .single();
    if (hotel) {
      await supabase.from("hotel_images").delete().eq("id", imageId);
      if (image.storage_path.startsWith(`${user.id}/`)) {
        await supabase.storage.from("hotel-photos").remove([image.storage_path]);
      }
    }
  }
  revalidatePath(`/${locale}/partner/hotels/${hotelId}`);
}

export async function setCoverImageAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const imageId = String(formData.get("imageId"));
  const hotelId = String(formData.get("hotelId"));
  const locale = localeFrom(formData);

  const { data: hotel } = await supabase
    .from("hotels")
    .select("id")
    .eq("id", hotelId)
    .eq("owner_id", user.id)
    .single();
  if (hotel) {
    await supabase.from("hotel_images").update({ is_cover: false }).eq("hotel_id", hotelId);
    await supabase.from("hotel_images").update({ is_cover: true }).eq("id", imageId);
  }
  revalidatePath(`/${locale}/partner/hotels/${hotelId}`);
}

// ---------- availability ----------

export async function blockDatesAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const roomId = String(formData.get("roomId"));
    const hotelId = String(formData.get("hotelId"));
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to <= from) {
      return { ok: false, error: "invalidDates" };
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, hotel:hotels!inner(owner_id)")
      .eq("id", roomId)
      .single();
    if (!room || (room.hotel as unknown as { owner_id: string }).owner_id !== user.id) {
      return { ok: false, error: "notAuthorized" };
    }

    // build the list of dates to block (max 90 days)
    const dates: string[] = [];
    const start = new Date(from + "T00:00:00Z");
    const end = new Date(to + "T00:00:00Z");
    for (let d = start; d <= end && dates.length < 90; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }

    const rows = dates.map((date) => ({ room_id: roomId, date, reason: reason || null }));
    const { error } = await supabase.from("room_blocked_dates").upsert(rows, {
      onConflict: "room_id,date",
    });
    if (error) return { ok: false, error: "generic" };
    revalidatePath(`/${localeFrom(formData)}/partner/hotels/${hotelId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "authRequired" };
  }
}

export async function unblockDatesAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const roomId = String(formData.get("roomId"));
  const hotelId = String(formData.get("hotelId"));
  const date = String(formData.get("date"));
  const locale = localeFrom(formData);

  const { data: room } = await supabase
    .from("rooms")
    .select("id, hotel:hotels!inner(owner_id)")
    .eq("id", roomId)
    .single();
  if (room && (room.hotel as unknown as { owner_id: string }).owner_id === user.id) {
    await supabase.from("room_blocked_dates").delete().eq("room_id", roomId).eq("date", date);
  }
  revalidatePath(`/${locale}/partner/hotels/${hotelId}`);
}
