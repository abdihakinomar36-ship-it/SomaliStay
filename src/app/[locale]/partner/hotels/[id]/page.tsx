import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrls } from "@/lib/photos";
import HotelForm from "@/components/HotelForm";
import RoomForm from "@/components/RoomForm";
import ImageUploader from "@/components/ImageUploader";
import BlockDatesForm from "@/components/BlockDatesForm";
import SubmitForReviewButton from "@/components/SubmitForReviewButton";
import StatusBadge from "@/components/StatusBadge";
import { ConfirmSubmitButton } from "@/components/ConfirmControls";
import { deleteRoomAction, deleteHotelAction, unblockDatesAction } from "@/actions/hotels";
import { formatDate, formatPrice } from "@/lib/utils";

export default async function PartnerHotelPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in?intent=partner`);

  const { data: hotel } = await supabase
    .from("hotels")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();
  if (!hotel) notFound();

  const [{ data: cities }, { data: rooms }, { data: images }] = await Promise.all([
    supabase.from("cities").select("id, name, name_so, region").order("name"),
    supabase.from("rooms").select("*").eq("hotel_id", hotel.id).order("created_at"),
    supabase.from("hotel_images").select("*").eq("hotel_id", hotel.id).order("sort_order"),
  ]);

  const signed = await getSignedPhotoUrls((images ?? []).map((i) => i.storage_path));

  // blocked dates for all rooms of this hotel
  const roomIds = (rooms ?? []).map((r) => r.id);
  const { data: blocked } = roomIds.length
    ? await supabase
        .from("room_blocked_dates")
        .select("room_id, date, reason")
        .in("room_id", roomIds)
        .order("date")
    : { data: null };

  const statusLabels: Record<string, string> = {
    draft: t.statuses.draft,
    pending_review: t.statuses.pending_review,
    approved: t.statuses.approved,
    rejected: t.statuses.rejected,
    suspended: t.statuses.suspended,
  };

  const canSubmit = ["draft", "rejected"].includes(hotel.status);
  const city = cities?.find((c) => c.id === hotel.city_id);

  const steps = [
    { id: "step-1", label: t.partner.wizardStep1 },
    { id: "step-2", label: t.partner.wizardStep2 },
    { id: "step-3", label: t.partner.wizardStep3 },
    { id: "step-4", label: t.partner.wizardStep4 },
    { id: "step-5", label: t.partner.wizardStep5 },
  ];

  return (
    <div className="container-page max-w-4xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${locale}/partner`} className="text-sm text-brand-blue">
            ← {t.partner.myHotels}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{hotel.name}</h1>
            <StatusBadge status={hotel.status} label={statusLabels[hotel.status] ?? hotel.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hotel.status === "approved" && (
            <Link href={`/${locale}/hotels/${hotel.slug}`} className="btn-outline !py-1.5 !text-xs">
              {t.common.viewDetails}
            </Link>
          )}
          <form action={deleteHotelAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="hotelId" value={hotel.id} />
            <ConfirmSubmitButton className="btn-danger !py-1.5 !text-xs" confirmMessage={t.booking.cancelConfirm}>
              {t.common.delete}
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      {hotel.status === "rejected" && hotel.rejection_reason && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {t.partner.rejectionReason}: {hotel.rejection_reason}
        </p>
      )}
      {hotel.admin_notes && (
        <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          {t.partner.adminNotes}: {hotel.admin_notes}
        </p>
      )}

      {/* Wizard step navigation */}
      <nav aria-label={t.partner.dashboard} className="card mt-6 p-4">
        <p className="text-xs text-slate-500">{t.partner.wizardHint}</p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-green hover:text-brand-green"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green text-[10px] text-white">
                  {i + 1}
                </span>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Steps 1 + 2 — property information, description & facilities */}
      <section id="step-1" className="card mt-6 scroll-mt-24 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs text-white">1</span>
          {t.partner.wizardStep1}
        </h2>
        <div className="mt-4">
          <HotelForm
            locale={locale}
            t={t}
            cities={cities ?? []}
            values={{
              id: hotel.id,
              name: hotel.name,
              cityId: hotel.city_id,
              description: hotel.description ?? "",
              address: hotel.address ?? "",
              region: hotel.region ?? "",
              phone: hotel.phone ?? "",
              email: hotel.email ?? "",
              website: hotel.website ?? "",
              amenities: hotel.amenities ?? [],
            }}
          />
        </div>
      </section>

      {/* Step 3 — rooms and prices */}
      <section id="step-3" className="card mt-6 scroll-mt-24 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs text-white">3</span>
          {t.partner.wizardStep3}
        </h2>
        <div className="mt-4 space-y-6">
          {(rooms ?? []).map((room) => (
            <div key={room.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{room.name}</h3>
                <form action={deleteRoomAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="hotelId" value={hotel.id} />
                  <input type="hidden" name="roomId" value={room.id} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    {t.common.delete}
                  </button>
                </form>
              </div>
              <div className="mt-3">
                <RoomForm
                  locale={locale}
                  t={t}
                  hotelId={hotel.id}
                  values={{
                    id: room.id,
                    name: room.name,
                    room_type: room.room_type,
                    capacity: room.capacity,
                    price_per_night: Number(room.price_per_night),
                    currency: room.currency,
                    description: room.description ?? "",
                    amenities: room.amenities ?? [],
                  }}
                />
              </div>
              {/* Availability */}
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600">{t.partner.availability}</p>
                <p className="mt-0.5 text-xs text-slate-400">{t.partner.availabilityHint}</p>
                <div className="mt-2">
                  <BlockDatesForm locale={locale} t={t} roomId={room.id} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(blocked ?? [])
                    .filter((b) => b.room_id === room.id)
                    .map((b) => (
                      <span
                        key={b.date}
                        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
                      >
                        {formatDate(b.date, locale)}
                        <form action={unblockDatesAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="hotelId" value={hotel.id} />
                          <input type="hidden" name="roomId" value={room.id} />
                          <input type="hidden" name="date" value={b.date} />
                          <button type="submit" className="text-red-400 hover:text-red-600">
                            ×
                          </button>
                        </form>
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))}

          {/* New room */}
          <div className="rounded-xl border border-dashed border-slate-300 p-4">
            <h3 className="font-semibold text-slate-900">{t.partner.addRoom}</h3>
            <div className="mt-3">
              <RoomForm locale={locale} t={t} hotelId={hotel.id} />
            </div>
          </div>
        </div>
      </section>

      {/* Step 4 — photographs */}
      <section id="step-4" className="card mt-6 scroll-mt-24 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs text-white">4</span>
          {t.partner.wizardStep4}
        </h2>
        <div className="mt-4">
          <ImageUploader
            locale={locale}
            t={t}
            hotelId={hotel.id}
            userId={user.id}
            images={(images ?? []).map((i) => ({
              id: i.id,
              storage_path: i.storage_path,
              caption: i.caption,
              is_cover: i.is_cover,
              signed_url: signed.get(i.storage_path) ?? null,
            }))}
          />
        </div>
      </section>

      {/* Step 5 — review and submit */}
      <section id="step-5" className="card mt-6 scroll-mt-24 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs text-white">5</span>
          {t.partner.wizardStep5}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{t.partner.hotelName}</dt>
            <dd className="font-semibold text-slate-900">{hotel.name}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{t.partner.city}</dt>
            <dd className="font-semibold text-slate-900">
              {city ? (locale === "so" ? city.name_so : city.name) : "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{t.partner.rooms}</dt>
            <dd className="font-semibold text-slate-900">{rooms?.length ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{t.partner.images}</dt>
            <dd className="font-semibold text-slate-900">{images?.length ?? 0}</dd>
          </div>
        </dl>
        {(rooms ?? []).length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {(rooms ?? []).map((r) => (
              <li key={r.id}>
                {r.name} — {formatPrice(r.price_per_night, r.currency)} / {t.common.perNight}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-slate-600">{t.partner.statusExplanation[hotel.status as "draft"]}</p>
        {canSubmit && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-blue/30 bg-brand-blue-light/40 p-4">
            <p className="max-w-lg text-sm text-slate-600">{t.partner.submitForReview}</p>
            <SubmitForReviewButton locale={locale} t={t} hotelId={hotel.id} />
          </div>
        )}
      </section>
    </div>
  );
}
