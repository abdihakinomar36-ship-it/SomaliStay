import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrls } from "@/lib/photos";
import BookingForm from "@/components/BookingForm";
import EmptyState from "@/components/EmptyState";
import { formatPrice, formatDate } from "@/lib/utils";

export default async function HotelDetailPage({
  params,
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams: { checkIn?: string; checkOut?: string; guests?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();

  const { data: hotel } = await supabase
    .from("hotels")
    .select(
      `id, slug, name, description, address, region, phone, email, website, amenities,
       city:cities(id, name, name_so, region),
       hotel_images(id, storage_path, caption, is_cover, sort_order),
       rooms(id, name, room_type, capacity, price_per_night, currency, amenities, description),
       reviews(id, rating, comment, created_at, guest:profile_public(full_name))`
    )
    .eq("slug", params.slug)
    .eq("status", "approved")
    .single();

  if (!hotel) notFound();

  const checkIn = searchParams.checkIn && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.checkIn) ? searchParams.checkIn : null;
  const checkOut = searchParams.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.checkOut) ? searchParams.checkOut : null;
  const guests = searchParams.guests && /^\d{1,2}$/.test(searchParams.guests) ? Number(searchParams.guests) : null;

  // signed URLs for all photos (approved hotel — allowed by storage RLS)
  const paths = (hotel.hotel_images ?? []).map((i) => i.storage_path);
  const signed = await getSignedPhotoUrls(paths);
  const images = (hotel.hotel_images ?? [])
    .slice()
    .sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0) || a.sort_order - b.sort_order);

  // availability per room for the chosen dates
  const roomsWithAvailability = await Promise.all(
    (hotel.rooms ?? []).map(async (room) => {
      let available = true;
      if (checkIn && checkOut) {
        const { data } = await supabase.rpc("check_room_availability", {
          p_room_id: room.id,
          p_check_in: checkIn,
          p_check_out: checkOut,
          p_guests: guests,
        });
        available = data === true;
      }
      return { ...room, available };
    })
  );

  const cityName = locale === "so"
    ? (hotel.city as unknown as { name_so: string }).name_so
    : (hotel.city as unknown as { name: string }).name;
  const cityRegion = (hotel.city as unknown as { region: string }).region;

  const reviews = (hotel.reviews ?? []) as unknown as Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    guest: { full_name: string | null } | null;
  }>;

  const avgRating =
    reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="container-page py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500">
        <Link href={`/${locale}`} className="hover:text-brand-green">{t.nav.home}</Link>
        <span className="mx-1">/</span>
        <Link href={`/${locale}/hotels`} className="hover:text-brand-green">{t.nav.hotels}</Link>
        <span className="mx-1">/</span>
        <span className="text-slate-700">{hotel.name}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{hotel.name}</h1>
          <p className="text-sm text-slate-500">
            {cityName}, {cityRegion}
            {hotel.address ? ` — ${hotel.address}` : ""}
          </p>
        </div>
        {avgRating && (
          <div className="badge bg-amber-100 text-amber-800">
            ★ {avgRating} · {reviews.length} {t.hotel.reviews}
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="mt-5">
        {images.length === 0 ? (
          <div className="flex h-56 w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand-green-light to-brand-blue-light text-sm text-slate-500">
            {t.hotel.noPhotos}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.slice(0, 4).map((img) => (
              <div key={img.id} className={img.is_cover ? "col-span-2 row-span-2" : ""}>
                {signed.get(img.storage_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signed.get(img.storage_path)!}
                    alt={img.caption ?? hotel.name}
                    className="h-40 w-full rounded-xl object-cover sm:h-full"
                  />
                ) : (
                  <div className="h-40 w-full rounded-xl bg-slate-100" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-8 lg:col-span-2">
          {/* About */}
          {hotel.description && (
            <section className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900">{t.hotel.about}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {hotel.description}
              </p>
            </section>
          )}

          {/* Amenities */}
          {(hotel.amenities ?? []).length > 0 && (
            <section className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900">{t.hotel.amenities}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(hotel.amenities ?? []).map((a: string) => (
                  <span key={a} className="badge bg-brand-green-light text-brand-green-dark">
                    {t.common.amenityLabels[a] ?? a.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Rooms */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">{t.hotel.rooms}</h2>
            <div className="mt-3 space-y-3">
              {roomsWithAvailability.length === 0 && (
                <EmptyState title={t.hotel.rooms} body={t.home.noHotelsBody} />
              )}
              {roomsWithAvailability.map((room) => (
                <div key={room.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{room.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{t.common.roomTypeLabels[room.room_type] ?? room.room_type}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.hotel.capacity}: {room.capacity}
                    </p>
                    {room.description && (
                      <p className="mt-1 max-w-md text-sm text-slate-600">{room.description}</p>
                    )}
                    {(room.amenities ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(room.amenities ?? []).map((a: string) => (
                          <span key={a} className="badge bg-slate-100 text-slate-600">{t.common.amenityLabels[a] ?? a.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                    {checkIn && checkOut && (
                      <p className={`mt-2 text-xs font-medium ${room.available ? "text-brand-green" : "text-red-600"}`}>
                        {room.available ? t.hotel.roomAvailable : t.hotel.roomUnavailable}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <p className="text-lg font-bold text-brand-green">
                      {formatPrice(room.price_per_night, room.currency)}
                      <span className="text-xs font-normal text-slate-500"> / {t.hotel.perNight}</span>
                    </p>
                    {room.available && (
                      <a
                        href={`#${room.id}`}
                        className="btn-primary !py-1.5 !text-xs"
                      >
                        {t.hotel.bookNow}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t.hotel.reviews}</h2>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">{t.hotel.noReviews}</p>
            ) : (
              <div className="mt-3 space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-t border-slate-100 pt-3 first:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      <span className="text-xs text-slate-500">
                        {r.guest?.full_name ?? "Guest"} · {formatDate(r.created_at, locale)}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Booking */}
          <section className="card sticky top-20 p-6" id="booking">
            <h2 className="text-lg font-semibold text-slate-900">{t.booking.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{t.booking.requestNote}</p>
            <BookingForm
              locale={locale}
              t={t}
              rooms={roomsWithAvailability.map((r) => ({
                id: r.id,
                name: r.name,
                capacity: r.capacity,
                price: r.price_per_night,
                currency: r.currency,
                available: r.available,
              }))}
              defaults={{ checkIn, checkOut, guests }}
            />
          </section>

          {/* Contact */}
          <section className="card p-6">
            <h2 className="font-semibold text-slate-900">{t.hotel.contactInfo}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {hotel.phone && (
                <div className="flex gap-2">
                  <dt className="text-slate-500">{t.common.phone}:</dt>
                  <dd className="font-medium">{hotel.phone}</dd>
                </div>
              )}
              {hotel.email && (
                <div className="flex gap-2">
                  <dt className="text-slate-500">{t.common.email}:</dt>
                  <dd className="font-medium">{hotel.email}</dd>
                </div>
              )}
              {hotel.website && (
                <div className="flex gap-2">
                  <dt className="text-slate-500">{t.common.website}:</dt>
                  <dd className="font-medium break-all">{hotel.website}</dd>
                </div>
              )}
              {hotel.address && (
                <div className="flex gap-2">
                  <dt className="text-slate-500">{t.common.address}:</dt>
                  <dd className="font-medium">{hotel.address}, {cityName}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
