"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

export type ActionResult = { ok: boolean; error?: string; reference?: string; redirect?: string };

function localeFrom(formData: FormData): Locale {
  const l = String(formData.get("locale") ?? defaultLocale);
  return isLocale(l) ? l : defaultLocale;
}

/**
 * Only allow internal redirect targets: same-locale absolute paths,
 * no protocol-relative or external URLs.
 */
function safeNextPath(value: FormDataEntryValue | null, locale: Locale): string | null {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith(`/${locale}`) || raw.includes("//") || raw.includes(":")) return null;
  if (!/^\/[a-z]{2}(\/[^\s"']*)?$/.test(raw)) return null;
  return raw;
}

/** Where a user with the given role should land after signing in. */
function dashboardForRole(role: string, locale: Locale): string {
  if (role === "admin") return `/${locale}/admin`;
  if (role === "partner") return `/${locale}/partner`;
  return `/${locale}/guest`;
}

export async function signUpAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const locale = localeFrom(formData);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const intent = String(formData.get("intent") ?? "").trim() === "partner" ? "partner" : "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!rateLimit(`signup:${email}`, 5, 60_000)) {
    return { ok: false, error: "rateLimited" };
  }
  if (password.length < 8) {
    return { ok: false, error: "weakPassword" };
  }
  if (!email.includes("@") || fullName.length < 2) {
    return { ok: false, error: "generic" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, locale },
      // Carry the intended destination through the email-verification link.
      emailRedirectTo: intent
        ? `${siteUrl}/auth/callback?next=${encodeURIComponent(`/${locale}/partner/hotels/new`)}`
        : `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already")) return { ok: false, error: "emailTaken" };
    if (msg.includes("password")) return { ok: false, error: "weakPassword" };
    if (error.status === 429) return { ok: false, error: "rateLimited" };
    return { ok: false, error: "generic" };
  }

  // Session returned immediately (email confirmation disabled): go straight
  // to the intended destination. With confirmation enabled, data.session is
  // null and the user completes the flow through the email link.
  if (data.session) {
    redirect(intent ? `/${locale}/partner/hotels/new` : `/${locale}/guest`);
  }
  return { ok: true };
}

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const locale = localeFrom(formData);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"), locale);

  if (!rateLimit(`signin:${email}`, 10, 60_000)) {
    return { ok: false, error: "rateLimited" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { ok: false, error: "rateLimited" };
    return { ok: false, error: "invalidCredentials" };
  }

  if (next) redirect(next);

  // Route to the dashboard matching the user's role.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .single();
  redirect(dashboardForRole(profile?.role ?? "guest", locale));
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

/** Persist the visitor's language choice on their profile (signed-in users). */
export async function setPreferredLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ preferred_locale: locale })
    .eq("id", user.id);
}

/** Send a password-reset email. */
export async function requestPasswordResetAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const locale = localeFrom(formData);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!rateLimit(`reset:${email}`, 5, 60_000)) {
    return { ok: false, error: "rateLimited" };
  }
  if (!email.includes("@")) return { ok: false, error: "generic" };

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(`/${locale}/auth/reset-password`)}`,
  });
  if (error) {
    if (error.status === 429) return { ok: false, error: "rateLimited" };
    return { ok: false, error: "generic" };
  }
  return { ok: true };
}

/** Set a new password for the signed-in user (arrived via reset link). */
export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const locale = localeFrom(formData);
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { ok: false, error: "weakPassword" };
  if (password !== confirmPassword) return { ok: false, error: "passwordMismatch" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "authRequired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.message.toLowerCase().includes("password")) return { ok: false, error: "weakPassword" };
    return { ok: false, error: "generic" };
  }
  return { ok: true, redirect: `/${locale}/auth/sign-in?reset=1` };
}
