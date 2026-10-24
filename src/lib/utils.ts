export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base.length > 0 ? `${base}-${suffix}` : `hotel-${suffix}`;
}

export function formatDate(iso: string | Date, locale: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(locale === "so" ? "en-GB" : locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPrice(value: number | string, currency = "USD"): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.round((b - a) / 86400000);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const ROOM_TYPES = [
  "single",
  "double",
  "twin",
  "suite",
  "family",
  "deluxe",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const AMENITIES = [
  "wifi",
  "breakfast",
  "parking",
  "pool",
  "ac",
  "restaurant",
  "gym",
  "spa",
  "beach_access",
  "airport_shuttle",
  "laundry",
  "bar",
  "room_service",
  "security",
  "generator",
  "meeting_rooms",
] as const;
export type Amenity = (typeof AMENITIES)[number];
