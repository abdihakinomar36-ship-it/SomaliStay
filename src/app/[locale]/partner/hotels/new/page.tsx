import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import HotelForm from "@/components/HotelForm";

export default async function NewHotelPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in?intent=partner`);

  const { data: cities } = await supabase.from("cities").select("id, name, name_so, region").order("name");

  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.partner.newHotel}</h1>
      <div className="card mt-6 p-6">
        <HotelForm locale={locale} t={t} cities={cities ?? []} />
      </div>
    </div>
  );
}
