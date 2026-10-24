"use client";

import { useFormState } from "react-dom";
import { adminSetHotelStatusAction } from "@/actions/admin";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function AdminHotelStatusForm({
  locale,
  t,
  hotelId,
}: {
  locale: Locale;
  t: Dictionary;
  hotelId: string;
}) {
  const [state, formAction, pending] = useFormState(adminSetHotelStatusAction, null);

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="hotelId" value={hotelId} />
      <input
        name="note"
        className="input !py-1.5 !text-xs"
        placeholder={t.admin.reviewNote}
        maxLength={500}
      />
      {state && !state.ok && state.error && (
        <p className="text-xs text-red-600">
          {state.error === "notAuthorized" ? t.errors.notAuthorized : t.errors.generic}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="status" value="approved" className="btn-primary !py-1.5 !text-xs" disabled={pending}>
          {t.admin.approve}
        </button>
        <button type="submit" name="status" value="rejected" className="btn-outline !py-1.5 !text-xs !text-red-600" disabled={pending}>
          {t.admin.reject}
        </button>
        <button type="submit" name="status" value="suspended" className="btn-outline !py-1.5 !text-xs" disabled={pending}>
          {t.admin.suspend}
        </button>
      </div>
    </form>
  );
}
