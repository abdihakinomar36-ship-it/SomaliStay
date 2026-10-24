import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";

export default async function GuestBookingsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `id, reference, status, check_in, check_out, guests, total_price, currency, created_at,
       hotel:hotels(name, slug), room:rooms(name)`
    )
    .eq("guest_id", user.id)
    .order("created_at", { ascending: false });

  const statusLabels: Record<string, string> = {
    pending: t.statuses.pending,
    confirmed: t.statuses.confirmed,
    rejected: t.statuses.rejected,
    cancelled: t.statuses.cancelled,
  };

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.guest.myBookings}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.auth.signedInAs} {user.email}</p>

      <div className="mt-6 space-y-3">
        {!bookings || bookings.length === 0 ? (
          <EmptyState title={t.guest.noBookingsTitle} body={t.guest.noBookingsBody} />
        ) : (
          bookings.map((b) => (
            <Link
              key={b.id}
              href={`/${locale}/guest/bookings/${b.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">
                    {(b.hotel as unknown as { name: string }).name}
                  </span>
                  <StatusBadge status={b.status} label={statusLabels[b.status] ?? b.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {(b.room as unknown as { name: string }).name} · {t.booking.reference}: {b.reference}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(b.check_in, locale)} → {formatDate(b.check_out, locale)} ·{" "}
                  {b.guests} {t.booking.guests}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-brand-green">
                  {formatPrice(b.total_price, b.currency)}
                </p>
                <p className="text-xs text-slate-400">
                  {t.statusHelp[b.status as keyof typeof t.statusHelp] ?? ""}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
