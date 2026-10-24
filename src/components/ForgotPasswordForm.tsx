"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordResetAction } from "@/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function ForgotPasswordForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useFormState(requestPasswordResetAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label" htmlFor="fp-email">{t.common.email}</label>
        <input id="fp-email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      {state && !state.ok && state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error === "rateLimited" ? t.errors.rateLimited : t.errors.generic}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {t.auth.resetSent}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.loading : t.auth.sendResetLink}
      </button>
      <p className="text-center text-sm text-slate-500">
        <Link href={`/${locale}/auth/sign-in`} className="font-medium text-brand-blue">
          ← {t.auth.backToSignIn}
        </Link>
      </p>
    </form>
  );
}
