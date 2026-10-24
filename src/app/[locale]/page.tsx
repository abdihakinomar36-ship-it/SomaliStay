import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import SearchBar from "@/components/SearchBar";
import HotelCard from "@/components/HotelCard";
import EmptyState from "@/components/EmptyState";

// Illustrative destination imagery (clearly labeled as such on the page).
// These photos do not depict any listed property.
const CITY_IMAGES: Record<string, string> = {
  mogadishu: "photo-1519046904884-53103b34b206",
  hargeisa: "photo-1464822759023-fed622ff2c3b",
  bosaso: "photo-1500375592092-40eb2168fd21",
  kismayo: "photo-1507525428034-b723cf961d3e",
  berbera: "photo-1473116763249-2faaef81ccda",
  garowe: "photo-1470770841072-f978cf4d019e",
  burao: "photo-1519681393784-d120267933ba",
  galkayo: "photo-1505761671935-60b3a7427bad",
  baidoa: "photo-1476514525535-07fb3b4ae5f1",
  merca: "photo-1505881502353-a199c4f6fd1b",
  "las-anod": "photo-1519681393784-d120267933ba",
  erigavo: "photo-1465146344425-f00d5f5c8f07",
  zeila: "photo-1507525428034-b723cf961d3e",
  beledweyne: "photo-1444723121867-7a241cace5b1",
};

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const [{ data: cities }, { data: hotels }] = await Promise.all([
    supabase.from("cities").select("id, name, name_so, region, slug").order("name"),
    supabase
      .from("hotels")
      .select(
        "id, slug, name, city:cities(name, name_so, region), rooms(price_per_night), hotel_images(is_cover, storage_path)"
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // compute cover photo + min price per hotel
  const hotelCards = (hotels ?? []).map((h) => {
    const rooms = (h.rooms ?? []) as Array<{ price_per_night: number | null }>;
    const prices = rooms.map((r) => r.price_per_night).filter((p): p is number => p != null);
    const cover = (h.hotel_images ?? []).find((i: { is_cover: boolean }) => i.is_cover);
    return {
      id: h.id,
      slug: h.slug,
      name: h.name,
      city_name:
        locale === "so"
          ? ((h.city as unknown as { name_so: string })?.name_so ?? "")
          : ((h.city as unknown as { name: string })?.name ?? ""),
      region: (h.city as unknown as { region: string | null })?.region ?? null,
      min_price: prices.length ? Math.min(...prices) : null,
      cover_url: null as string | null, // signed URLs resolved below for covers only
      cover_path: cover?.storage_path ?? null,
    };
  });

  // fetch signed URLs for cover photos (approved hotels only, enforced by storage RLS)
  const paths = hotelCards.map((h) => h.cover_path).filter((p): p is string => !!p);
  let signed = new Map<string, string>();
  if (paths.length > 0) {
    const { getSignedPhotoUrls } = await import("@/lib/photos");
    signed = await getSignedPhotoUrls(paths);
  }
  const cards = hotelCards.map((h) => ({
    ...h,
    cover_url: h.cover_path ? signed.get(h.cover_path) ?? null : null,
  }));

  const steps = [
    { title: t.home.step1Title, body: t.home.step1Body },
    { title: t.home.step2Title, body: t.home.step2Body },
    { title: t.home.step3Title, body: t.home.step3Body },
    { title: t.home.step4Title, body: t.home.step4Body },
  ];

  const featuredCities = (cities ?? []).slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0d2c40]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d2c40]/95 via-[#0d2c40]/80 to-brand-blue/60" aria-hidden="true" />
        <div className="container-page relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.home.heroBadge}
            </span>
            <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              {t.home.heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              {t.home.heroSubtitle}
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <SearchBar locale={locale} t={t} cities={cities ?? []} />
          </div>
          <p className="mt-4 text-center text-xs text-white/60">{t.footer.noPayment}</p>
        </div>
      </section>

      {/* Destinations */}
      <section className="container-page py-12 sm:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t.home.popularDestinations}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.home.destinationsHint}</p>
          </div>
          <Link href={`/${locale}/hotels`} className="hidden text-sm font-medium text-brand-blue hover:underline sm:block">
            {t.common.seeAll}
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {featuredCities.map((c) => (
            <Link
              key={c.id}
              href={`/${locale}/hotels?city=${c.id}`}
              className="group relative overflow-hidden rounded-2xl bg-slate-200 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-32 w-full sm:h-36">
                {CITY_IMAGES[c.slug] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://images.unsplash.com/${CITY_IMAGES[c.slug]}?auto=format&fit=crop&w=600&q=70`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-brand-green-light to-brand-blue-light" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
              </div>
              <span className="absolute left-3 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {t.home.illustrativeNote}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <strong className="block text-sm font-semibold text-white">
                  {locale === "so" ? c.name_so : c.name}
                </strong>
                <span className="text-xs text-white/80">{c.region}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hotels */}
      <section className="border-y border-slate-100 bg-slate-50 py-12 sm:py-16">
        <div className="container-page">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-slate-900">{t.home.featuredHotels}</h2>
            <Link href={`/${locale}/hotels`} className="text-sm font-medium text-brand-blue hover:underline">
              {t.common.seeAll}
            </Link>
          </div>
          <div className="mt-6">
            {cards.length === 0 ? (
              <EmptyState title={t.home.noHotelsTitle} body={t.home.noHotelsBody} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} locale={locale} t={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-12 sm:py-16">
        <h2 className="text-2xl font-bold text-slate-900">{t.home.howItWorks}</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partner CTA */}
      <section className="container-page pb-12 sm:pb-16">
        <div className="card flex flex-col items-start gap-6 bg-gradient-to-r from-[#0d2c40] to-brand-blue p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">{t.home.partnerCtaTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">{t.home.partnerCtaBody}</p>
          </div>
          <Link
            href={`/${locale}/partner`}
            className="shrink-0 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#0d2c40] transition-colors hover:bg-emerald-50"
          >
            {t.home.partnerCtaButton}
          </Link>
        </div>
      </section>

      {/* Trust */}
      <section className="container-page pb-12 sm:pb-16">
        <div className="card flex flex-col gap-2 border-brand-green/30 bg-brand-green-light/40 p-6">
          <h2 className="font-semibold text-brand-green-dark">{t.home.trustTitle}</h2>
          <p className="text-sm text-slate-700">{t.home.trustBody}</p>
        </div>
      </section>
    </div>
  );
}
