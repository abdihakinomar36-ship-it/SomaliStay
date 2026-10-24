import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import RespondForm from "@/components/RespondForm";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";

export default async function PartnerBookingsPage({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in`);

  // bookings for hotels owned by this user
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `*, hotel:hotels(name, slug), room:rooms(name),
       guest:profiles!bookings_guest_id_fkey(id, full_name)`
    )
    .eq("hotels.owner_id", user.id)
    .order("created_at", { ascending: false });

  const statusLabels: Record<string, string> = {
    pending: t.statuses.pending,
    confirmed: t.statuses.confirmed,
    rejected: t.statuses.rejected,
    cancelled: t.statuses.cancelled,
  };

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t.partner.bookings}</h1>
        <Link href={`/${locale}/partner`} className="btn-outline">
          {t.partner.myHotels}
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {!bookings || bookings.length === 0 ? (
          <EmptyState title={t.partner.noBookingsTitle} body={t.partner.noBookingsBody} />
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      {(b.hotel as unknown as { name: string }).name}
                    </span>
                    <StatusBadge status={b.status} label={statusLabels[b.status] ?? b.status} />
                    <span className="font-mono text-xs text-slate-400">{b.reference}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(b.check_in, locale)} → {formatDate(b.check_out, locale)} ·{" "}
                    {b.nights} {t.booking.nights} · {b.guests} {t.booking.guests} ·{" "}
                    {(b.room as unknown as { name: string }).name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.partner.guest}: {b.contact_name}
                    {b.contact_phone ? ` · ${b.contact_phone}` : ""}
                    {b.contact_email ? ` · ${b.contact_email}` : ""}
                  </p>
                  {b.special_requests && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                      {b.special_requests}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-brand-green">
                  {formatPrice(b.total_price, b.currency)}
                </p>
              </div>
              {b.status === "pending" && <RespondForm locale={locale} t={t} bookingId={b.id} />}
              {b.status !== "pending" && b.owner_response && (
                <p className="mt-2 text-sm text-slate-600">
                  {t.partner.ownerResponse}: {b.owner_response}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
