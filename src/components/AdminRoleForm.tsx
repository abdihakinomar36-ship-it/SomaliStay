"use client";

import { useFormState } from "react-dom";
import { adminSetUserRoleAction } from "@/actions/admin";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function AdminRoleForm({
  locale,
  t,
  userId,
  currentRole,
}: {
  locale: Locale;
  t: Dictionary;
  userId: string;
  currentRole: string;
}) {
  const [state, formAction, pending] = useFormState(adminSetUserRoleAction, null);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="input !w-auto !py-1.5 !text-xs"
        disabled={pending}
      >
        <option value="guest">guest</option>
        <option value="partner">partner</option>
        <option value="admin">admin</option>
      </select>
      <button
        type="submit"
        className="btn-outline !py-1.5 !text-xs"
        disabled={pending}
        onClick={(e) => {
          if (currentRole !== "admin" && !confirm(t.admin.confirmAdmin)) e.preventDefault();
        }}
      >
        {t.admin.changeRole}
      </button>
      {state && !state.ok && state.error && (
        <span className="text-xs text-red-600">{t.errors.notAuthorized}</span>
      )}
    </form>
  );
}
