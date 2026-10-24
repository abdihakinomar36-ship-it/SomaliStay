import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import AdminHotelStatusForm from "@/components/AdminHotelStatusForm";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { getSignedPhotoUrls } from "@/lib/photos";
import { formatDate } from "@/lib/utils";

export default async function AdminPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in`);

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect(`/${locale}`);

  // statistics
  const [users, hotels, hotelsPending, bookings, bookingsConfirmed, openReports] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("hotels").select("id", { count: "exact", head: true }),
      supabase.from("hotels").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);

  const stats = [
    { label: t.admin.statUsers, value: users.count ?? 0 },
    { label: t.admin.statHotels, value: hotels.count ?? 0 },
    { label: t.admin.statPending, value: hotelsPending.count ?? 0 },
    { label: t.admin.statBookings, value: bookings.count ?? 0 },
    { label: t.admin.statConfirmed, value: bookingsConfirmed.count ?? 0 },
    { label: t.admin.statOpenReports, value: openReports.count ?? 0 },
  ];

  // review queue: pending or flagged for re-review
  const { data: queue } = await supabase
    .from("hotels")
    .select(
      `*, city:cities(name, name_so), owner:profiles!hotels_owner_id_fkey(id, full_name),
       rooms(count), hotel_images(storage_path)`
    )
    .or("status.eq.pending_review,and(status.eq.approved,needs_re_review.eq.true)")
    .order("submitted_at", { ascending: true, nullsFirst: true });

  const signed = await getSignedPhotoUrls(
    (queue ?? []).flatMap((h) => (h.hotel_images ?? []).map((i: { storage_path: string }) => i.storage_path))
  );

  const statusLabels: Record<string, string> = {
    draft: t.statuses.draft,
    pending_review: t.statuses.pending_review,
    approved: t.statuses.approved,
    rejected: t.statuses.rejected,
    suspended: t.statuses.suspended,
  };

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.dashboard}</h1>

      {/* Stats */}
      <h2 className="mt-6 font-semibold text-slate-900">{t.admin.stats}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-bold text-brand-green">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/${locale}/admin/users`} className="btn-outline">{t.admin.users}</Link>
        <Link href={`/${locale}/admin/bookings`} className="btn-outline">{t.admin.bookings}</Link>
        <Link href={`/${locale}/admin/reports`} className="btn-outline">{t.admin.reports}</Link>
        <Link href={`/${locale}/admin/logs`} className="btn-outline">{t.admin.auditLogs}</Link>
      </div>

      {/* Review queue */}
      <h2 className="mt-8 font-semibold text-slate-900">{t.admin.reviewQueue}</h2>
      <p className="text-xs text-slate-500">{t.admin.verifyHint}</p>
      <div className="mt-4 space-y-3">
        {!queue || queue.length === 0 ? (
          <EmptyState title={t.admin.reviewQueue} body={t.admin.noQueue} />
        ) : (
          queue.map((h) => {
            const imgs = (h.hotel_images ?? []) as Array<{ storage_path: string }>;
            return (
              <div key={h.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-900">{h.name}</span>
                      <StatusBadge status={h.status} label={statusLabels[h.status] ?? h.status} />
                      {h.status === "approved" && h.needs_re_review && (
                        <span className="badge bg-blue-100 text-blue-800">{t.admin.needsReReview}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {locale === "so" ? (h.city as unknown as { name_so: string }).name_so : (h.city as unknown as { name: string }).name} ·{" "}
                      {t.admin.owner}: {(h.owner as unknown as { full_name: string | null }).full_name} ·{" "}
                      {t.admin.submittedAt}: {h.submitted_at ? formatDate(h.submitted_at, locale) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t.partner.rooms}: {((h.rooms ?? []) as unknown as { count: number }[])[0]?.count ?? 0} ·{" "}
                      {t.partner.images}: {imgs.length}
                    </p>
                    {h.description && (
                      <p className="mt-2 max-w-2xl text-sm text-slate-600">{h.description.slice(0, 300)}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {t.common.phone}: {h.phone ?? "—"} · {t.common.email}: {h.email ?? "—"} ·{" "}
                      {t.common.address}: {h.address ?? "—"}
                    </p>
                  </div>
                  {imgs[0] && signed.get(imgs[0].storage_path) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signed.get(imgs[0].storage_path)!}
                      alt={h.name}
                      className="h-24 w-36 rounded-lg object-cover"
                    />
                  )}
                </div>
                <AdminHotelStatusForm locale={locale} t={t} hotelId={h.id} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
