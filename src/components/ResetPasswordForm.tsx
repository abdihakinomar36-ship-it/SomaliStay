"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { resetPasswordAction } from "@/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function ResetPasswordForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useFormState(resetPasswordAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state && state.ok && state.redirect) {
      router.push(state.redirect);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label" htmlFor="rp-password">{t.auth.newPassword}</label>
        <input id="rp-password" name="password" type="password" className="input" minLength={8} autoComplete="new-password" required />
        <p className="mt-1 text-xs text-slate-400">{t.auth.passwordTooShort}</p>
      </div>
      <div>
        <label className="label" htmlFor="rp-confirm">{t.auth.confirmPassword}</label>
        <input id="rp-confirm" name="confirmPassword" type="password" className="input" minLength={8} autoComplete="new-password" required />
      </div>
      {state && !state.ok && state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error === "weakPassword"
            ? t.auth.passwordTooShort
            : state.error === "passwordMismatch"
              ? t.auth.passwordMismatch
              : state.error === "authRequired"
                ? t.errors.authRequired
                : t.errors.generic}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {t.auth.passwordResetOk}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.loading : t.auth.resetSubmit}
      </button>
    </form>
  );
}
