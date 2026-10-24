import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import SignUpForm from "@/components/SignUpForm";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { intent?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);
  const intent = searchParams.intent === "partner" ? "partner" : "";

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900">{t.auth.signUpTitle}</h1>
        {intent === "partner" && (
          <p className="mt-3 rounded-lg bg-brand-blue-light px-3 py-2 text-sm text-brand-blue-dark">
            {t.auth.partnerIntentNote}
          </p>
        )}
        <div className="mt-6">
          <SignUpForm locale={locale} t={t} intent={intent} />
        </div>
      </div>
    </div>
  );
}
