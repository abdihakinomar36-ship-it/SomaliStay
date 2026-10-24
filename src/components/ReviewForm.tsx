"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createReviewAction } from "@/actions/reviews";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function ReviewForm({
  locale,
  t,
  hotelId,
  bookingId,
  slug,
}: {
  locale: Locale;
  t: Dictionary;
  hotelId: string;
  bookingId: string;
  slug: string;
}) {
  const [state, formAction, pending] = useFormState(createReviewAction, null);
  const [rating, setRating] = useState(5);

  if (state?.ok) {
    return <p className="text-sm text-green-700">{t.reviews.submitted}</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="hotelId" value={hotelId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label className="label">{t.reviews.rating}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`text-2xl ${n <= rating ? "text-amber-500" : "text-slate-300"}`}
              aria-label={`${n}`}
            >
              ★
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>
      <div>
        <label className="label" htmlFor="rv-comment">{t.reviews.comment}</label>
        <textarea id="rv-comment" name="comment" className="input" rows={3} maxLength={2000} />
      </div>
      {state && !state.ok && state.error && (
        <p className="text-xs text-red-600">{t.errors.notAuthorized}</p>
      )}
      <button type="submit" className="btn-primary !py-1.5 !text-xs" disabled={pending}>
        {pending ? t.common.loading : t.reviews.submit}
      </button>
    </form>
  );
}
