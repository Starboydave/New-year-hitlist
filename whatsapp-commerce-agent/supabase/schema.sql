-- WhatsApp Conversational Commerce Agent — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push` as a migration).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users: one row per WhatsApp customer, keyed by their WhatsApp number (wa_id)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,            -- E.164 digits without '+', as sent by Meta (e.g. 2348012345678)
  name        text,                             -- WhatsApp profile name
  email       text,                             -- optional; Paystack requires an email, a placeholder is used if null
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Services: the catalogue shown in the WhatsApp interactive list
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                   -- shown as the list row title (WhatsApp truncates at 24 chars)
  description  text,                            -- shown as the row description (max 72 chars)
  price        numeric(12, 2) not null check (price > 0),  -- in major units (e.g. Naira)
  currency     text not null default 'NGN',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bookings: created as 'pending' when a payment link is issued,
-- flipped to 'paid' by the Paystack charge.success webhook
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('pending', 'paid');
  end if;
end$$;

create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  service_id          uuid not null references public.services(id) on delete restrict,
  status              public.booking_status not null default 'pending',
  amount              numeric(12, 2) not null,  -- price snapshot at booking time
  currency            text not null default 'NGN',
  paystack_reference  text not null unique,
  payment_url         text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_status_idx  on public.bookings (status);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: the server uses the service_role key (bypasses RLS).
-- Enabling RLS with no policies keeps the anon key from reading/writing.
-- ---------------------------------------------------------------------------
alter table public.users    enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;

-- ---------------------------------------------------------------------------
-- Sample catalogue (safe to delete)
-- ---------------------------------------------------------------------------
insert into public.services (name, description, price)
select * from (values
  ('Haircut',         'Classic cut and style, 45 mins',      5000.00),
  ('Beard Trim',      'Shape-up and hot towel finish',       2500.00),
  ('Full Grooming',   'Haircut, beard trim and facial',     10000.00)
) as seed(name, description, price)
where not exists (select 1 from public.services);
