# SomaliStay

Hotel booking marketplace for Somalia. Guests search verified hotels and send
booking requests; hotel partners register and manage their properties; admins
review and approve listings.

**Live site:** https://somalistay.vercel.app
**Stack:** Next.js 14 (App Router, TypeScript) · Supabase (Auth, Postgres, Storage) · Tailwind CSS · Vercel

## Languages

English is the default language; Somali (`SO`) is fully supported. The visitor's
choice is stored in the `somalistay-locale` cookie and, when signed in, on their
profile. Switching languages keeps the visitor on the same page and preserves
form input that has not been submitted yet.

## Key flows

### Hotel partner registration (the fixed workflow)

1. A visitor clicks **For hotels → Register your hotel** and, if not signed in,
   is taken to sign-up with `?intent=partner`.
2. After creating the account, the confirmation email link carries the intended
   destination (`/auth/callback?next=/<locale>/partner/hotels/new`).
3. After the email is confirmed, the session is restored in the callback and the
   user lands **directly on the hotel registration form** — not the homepage.
4. The partner completes the submission in steps (property, description and
   facilities, rooms and prices, photos, review and submit). Every section saves
   independently, so an incomplete submission can be resumed later.
5. Submitting for review sets the listing to `pending_review`; it becomes
   publicly visible only after an administrator approves it.

Signing in normally routes users by role: admins to the admin dashboard,
partners to the partner dashboard, guests to their bookings page. Password reset
is available from the sign-in page (`/auth/forgot-password`).

### Bookings

Bookings are **requests**, not confirmed reservations. The hotel must accept a
request before it is confirmed. Availability (blocked dates and confirmed
overlapping bookings) is enforced by Postgres RPCs
(`create_booking_request`, `check_room_availability`, `respond_to_booking`)
inside single transactions, so concurrent requests cannot double-book a room.
**Online payment is not integrated** — no payment is taken on the site.

## Environment variables

Set these in `.env.local` (development) and in the Vercel project settings
(already configured):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key — safe for the browser, RLS protects data |
| `NEXT_PUBLIC_SITE_URL` | Public origin, used in auth email redirect links (e.g. `https://somalistay.vercel.app`) |

## Supabase

The database schema, RLS policies, security-definer functions, storage policies
and seed cities live in `supabase/migrations/` (applied to the production
project `nvwwkivdisyralcngglx`).

Public visitors can only read **approved** hotels; partners only manage their
own hotels; guests only see their own bookings; role changes and listing
approvals are admin-only RPCs; a Postgres exclusion constraint prevents two
confirmed bookings from overlapping on the same room.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
```

Note: for local email-confirmation testing, add `http://localhost:3000/auth/callback`
to the Supabase **Authentication → URL Configuration → Redirect URLs** list.

## Deployment

The production deployment runs on the existing Vercel project `somalistay`
(https://somalistay.vercel.app). This repository is the source of truth; deploys
happen via the Vercel CLI / dashboard.
