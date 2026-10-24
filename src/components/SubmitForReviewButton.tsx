"use client";

import { useFormState } from "react-dom";
import { submitHotelForReviewAction } from "@/actions/hotels";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function SubmitForReviewButton({
  locale,
  t,
  hotelId,
}: {
  locale: Locale;
  t: Dictionary;
  hotelId: string;
}) {
  const [state, formAction, pending] = useFormState(submitHotelForReviewAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="hotelId" value={hotelId} />
      {state && !state.ok && state.error && (
        <p className="mt-2 text-sm text-red-600">
          {state.error === "submitInvalid" ? t.partner.submitInvalid : t.errors.generic}
        </p>
      )}
      {state && state.ok && (
        <p className="mt-2 text-sm text-green-700">{t.partner.submittedForReview}</p>
      )}
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? t.common.loading : t.partner.submitForReview}
      </button>
    </form>
  );
}
