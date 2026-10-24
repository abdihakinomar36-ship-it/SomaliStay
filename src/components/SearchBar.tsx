"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";
import { addDaysISO, todayISO } from "@/lib/utils";

export type CityOption = { id: number; name: string; name_so: string; region: string };

export default function SearchBar({
  locale,
  t,
  cities,
  defaults,
}: {
  locale: Locale;
  t: Dictionary;
  cities: CityOption[];
  defaults?: { city?: string; checkIn?: string; checkOut?: string; guests?: string };
}) {
  const router = useRouter();
  const today = todayISO();
  const [city, setCity] = useState(defaults?.city ?? "");
  const [checkIn, setCheckIn] = useState(defaults?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults?.checkOut ?? "");
  const [guests, setGuests] = useState(defaults?.guests ?? "");

  const maxCheckIn = checkOut ? addDaysISO(checkOut, -1) : "";
  const minCheckOut = checkIn ? addDaysISO(checkIn, 1) : addDaysISO(today, 1);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (checkIn && checkOut) {
      params.set("checkIn", checkIn);
      params.set("checkOut", checkOut);
    }
    if (guests) params.set("guests", guests);
    router.push(`/${locale}/hotels${params.toString() ? "?" + params.toString() : ""}`);
  }

  const localizedCities = useMemo(
    () => cities.map((c) => ({ ...c, label: locale === "so" ? c.name_so : c.name })),
    [cities, locale]
  );

  return (
    <form
      onSubmit={submit}
      className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_0.7fr_auto]"
    >
      <div className="lg:col-span-1">
        <label className="label" htmlFor="search-city">{t.common.city}</label>
        <select
          id="search-city"
          className="input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">{t.hotels.anyCity}</option>
          {localizedCities.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label} — {c.region}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="search-checkin">{t.common.checkIn}</label>
        <input
          id="search-checkin"
          type="date"
          className="input"
          min={today}
          max={maxCheckIn || undefined}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="search-checkout">{t.common.checkOut}</label>
        <input
          id="search-checkout"
          type="date"
          className="input"
          min={minCheckOut}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="search-guests">{t.common.guests}</label>
        <input
          id="search-guests"
          type="number"
          min={1}
          max={12}
          className="input"
          placeholder={t.hotels.guestsPlaceholder}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <button type="submit" className="btn-primary w-full">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {t.common.search}
        </button>
      </div>
    </form>
  );
}
