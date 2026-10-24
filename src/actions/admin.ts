"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

function localeFrom(formData: FormData): string {
  return String(formData.get("locale") ?? "so");
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("authRequired");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("notAuthorized");
  return { supabase, user };
}

export async function adminSetHotelStatusAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const hotelId = String(formData.get("hotelId"));
    const status = String(formData.get("status"));
    const note = String(formData.get("note") ?? "").trim();

    if (!["approved", "rejected", "suspended", "pending_review"].includes(status)) {
      return { ok: false, error: "generic" };
    }

    const { error } = await supabase.rpc("admin_set_hotel_status", {
      p_hotel_id: hotelId,
      p_status: status,
      p_note: note || null,
    });
    if (error) {
      const code = error.message.replace("Error executing function: ", "");
      return { ok: false, error: code === "not_authorized" ? "notAuthorized" : "generic" };
    }
    const locale = localeFrom(formData);
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/hotels`);
    revalidatePath(`/${locale}/hotels`);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    return { ok: false, error: msg === "notAuthorized" ? "notAuthorized" : "authRequired" };
  }
}

export async function adminSetUserRoleAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const userId = String(formData.get("userId"));
    const role = String(formData.get("role"));

    if (!["guest", "partner", "admin"].includes(role)) {
      return { ok: false, error: "generic" };
    }

    const { error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: userId,
      p_role: role,
    });
    if (error) {
      const code = error.message.replace("Error executing function: ", "");
      return { ok: false, error: code === "not_authorized" ? "notAuthorized" : "generic" };
    }
    revalidatePath(`/${localeFrom(formData)}/admin/users`);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    return { ok: false, error: msg === "notAuthorized" ? "notAuthorized" : "authRequired" };
  }
}

export async function adminResolveReportAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const reportId = String(formData.get("reportId"));
    const status = String(formData.get("status"));

    if (!["resolved", "dismissed"].includes(status)) {
      return { ok: false, error: "generic" };
    }

    const { error } = await supabase.rpc("admin_resolve_report", {
      p_report_id: reportId,
      p_status: status,
    });
    if (error) return { ok: false, error: "generic" };
    revalidatePath(`/${localeFrom(formData)}/admin/reports`);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    return { ok: false, error: msg === "notAuthorized" ? "notAuthorized" : "authRequired" };
  }
}
