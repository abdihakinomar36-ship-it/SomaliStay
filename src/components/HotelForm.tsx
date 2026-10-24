"use client";

import { useFormState } from "react-dom";
import { createHotelAction, updateHotelAction } from "@/actions/hotels";
import { AMENITIES } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export type HotelFormValues = {
  id?: string;
  name: string;
  cityId: number;
  description: string;
  address: string;
  region: string;
  phone: string;
  email: string;
  website: string;
  amenities: string[];
};

export default function HotelForm({
  locale,
  t,
  cities,
  values,
}: {
  locale: Locale;
  t: Dictionary;
  cities: Array<{ id: number; name: string; name_so: string; region: string }>;
  values?: HotelFormValues;
}) {
  const [state, formAction, pending] = useFormState(
    values?.id ? updateHotelAction : createHotelAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {values?.id && <input type="hidden" name="hotelId" value={values.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="hf-name">{t.partner.hotelName}</label>
          <input
            id="hf-name"
            name="name"
            className="input"
            defaultValue={values?.name ?? ""}
            maxLength={120}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="hf-city">{t.partner.city}</label>
          <select id="hf-city" name="cityId" className="input" defaultValue={values?.cityId ?? ""} required>
            <option value="" disabled>
              {t.common.city}…
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "so" ? c.name_so : c.name} — {c.region}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="hf-region">{t.common.region}</label>
          <input id="hf-region" name="region" className="input" defaultValue={values?.region ?? ""} maxLength={100} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="hf-address">{t.common.address}</label>
          <input
            id="hf-address"
            name="address"
            className="input"
            defaultValue={values?.address ?? ""}
            maxLength={300}
            placeholder={t.partner.addressHint}
          />
        </div>
        <div className="sm:col-span-2 scroll-mt-24" id="step-2">
          <h3 className="mb-3 text-base font-semibold text-slate-900">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-[10px] text-white">2</span>
            {t.partner.wizardStep2}
          </h3>
          <label className="label" htmlFor="hf-desc">{t.common.description}</label>
          <textarea
            id="hf-desc"
            name="description"
            className="input"
            rows={5}
            maxLength={5000}
            defaultValue={values?.description ?? ""}
            placeholder={t.partner.descriptionHint}
          />
        </div>
      </div>

      <h3 className="pt-2 font-semibold text-slate-900">{t.partner.contactDetails}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="hf-phone">{t.common.phone}</label>
          <input id="hf-phone" name="phone" className="input" type="tel" defaultValue={values?.phone ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="hf-email">{t.common.email}</label>
          <input id="hf-email" name="email" className="input" type="email" defaultValue={values?.email ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="hf-website">{t.common.website}</label>
          <input id="hf-website" name="website" className="input" type="url" defaultValue={values?.website ?? ""} />
        </div>
      </div>

      <div>
        <span className="label">{t.common.amenities}</span>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <label
              key={a}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs hover:border-brand-green"
            >
              <input
                type="checkbox"
                name="amenities"
                value={a}
                defaultChecked={values?.amenities.includes(a)}
                className="accent-[#0e7a4f]"
              />
              {t.common.amenityLabels[a] ?? a.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </div>

      {state && !state.ok && state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t.errors.generic}</p>
      )}
      {state && state.ok && !values?.id && state.reference && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t.partner.savedOk}</p>
      )}
      {state && state.ok && values?.id && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t.partner.savedOk}</p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}
