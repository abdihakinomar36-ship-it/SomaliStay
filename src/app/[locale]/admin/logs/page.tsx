import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireAdmin } from "@/lib/admin";
import EmptyState from "@/components/EmptyState";
import { formatDate } from "@/lib/utils";

export default async function AdminLogsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);
  const { supabase } = await requireAdmin(locale);

  const { data: logs } = await supabase
    .from("admin_audit_logs")
    .select("*, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.auditLogs}</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t.admin.time}</th>
              <th className="px-4 py-3">{t.admin.actor}</th>
              <th className="px-4 py-3">{t.admin.action}</th>
              <th className="px-4 py-3">{t.admin.entity}</th>
              <th className="px-4 py-3">{t.admin.details}</th>
            </tr>
          </thead>
          <tbody>
            {!logs || logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t.admin.noLogs}</td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-500">{formatDate(l.created_at, locale)}</td>
                  <td className="px-4 py-3">{(l.actor as unknown as { full_name: string | null })?.full_name ?? "system"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {l.entity_type}:{l.entity_id?.slice(0, 12)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {l.details ? JSON.stringify(l.details).slice(0, 120) : "—"}
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
