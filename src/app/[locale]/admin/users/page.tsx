import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireAdmin } from "@/lib/admin";
import AdminRoleForm from "@/components/AdminRoleForm";
import EmptyState from "@/components/EmptyState";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);
  const { supabase } = await requireAdmin(locale);

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: false });

  // join with auth emails via bookings contacts is not possible; profiles has no email.
  // The profile list is what RLS exposes to admins.
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.users}</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t.common.name}</th>
              <th className="px-4 py-3">{t.admin.role}</th>
              <th className="px-4 py-3">{t.common.date}</th>
              <th className="px-4 py-3">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {!users || users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t.admin.noUsers}</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at, locale)}</td>
                  <td className="px-4 py-3">
                    <AdminRoleForm locale={locale} t={t} userId={u.id} currentRole={u.role} />
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
