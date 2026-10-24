"use client";

import { useFormState } from "react-dom";
import { saveRoomAction } from "@/actions/hotels";
import { ROOM_TYPES } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export type RoomFormValues = {
  id?: string;
  name: string;
  room_type: string;
  capacity: number;
  price_per_night: number;
  currency: string;
  description: string;
  amenities: string[];
};

export default function RoomForm({
  locale,
  t,
  hotelId,
  values,
}: {
  locale: Locale;
  t: Dictionary;
  hotelId: string;
  values?: RoomFormValues;
}) {
  const [state, formAction, pending] = useFormState(saveRoomAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="hotelId" value={hotelId} />
      {values?.id && <input type="hidden" name="roomId" value={values.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`rf-name-${values?.id ?? "new"}`}>{t.partner.roomName}</label>
          <input
            id={`rf-name-${values?.id ?? "new"}`}
            name="name"
            className="input"
            defaultValue={values?.name ?? ""}
            placeholder={t.partner.roomNameHint}
            maxLength={100}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`rf-type-${values?.id ?? "new"}`}>{t.common.roomType}</label>
          <select
            id={`rf-type-${values?.id ?? "new"}`}
            name="roomType"
            className="input"
            defaultValue={values?.room_type ?? "double"}
          >
            {ROOM_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {t.common.roomTypeLabels[rt] ?? rt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`rf-cap-${values?.id ?? "new"}`}>{t.partner.capacity}</label>
          <input
            id={`rf-cap-${values?.id ?? "new"}`}
            name="capacity"
            type="number"
            min={1}
            max={12}
            className="input"
            defaultValue={values?.capacity ?? 2}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`rf-price-${values?.id ?? "new"}`}>{t.partner.price}</label>
          <input
            id={`rf-price-${values?.id ?? "new"}`}
            name="price"
            type="number"
            min={1}
            step="0.01"
            className="input"
            defaultValue={values?.price_per_night ?? ""}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`rf-cur-${values?.id ?? "new"}`}>{t.partner.currency}</label>
          <select
            id={`rf-cur-${values?.id ?? "new"}`}
            name="currency"
            className="input"
            defaultValue={values?.currency ?? "USD"}
          >
            {["USD", "EUR", "GBP", "SOS", "KES", "AED", "ETB"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`rf-desc-${values?.id ?? "new"}`}>{t.partner.roomDescription}</label>
        <textarea
          id={`rf-desc-${values?.id ?? "new"}`}
          name="description"
          rows={2}
          maxLength={2000}
          className="input"
          defaultValue={values?.description ?? ""}
        />
      </div>
      {state && !state.ok && state.error && (
        <p className="text-sm text-red-600">{t.errors.generic}</p>
      )}
      {state && state.ok && <p className="text-sm text-green-700">{t.partner.savedOk}</p>}
      <button type="submit" className="btn-primary !py-1.5 !text-xs" disabled={pending}>
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}
