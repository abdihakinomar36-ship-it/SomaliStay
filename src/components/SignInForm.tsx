"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signInAction } from "@/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function SignInForm({
  locale,
  t,
  intent = "",
  next = "",
}: {
  locale: Locale;
  t: Dictionary;
  intent?: string;
  next?: string;
}) {
  const [state, formAction, pending] = useFormState(signInAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {intent && <input type="hidden" name="intent" value={intent} />}
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="si-email">{t.common.email}</label>
        <input id="si-email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="si-password">{t.auth.password}</label>
        <input id="si-password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state && !state.ok && state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error === "rateLimited"
            ? t.errors.rateLimited
            : state.error === "invalidCredentials"
              ? t.auth.invalidCredentials
              : t.errors.generic}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.loading : t.nav.signIn}
      </button>
      <div className="flex items-center justify-between text-sm">
        <Link href={`/${locale}/auth/forgot-password`} className="text-slate-500 hover:text-brand-blue">
          {t.auth.forgotPassword}
        </Link>
        <span className="text-slate-500">
          {t.auth.noAccount}{" "}
          <Link href={`/${locale}/auth/sign-up${intent ? "?intent=partner" : ""}`} className="font-medium text-brand-blue">
            {t.nav.signUp}
          </Link>
        </span>
      </div>
    </form>
  );
}
