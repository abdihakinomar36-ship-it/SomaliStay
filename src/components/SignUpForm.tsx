"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signUpAction } from "@/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function SignUpForm({
  locale,
  t,
  intent = "",
}: {
  locale: Locale;
  t: Dictionary;
  intent?: string;
}) {
  const [state, formAction, pending] = useFormState(signUpAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {intent && <input type="hidden" name="intent" value={intent} />}
      <div>
        <label className="label" htmlFor="su-name">{t.auth.fullName}</label>
        <input id="su-name" name="fullName" className="input" maxLength={120} autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="su-phone">{t.auth.phone}</label>
        <input id="su-phone" name="phone" className="input" type="tel" autoComplete="tel" />
      </div>
      <div>
        <label className="label" htmlFor="su-email">{t.common.email}</label>
        <input id="su-email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="su-password">{t.auth.password}</label>
        <input id="su-password" name="password" type="password" className="input" minLength={8} autoComplete="new-password" required />
        <p className="mt-1 text-xs text-slate-400">{t.auth.passwordTooShort}</p>
      </div>
      {state && !state.ok && state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error === "emailTaken"
            ? t.auth.emailTaken
            : state.error === "weakPassword"
              ? t.auth.errors.weakPassword
              : state.error === "rateLimited"
                ? t.errors.rateLimited
                : t.errors.generic}
        </p>
      )}
      {state && state.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          <p>{t.auth.accountCreated}</p>
          {intent === "partner" && <p className="mt-1">{t.auth.partnerAfterVerify}</p>}
        </div>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.loading : t.nav.signUp}
      </button>
      <p className="text-xs text-slate-400">{t.auth.emailVerification}</p>
      <p className="text-center text-sm text-slate-500">
        {t.auth.haveAccount}{" "}
        <Link href={`/${locale}/auth/sign-in${intent ? "?intent=partner" : ""}`} className="font-medium text-brand-blue">
          {t.nav.signIn}
        </Link>
      </p>
    </form>
  );
}
