import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import MessageForm from "@/components/MessageForm";
import ReviewForm from "@/components/ReviewForm";
import { ConfirmForm } from "@/components/ConfirmControls";
import { cancelBookingAction } from "@/actions/bookings";
import { formatDate, formatPrice } from "@/lib/utils";

export default async function BookingDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in`);

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `*, hotel:hotels(id, name, slug), room:rooms(name),
       sender:profiles(full_name)`
    )
    .eq("id", params.id)
    .eq("guest_id", user.id)
    .single();

  if (!booking) notFound();

  const [{ data: history }, { data: messages }, { data: review }] = await Promise.all([
    supabase
      .from("booking_status_history")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at"),
    supabase
      .from("booking_messages")
      .select("id, body, created_at, sender_id, sender:profiles(full_name)")
      .eq("booking_id", booking.id)
      .order("created_at"),
    supabase.from("reviews").select("id").eq("booking_id", booking.id).maybeSingle(),
  ]);

  const statusLabels: Record<string, string> = {
    pending: t.statuses.pending,
    confirmed: t.statuses.confirmed,
    rejected: t.statuses.rejected,
    cancelled: t.statuses.cancelled,
  };
  const historyLabels: Record<string, string> = {
    pending: t.statuses.pending,
    confirmed: t.statuses.confirmed,
    rejected: t.statuses.rejected,
    cancelled: t.statuses.cancelled,
  };

  const canReview =
    booking.status === "confirmed" &&
    new Date(booking.check_out) <= new Date() &&
    !review;

  return (
    <div className="container-page py-8">
      <Link href={`/${locale}/guest`} className="text-sm text-brand-blue">
        ← {t.guest.myBookings}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {(booking.hotel as unknown as { name: string }).name}
          </h1>
          <p className="text-sm text-slate-500">
            {t.booking.reference}: <span className="font-mono font-semibold">{booking.reference}</span>
          </p>
        </div>
        <StatusBadge status={booking.status} label={statusLabels[booking.status] ?? booking.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Summary */}
          <section className="card p-6">
            <h2 className="font-semibold text-slate-900">{t.booking.summary}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-slate-500">{t.common.checkIn}</dt>
                <dd className="font-medium">{formatDate(booking.check_in, locale)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.common.checkOut}</dt>
                <dd className="font-medium">{formatDate(booking.check_out, locale)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.common.guests}</dt>
                <dd className="font-medium">{booking.guests}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.common.total}</dt>
                <dd className="font-medium">{formatPrice(booking.total_price, booking.currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              {(booking.room as unknown as { name: string }).name} · {booking.nights} {t.booking.nights} ·{" "}
              {formatPrice(booking.price_per_night, booking.currency)} / {t.hotel.perNight}
            </p>
            <p className="mt-3 text-sm text-slate-600">
              {t.statusHelp[booking.status as keyof typeof t.statusHelp]}
            </p>
            {booking.owner_response && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">{t.partner.ownerResponse}:</span> {booking.owner_response}
              </div>
            )}
          </section>

          {/* Messages */}
          <section className="card p-6">
            <h2 className="font-semibold text-slate-900">{t.booking.messages}</h2>
            <div className="mt-3 space-y-3">
              {(messages ?? []).length === 0 && (
                <p className="text-sm text-slate-400">{t.booking.messagePlaceholder}</p>
              )}
              {(messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 text-sm ${
                    m.sender_id === user.id
                      ? "ml-8 bg-brand-green-light text-slate-800"
                      : "mr-8 bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="text-xs text-slate-500">
                    {((m.sender as unknown as { full_name: string | null }[])[0]?.full_name) ?? "—"} ·{" "}
                    {formatDate(m.created_at, locale)}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{m.body}</p>
                </div>
              ))}
            </div>
            <MessageForm locale={locale} t={t} bookingId={booking.id} />
          </section>

          {/* Review */}
          {canReview && (
            <section className="card p-6">
              <h2 className="font-semibold text-slate-900">{t.reviews.write}</h2>
              <p className="text-sm text-slate-500">{t.reviews.canReview}</p>
              <div className="mt-4">
                <ReviewForm
                  locale={locale}
                  t={t}
                  hotelId={(booking.hotel as unknown as { id: string }).id}
                  bookingId={booking.id}
                  slug={(booking.hotel as unknown as { slug: string }).slug}
                />
              </div>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-semibold text-slate-900">{t.booking.history}</h2>
            <ol className="mt-3 space-y-3">
              {(history ?? []).map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                  <div>
                    <p className="font-medium">
                      {historyLabels[h.to_status] ?? h.to_status}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(h.created_at, locale)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {["pending", "confirmed"].includes(booking.status) && (
            <section className="card p-6">
              <ConfirmForm action={cancelBookingAction} confirmMessage={t.booking.cancelConfirm}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="bookingId" value={booking.id} />
                <button type="submit" className="btn-danger w-full">
                  {t.booking.cancelBooking}
                </button>
              </ConfirmForm>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
