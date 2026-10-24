"use client";

import { useFormState } from "react-dom";
import { respondToBookingAction } from "@/actions/bookings";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function RespondForm({
  locale,
  t,
  bookingId,
}: {
  locale: Locale;
  t: Dictionary;
  bookingId: string;
}) {
  const [state, formAction, pending] = useFormState(respondToBookingAction, null);

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input
        name="note"
        className="input !py-1.5 !text-xs"
        placeholder={t.partner.responseNote}
        maxLength={500}
      />
      {state && !state.ok && state.error && (
        <p className="text-xs text-red-600">
          {state.error === "booking_conflict" ? t.partner.conflictError : t.errors.generic}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="accept"
          className="btn-primary !py-1.5 !text-xs"
          disabled={pending}
        >
          {t.partner.accept}
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          className="btn-outline !py-1.5 !text-xs !text-red-600"
          disabled={pending}
        >
          {t.partner.reject}
        </button>
      </div>
    </form>
  );
}
