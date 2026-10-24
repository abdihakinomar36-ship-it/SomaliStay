import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  // The reset link exchanges its code in /auth/callback and lands here with
  // an active session; without a session the link is invalid/expired.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in?auth_error=expired`);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900">{t.auth.resetTitle}</h1>
        <div className="mt-6">
          <ResetPasswordForm locale={locale} t={t} />
        </div>
      </div>
    </div>
  );
}
