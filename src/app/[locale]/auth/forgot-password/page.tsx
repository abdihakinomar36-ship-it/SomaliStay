import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900">{t.auth.forgotTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.auth.forgotBody}</p>
        <div className="mt-6">
          <ForgotPasswordForm locale={locale} t={t} />
        </div>
      </div>
    </div>
  );
}
