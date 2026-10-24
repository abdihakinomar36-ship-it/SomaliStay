-- SomaliStay migration 0001: core schema
-- Project: somalistay (nvwwkivdisyralcngglx) — independent from any other platform

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ============ cities (verified geographic reference data only) ============
create table public.cities (
  id int primary key generated always as identity,
  name text not null unique,
  name_so text not null,
  region text not null,
  slug text not null unique
);

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (coalesce(char_length(full_name), 0) <= 120),
  phone text,
  preferred_locale text not null default 'so' check (preferred_locale in ('so','en')),
  role text not null default 'guest' check (role in ('guest','partner','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ hotels ============
create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  description text check (coalesce(char_length(description), 0) <= 5000),
  city_id int not null references public.cities(id),
  address text check (coalesce(char_length(address), 0) <= 300),
  region text,
  phone text,
  email text,
  website text,
  amenities text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft','pending_review','approved','rejected','suspended')),
  needs_re_review boolean not null default false,
  admin_notes text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hotels_owner_idx on public.hotels (owner_id);
create index hotels_status_idx on public.hotels (status);
create index hotels_city_idx on public.hotels (city_id);

-- ============ hotel_images ============
create table public.hotel_images (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  storage_path text not null,
  caption text check (coalesce(char_length(caption), 0) <= 200),
  sort_order int not null default 0,
  is_cover boolean not null default false,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index hotel_images_hotel_idx on public.hotel_images (hotel_id);

-- ============ rooms (each row = one bookable unit) ============
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  room_type text not null check (room_type in ('single','double','twin','suite','family','deluxe')),
  capacity int not null check (capacity between 1 and 12),
  price_per_night numeric(10,2) not null check (price_per_night > 0),
  currency text not null default 'USD',
  amenities text[] not null default '{}',
  description text check (coalesce(char_length(description), 0) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rooms_hotel_idx on public.rooms (hotel_id);

-- ============ room_blocked_dates (owner-managed availability) ============
create table public.room_blocked_dates (
  room_id uuid not null references public.rooms(id) on delete cascade,
  date date not null,
  reason text check (coalesce(char_length(reason), 0) <= 200),
  primary key (room_id, date)
);

-- ============ bookings ============
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  hotel_id uuid not null references public.hotels(id),
  room_id uuid not null references public.rooms(id),
  guest_id uuid not null references public.profiles(id),
  check_in date not null,
  check_out date not null,
  guests int not null check (guests between 1 and 12),
  nights int not null,
  price_per_night numeric(10,2) not null,
  total_price numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending','confirmed','rejected','cancelled')),
  special_requests text check (coalesce(char_length(special_requests), 0) <= 1000),
  contact_name text not null,
  contact_phone text,
  contact_email text,
  owner_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_dates check (check_out > check_in),
  constraint bookings_nights check (nights = (check_out - check_in) and nights between 1 and 30)
);
create index bookings_room_idx on public.bookings (room_id, check_in);
create index bookings_guest_idx on public.bookings (guest_id);
create index bookings_hotel_idx on public.bookings (hotel_id);

-- Double-booking prevention: a room cannot have two CONFIRMED bookings
-- whose date ranges overlap. Pending requests do not reserve inventory.
alter table public.bookings
  add constraint bookings_no_double_booking
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status = 'confirmed');

-- ============ booking_messages (guest <-> hotel communication) ============
create table public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index booking_messages_booking_idx on public.booking_messages (booking_id);

-- ============ booking_status_history ============
create table public.booking_status_history (
  id bigint primary key generated always as identity,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);
create index booking_status_history_booking_idx on public.booking_status_history (booking_id);

-- ============ reviews ============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  guest_id uuid not null references public.profiles(id),
  booking_id uuid not null references public.bookings(id),
  rating int not null check (rating between 1 and 5),
  comment text check (coalesce(char_length(comment), 0) <= 2000),
  created_at timestamptz not null default now(),
  constraint reviews_one_per_booking unique (booking_id)
);

-- ============ reports (complaints) ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  hotel_id uuid references public.hotels(id),
  booking_id uuid references public.bookings(id),
  subject text not null check (char_length(subject) between 3 and 200),
  body text not null check (char_length(body) between 10 and 3000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

-- ============ admin_audit_logs ============
create table public.admin_audit_logs (
  id bigint primary key generated always as identity,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
