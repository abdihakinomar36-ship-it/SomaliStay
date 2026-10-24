"use client";

import { useFormState } from "react-dom";
import { adminResolveReportAction } from "@/actions/admin";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function AdminReportForm({
  locale,
  t,
  reportId,
}: {
  locale: Locale;
  t: Dictionary;
  reportId: string;
}) {
  const [state, formAction, pending] = useFormState(adminResolveReportAction, null);

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="reportId" value={reportId} />
      <button type="submit" name="status" value="resolved" className="btn-primary !py-1.5 !text-xs" disabled={pending}>
        {t.admin.resolve}
      </button>
      <button type="submit" name="status" value="dismissed" className="btn-outline !py-1.5 !text-xs" disabled={pending}>
        {t.admin.dismiss}
      </button>
      {state && !state.ok && state.error && (
        <span className="text-xs text-red-600">{t.errors.notAuthorized}</span>
      )}
    </form>
  );
}
