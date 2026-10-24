# SomaliStay — Hotel booking across Somalia

A bilingual (Somali / English) starter project for a real hotel discovery and booking-request platform.

## What is included
- Next.js App Router + TypeScript + Tailwind CSS starter
- Responsive homepage with city search and hotel cards
- Somali / English UI toggle (starter translations)
- Booking request form UI (requests require hotel confirmation)
- Supabase SQL schema with Row Level Security (RLS) starter policies
- Environment variable example
- Clear setup instructions

## Important data integrity note
The hotel cards in the starter are clearly marked as **sample/demo listings**. They are not real hotels, prices, availability, ratings, or confirmed booking offers. Remove them and import only hotel data you have verified or hotels that have been approved by your admin.

## Requirements
- Node.js 20+
- A Supabase project
- npm

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

The website runs in demo mode without Supabase credentials. Do not use demo mode for real bookings.

## Connect Supabase
1. Create a Supabase project.
2. In Project Settings → API, copy the Project URL and publishable/anon key into `.env.local`.
3. Open the Supabase SQL Editor and run `supabase/schema.sql`.
4. Configure Authentication → URL Configuration with your local and production URLs.
5. For production, enable email verification and configure a real email provider.
6. Deploy the project to a Next.js-compatible host and set the same environment variables there.

`.env.local` example:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Never put a Supabase `service_role` key or secret key in browser-visible variables or commit it to GitHub.

## Booking workflow
1. Guest submits a booking request.
2. The request is stored with status `pending`.
3. The hotel owner reviews it and accepts or rejects it.
4. Only after the owner confirms should the guest see the booking as confirmed.
5. Before enabling real requests, implement authenticated booking API/server actions and server-side validation, including date overlap checks and protection against double-booking.

The supplied UI is a starter, not a production-ready booking engine. The booking form currently provides a demo confirmation message and does not persist data until you connect the backend flow.

## Suggested next implementation steps
- Add Supabase Auth sign-up/sign-in and account roles (`guest`, `partner`, `admin`)
- Add secure partner hotel submission and image uploads
- Add admin approval queue
- Add booking API with transactional room availability checks
- Add notification emails/SMS
- Add audit logs, rate limits, privacy policy, terms, backups, and security review
