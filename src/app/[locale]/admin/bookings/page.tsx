import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireAdmin } from "@/lib/admin";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";

export default async function AdminBookingsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);
  const { supabase } = await requireAdmin(locale);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`*, hotel:hotels(name), room:rooms(name), guest:profiles!bookings_guest_id_fkey(full_name)`)
    .order("created_at", { ascending: false })
    .limit(200);

  const statusLabels: Record<string, string> = {
    pending: t.statuses.pending,
    confirmed: t.statuses.confirmed,
    rejected: t.statuses.rejected,
    cancelled: t.statuses.cancelled,
  };

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.bookings}</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t.booking.reference}</th>
              <th className="px-4 py-3">{t.nav.hotels}</th>
              <th className="px-4 py-3">{t.common.date}</th>
              <th className="px-4 py-3">{t.common.guests}</th>
              <th className="px-4 py-3">{t.common.total}</th>
              <th className="px-4 py-3">{t.common.status}</th>
            </tr>
          </thead>
          <tbody>
            {!bookings || bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t.admin.noBookings}</td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{(b.hotel as unknown as { name: string }).name}</span>
                    <span className="block text-xs text-slate-400">{(b.room as unknown as { name: string }).name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(b.check_in, locale)} → {formatDate(b.check_out, locale)}
                  </td>
                  <td className="px-4 py-3">{b.guests}</td>
                  <td className="px-4 py-3">{formatPrice(b.total_price, b.currency)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} label={statusLabels[b.status] ?? b.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
