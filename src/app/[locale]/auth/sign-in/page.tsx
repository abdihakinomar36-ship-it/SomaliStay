import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import SignInForm from "@/components/SignInForm";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { intent?: string; next?: string; reset?: string; auth_error?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const intent = searchParams.intent === "partner" ? "partner" : "";
  const next =
    searchParams.next && /^\/(en|so)\/[^\s"']*$/.test(searchParams.next) && !searchParams.next.includes("//")
      ? searchParams.next
      : "";

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900">{t.auth.signInTitle}</h1>
        {searchParams.reset === "1" && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            {t.auth.passwordResetOk}
          </p>
        )}
        {searchParams.auth_error && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t.auth.linkExpired}
          </p>
        )}
        <div className="mt-6">
          <SignInForm locale={locale} t={t} intent={intent} next={next} />
        </div>
      </div>
    </div>
  );
}
