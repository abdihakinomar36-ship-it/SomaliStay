import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireAdmin } from "@/lib/admin";
import AdminReportForm from "@/components/AdminReportForm";
import EmptyState from "@/components/EmptyState";
import { formatDate } from "@/lib/utils";

export default async function AdminReportsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);
  const { supabase } = await requireAdmin(locale);

  const { data: reports } = await supabase
    .from("reports")
    .select(`*, reporter:profiles(full_name), hotel:hotels(name)`)
    .order("created_at", { ascending: false });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.reports}</h1>
      <div className="mt-6 space-y-3">
        {!reports || reports.length === 0 ? (
          <EmptyState title={t.admin.reports} body={t.admin.noReports} />
        ) : (
          reports.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{r.subject}</span>
                  <span className="badge ml-2 bg-slate-100 text-slate-600">{r.status}</span>
                </div>
                <p className="text-xs text-slate-400">{formatDate(r.created_at, locale)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{r.body}</p>
              <p className="mt-1 text-xs text-slate-400">
                {(r.reporter as unknown as { full_name: string | null })?.full_name ?? "—"}
                {r.hotel ? ` · ${(r.hotel as unknown as { name: string }).name}` : ""}
              </p>
              {r.status === "open" && (
                <div className="mt-3">
                  <AdminReportForm locale={locale} t={t} reportId={r.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
