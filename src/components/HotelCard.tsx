import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";
import { formatPrice } from "@/lib/utils";

export type HotelCardData = {
  id: string;
  slug: string;
  name: string;
  city_name: string;
  region: string | null;
  min_price: number | null;
  cover_url: string | null;
};

export default function HotelCard({
  hotel,
  locale,
  t,
}: {
  hotel: HotelCardData;
  locale: Locale;
  t: Dictionary;
}) {
  return (
    <Link
      href={`/${locale}/hotels/${hotel.slug}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="relative h-48 w-full bg-slate-100">
        {hotel.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.cover_url}
            alt={hotel.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-green-light to-brand-blue-light">
            <svg className="h-10 w-10 text-brand-green/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-green">
          {hotel.name}
        </h3>
        <p className="text-xs text-slate-500">
          {hotel.city_name}
          {hotel.region ? `, ${hotel.region}` : ""}
        </p>
        {hotel.min_price != null && (
          <p className="mt-auto text-sm font-semibold text-brand-green">
            {t.hotel.from} {formatPrice(hotel.min_price)}{" "}
            <span className="text-xs font-normal text-slate-500">{t.hotel.perNight}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
