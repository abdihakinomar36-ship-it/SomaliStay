
-- SomaliStay starter schema for Supabase/PostgreSQL.
-- Run in Supabase SQL Editor. Review policies before production deployment.
create extension if not exists pgcrypto;

create type public.app_role as enum ('guest', 'partner', 'admin');
create type public.hotel_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'guest',
  created_at timestamptz not null default now()
);

create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text unique,
  description_so text,
  description_en text,
  address text,
  city text not null,
  region text,
  country text not null default 'Somalia',
  phone text,
  email text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  amenities text[] not null default '{}',
  status public.hotel_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hotel_images (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  description text,
  max_guests int not null default 2 check (max_guests > 0),
  quantity int not null default 1 check (quantity > 0),
  price_per_night numeric(12,2) not null check (price_per_night >= 0),
  currency char(3) not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  guest_id uuid not null references public.profiles(id) on delete restrict,
  hotel_id uuid not null references public.hotels(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  guests int not null default 1 check (guests > 0),
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  guest_message text,
  status public.booking_status not null default 'pending',
  hotel_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index hotels_city_idx on public.hotels (city);
create index hotels_status_idx on public.hotels (status);
create index rooms_hotel_idx on public.rooms (hotel_id);
create index bookings_guest_idx on public.bookings (guest_id);
create index bookings_hotel_idx on public.bookings (hotel_id);
create index bookings_dates_idx on public.bookings (check_in, check_out);

alter table public.profiles enable row level security;
alter table public.hotels enable row level security;
alter table public.hotel_images enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.admin_logs enable row level security;

-- Profiles: users may read/update their own profile. Role changes must be done securely server-side.
create policy "profile_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profile_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Public users may only see approved hotels.
create policy "public_read_approved_hotels" on public.hotels for select to anon, authenticated using (status = 'approved');
create policy "partner_read_own_hotels" on public.hotels for select to authenticated using (owner_id = auth.uid());
create policy "partner_create_pending_hotels" on public.hotels for insert to authenticated with check (owner_id = auth.uid() and status = 'pending');
create policy "partner_update_own_pending_hotels" on public.hotels for update to authenticated using (owner_id = auth.uid() and status in ('pending','rejected')) with check (owner_id = auth.uid() and status in ('pending','rejected'));

-- Images/rooms are public only if the parent hotel is approved; partners can manage their own property's data.
create policy "public_read_approved_images" on public.hotel_images for select to anon, authenticated using (
  exists (select 1 from public.hotels h where h.id = hotel_id and h.status = 'approved')
);
create policy "partner_manage_own_images" on public.hotel_images for all to authenticated using (
  exists (select 1 from public.hotels h where h.id = hotel_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.hotels h where h.id = hotel_id and h.owner_id = auth.uid())
);

create policy "public_read_approved_rooms" on public.rooms for select to anon, authenticated using (
  is_active and exists (select 1 from public.hotels h where h.id = hotel_id and h.status = 'approved')
);
create policy "partner_manage_own_rooms" on public.rooms for all to authenticated using (
  exists (select 1 from public.hotels h where h.id = hotel_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.hotels h where h.id = hotel_id and h.owner_id = auth.uid())
);

-- Guests can read their own bookings and submit requests as themselves.
create policy "guest_read_own_bookings" on public.bookings for select to authenticated using (guest_id = auth.uid());
create policy "guest_create_pending_booking" on public.bookings for insert to authenticated with check (guest_id = auth.uid() and status = 'pending');
create policy "guest_cancel_own_pending_booking" on public.bookings for update to authenticated using (guest_id = auth.uid() and status = 'pending') with check (guest_id = auth.uid() and status = 'cancelled');

-- Hotel owners can read booking requests for their own properties and respond.
create policy "owner_read_hotel_bookings" on public.bookings for select to authenticated using (
  exists (select 1 from public.hotels h where h.id = hotel_id and h.owner_id = auth.uid())
);
create policy "owner_respond_pending_bookings" on public.bookings for update to authenticated using (
  status = 'pending' and exists (select 1 from public.hotels h where h.id = hotel_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.hotels h where h.id = hotel_id and h.owner_id = auth.uid())
);

-- NOTE: Do not allow users to self-assign admin role. Create profiles via a trusted trigger/server flow.
-- Before production: implement admin-only policies using a secure role-check function, audit all admin actions,
-- and implement transactional availability checks to prevent overlapping bookings and double-booking.
