"use client";

import { useFormState } from "react-dom";
import { sendBookingMessageAction } from "@/actions/bookings";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function MessageForm({
  locale,
  t,
  bookingId,
}: {
  locale: Locale;
  t: Dictionary;
  bookingId: string;
}) {
  const [state, formAction, pending] = useFormState(sendBookingMessageAction, null);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <textarea
        name="body"
        className="input"
        rows={2}
        maxLength={2000}
        placeholder={t.booking.messagePlaceholder}
        required
      />
      {state && !state.ok && state.error && (
        <p className="text-xs text-red-600">{t.errors.generic}</p>
      )}
      <button type="submit" className="btn-secondary !py-1.5 !text-xs" disabled={pending}>
        {pending ? t.common.loading : t.common.sendMessage}
      </button>
    </form>
  );
}
