import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

export default async function PartnerPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // A visitor who chooses "For hotels" but is not signed in starts (or
  // continues) hotel registration after signing in / verifying their email.
  if (!user) redirect(`/${locale}/auth/sign-in?intent=partner`);

  const { data: hotels } = await supabase
    .from("hotels")
    .select(
      `id, name, slug, status, needs_re_review, rejection_reason, city:cities(name, name_so),
       rooms(price_per_night), bookings(count)`
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const statusLabels: Record<string, string> = {
    draft: t.statuses.draft,
    pending_review: t.statuses.pending_review,
    approved: t.statuses.approved,
    rejected: t.statuses.rejected,
    suspended: t.statuses.suspended,
  };
  const explanation: Record<string, string> = {
    draft: t.partner.statusExplanation.draft,
    pending_review: t.partner.statusExplanation.pending_review,
    approved: t.partner.statusExplanation.approved,
    rejected: t.partner.statusExplanation.rejected,
    suspended: t.partner.statusExplanation.suspended,
  };

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t.partner.dashboard}</h1>
        <div className="flex gap-2">
          <Link href={`/${locale}/partner/bookings`} className="btn-outline">
            {t.partner.bookings}
          </Link>
          <Link href={`/${locale}/partner/hotels/new`} className="btn-primary">
            {t.partner.newHotel}
          </Link>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">{t.partner.myHotels}</h2>
      <div className="mt-4 space-y-3">
        {!hotels || hotels.length === 0 ? (
          <EmptyState
            title={t.partner.newHotel}
            body={t.home.partnerCtaBody}
          />
        ) : (
          hotels.map((h) => (
            <div key={h.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/${locale}/partner/hotels/${h.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-green"
                    >
                      {h.name}
                    </Link>
                    <StatusBadge status={h.status} label={statusLabels[h.status] ?? h.status} />
                    {h.needs_re_review && h.status === "approved" && (
                      <span className="badge bg-blue-100 text-blue-800">{t.statuses.needs_re_review}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {locale === "so"
                      ? (h.city as unknown as { name_so: string }).name_so
                      : (h.city as unknown as { name: string }).name}{" "}
                    · {((h.bookings as unknown as { count: number }[])[0]?.count) ?? 0}{" "}
                    {t.partner.bookings}
                  </p>
                </div>
                <Link href={`/${locale}/partner/hotels/${h.id}`} className="btn-outline !py-1.5 !text-xs">
                  {t.common.edit}
                </Link>
              </div>
              <p className="mt-2 text-sm text-slate-600">{explanation[h.status]}</p>
              {h.status === "rejected" && h.rejection_reason && (
                <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {t.partner.rejectionReason}: {h.rejection_reason}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
