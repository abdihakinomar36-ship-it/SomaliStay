import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import SearchBar from "@/components/SearchBar";
import HotelCard from "@/components/HotelCard";
import EmptyState from "@/components/EmptyState";
import { AMENITIES } from "@/lib/utils";

type SearchParams = {
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  type?: string;
  amenities?: string;
};

export default async function HotelsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const cityId = searchParams.city && /^\d+$/.test(searchParams.city) ? Number(searchParams.city) : null;
  const checkIn = searchParams.checkIn && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.checkIn) ? searchParams.checkIn : null;
  const checkOut = searchParams.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.checkOut) ? searchParams.checkOut : null;
  const guests = searchParams.guests && /^\d{1,2}$/.test(searchParams.guests) ? Number(searchParams.guests) : null;
  const roomType = searchParams.type && ["single", "double", "twin", "suite", "family", "deluxe"].includes(searchParams.type) ? searchParams.type : null;
  const amenitiesFilter = searchParams.amenities
    ? searchParams.amenities.split(",").filter((a) => (AMENITIES as readonly string[]).includes(a))
    : null;

  const supabase = createClient();

  const { data: cities } = await supabase.from("cities").select("id, name, name_so, region").order("name");

  // Search via the security-definer RPC (checks blocked dates + confirmed bookings)
  const { data: results } = await supabase.rpc("search_hotels", {
    p_city_id: cityId,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_guests: guests,
    p_room_type: roomType,
    p_amenities: amenitiesFilter && amenitiesFilter.length > 0 ? amenitiesFilter : null,
  });

  const hotelIds = (results ?? []).map((r: { hotel_id: string }) => r.hotel_id);
  const priceByHotel = new Map<string, { min: number; rooms: bigint }>();
  for (const r of results ?? []) {
    priceByHotel.set(r.hotel_id, { min: r.min_price, rooms: r.available_rooms });
  }

  let hotels: Array<{
    id: string;
    slug: string;
    name: string;
    city_name: string;
    region: string | null;
    min_price: number | null;
    cover_path: string | null;
  }> = [];
  let signed = new Map<string, string>();

  if (hotelIds.length > 0) {
    const { data: rows } = await supabase
      .from("hotels")
      .select("id, slug, name, city:cities(name, name_so, region), hotel_images(is_cover, storage_path)")
      .eq("status", "approved")
      .in("id", hotelIds)
      .order("created_at", { ascending: false });

    hotels = (rows ?? []).map((h) => {
      const cover = (h.hotel_images ?? []).find((i: { is_cover: boolean }) => i.is_cover);
      return {
        id: h.id,
        slug: h.slug,
        name: h.name,
        city_name: locale === "so" ? (h.city as unknown as { name_so: string }).name_so : (h.city as unknown as { name: string }).name,
        region: (h.city as unknown as { region: string | null }).region,
        min_price: priceByHotel.get(h.id)?.min ?? null,
        cover_path: cover?.storage_path ?? null,
      };
    });

    const paths = hotels.map((h) => h.cover_path).filter((p): p is string => !!p);
    if (paths.length > 0) {
      const { getSignedPhotoUrls } = await import("@/lib/photos");
      signed = await getSignedPhotoUrls(paths);
    }
  }

  const cards = hotels.map((h) => ({
    ...h,
    cover_url: h.cover_path ? signed.get(h.cover_path) ?? null : null,
  }));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t.hotels.searchTitle}</h1>

      <div className="mt-5">
        <SearchBar
          locale={locale}
          t={t}
          cities={cities ?? []}
          defaults={{
            city: cityId ? String(cityId) : "",
            checkIn: checkIn ?? "",
            checkOut: checkOut ?? "",
            guests: guests ? String(guests) : "",
          }}
        />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="label" htmlFor="filter-type">{t.common.roomType}</label>
          <form id="filter-form" method="get" className="contents">
            <input type="hidden" name="city" value={cityId ?? ""} />
            <input type="hidden" name="checkIn" value={checkIn ?? ""} />
            <input type="hidden" name="checkOut" value={checkOut ?? ""} />
            <input type="hidden" name="guests" value={guests ?? ""} />
          </form>
          <select form="filter-form" id="filter-type" name="type" defaultValue={roomType ?? ""} className="input">
            <option value="">{t.common.anyType}</option>
            {["single","double","twin","suite","family","deluxe"].map((rt) => (
              <option key={rt} value={rt}>{t.common.roomTypeLabels[rt] ?? rt}</option>
            ))}
          </select>
        </div>
        <div className="w-64">
          <label className="label" htmlFor="filter-amenities">{t.common.amenities}</label>
          <select form="filter-form" id="filter-amenities" name="amenities" defaultValue={amenitiesFilter?.join(",") ?? ""} className="input">
            <option value="">{t.common.anyType}</option>
            {AMENITIES.map((a: string) => (
              <option key={a} value={a}>{t.common.amenityLabels[a] ?? a.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <button form="filter-form" type="submit" className="btn-outline">
          {t.common.apply}
        </button>
        <a href={`/${locale}/hotels`} className="btn-outline">
          {t.common.clear}
        </a>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {t.hotels.resultsFor}: {cards.length} {t.hotels.resultsCount}
      </p>

      <div className="mt-4">
        {cards.length === 0 ? (
          <EmptyState title={t.hotels.noResultsTitle} body={t.hotels.noResultsBody} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} locale={locale} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
