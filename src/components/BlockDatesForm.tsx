"use client";

import { useFormState } from "react-dom";
import { blockDatesAction } from "@/actions/hotels";
import { todayISO } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function BlockDatesForm({
  locale,
  t,
  roomId,
}: {
  locale: Locale;
  t: Dictionary;
  roomId: string;
}) {
  const [state, formAction, pending] = useFormState(blockDatesAction, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="roomId" value={roomId} />
      <div>
        <label className="label" htmlFor={`bd-from-${roomId}`}>{t.partner.blockFrom}</label>
        <input
          id={`bd-from-${roomId}`}
          type="date"
          name="from"
          min={todayISO()}
          className="input !py-1.5 !text-xs"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor={`bd-to-${roomId}`}>{t.partner.blockTo}</label>
        <input
          id={`bd-to-${roomId}`}
          type="date"
          name="to"
          className="input !py-1.5 !text-xs"
          required
        />
      </div>
      <button type="submit" className="btn-outline !py-1.5 !text-xs" disabled={pending}>
        {t.partner.addBlock}
      </button>
      {state && !state.ok && state.error && (
        <p className="text-xs text-red-600">{t.errors.invalidDates}</p>
      )}
    </form>
  );
}
