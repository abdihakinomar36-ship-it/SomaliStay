"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { createBookingRequestAction } from "@/actions/bookings";
import { addDaysISO, formatPrice, todayISO } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

type RoomOption = {
  id: string;
  name: string;
  capacity: number;
  price: number;
  currency: string;
  available: boolean;
};

export default function BookingForm({
  locale,
  t,
  rooms,
  defaults,
}: {
  locale: Locale;
  t: Dictionary;
  rooms: RoomOption[];
  defaults: { checkIn: string | null; checkOut: string | null; guests: number | null };
}) {
  const [state, formAction, pending] = useFormState(createBookingRequestAction, null);
  const today = todayISO();
  const [checkIn, setCheckIn] = useState(defaults.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults.checkOut ?? "");
  const [roomId, setRoomId] = useState("");

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const errorMap: Record<string, string> = {
    authRequired: t.errors.authRequired,
    rateLimited: t.errors.rateLimited,
    invalidDates: t.errors.invalidDates,
    datesInPast: t.errors.datesInPast,
    tooManyNights: t.errors.tooManyNights,
    tooManyGuests: t.errors.tooManyGuests,
    invalidGuests: t.errors.invalidGuests,
    datesBlocked: t.errors.datesBlocked,
    roomUnavailable: t.errors.roomUnavailable,
    hotelNotAvailable: t.errors.hotelNotAvailable,
    roomNotFound: t.errors.roomNotFound,
    invalidContact: t.errors.invalidContact,
    generic: t.errors.generic,
  };

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label" htmlFor="bk-room">Room</label>
        <select
          id="bk-room"
          name="roomId"
          className="input"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          required
        >
          <option value="" disabled>
            {t.hotel.rooms}…
          </option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id} disabled={!r.available}>
              {r.name} — {formatPrice(r.price, r.currency)}
              {r.available ? "" : ` (${t.hotel.roomUnavailable})`}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="bk-in">{t.common.checkIn}</label>
          <input
            id="bk-in"
            type="date"
            name="checkIn"
            className="input"
            min={today}
            max={checkOut ? addDaysISO(checkOut, -1) : undefined}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="bk-out">{t.common.checkOut}</label>
          <input
            id="bk-out"
            type="date"
            name="checkOut"
            className="input"
            min={checkIn ? addDaysISO(checkIn, 1) : addDaysISO(today, 1)}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bk-guests">{t.common.guests}</label>
        <input
          id="bk-guests"
          type="number"
          name="guests"
          className="input"
          min={1}
          max={selectedRoom?.capacity ?? 12}
          defaultValue={defaults.guests ?? 2}
          required
        />
        {selectedRoom && (
          <p className="mt-1 text-xs text-slate-500">{t.hotel.capacity}: {selectedRoom.capacity}</p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="bk-name">{t.booking.contactName}</label>
        <input id="bk-name" name="contactName" className="input" maxLength={120} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="bk-phone">{t.booking.contactPhone}</label>
          <input id="bk-phone" name="contactPhone" className="input" type="tel" />
        </div>
        <div>
          <label className="label" htmlFor="bk-email">{t.booking.contactEmail}</label>
          <input id="bk-email" name="contactEmail" className="input" type="email" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bk-req">{t.booking.specialRequests}</label>
        <textarea
          id="bk-req"
          name="specialRequests"
          className="input"
          rows={2}
          maxLength={1000}
          placeholder={t.booking.specialRequestsPlaceholder}
        />
      </div>

      {state && !state.ok && state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMap[state.error] ?? t.errors.generic}
        </p>
      )}
      {state && state.ok && state.reference && (
        <div className="rounded-lg bg-green-50 px-3 py-3 text-sm text-green-800">
          <p className="font-semibold">{t.booking.successTitle}</p>
          <p className="mt-1">
            {t.booking.successBody.replace("{reference}", state.reference)}
          </p>
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.booking.submitting : t.booking.submit}
      </button>
    </form>
  );
}
