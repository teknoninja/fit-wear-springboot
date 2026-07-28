-- ============================================================================
-- Fit-Wear — Supabase schema for user authorization
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard -> your project -> SQL Editor
--   2. Paste this whole file in and hit "Run".
--   3. It is safe to re-run: everything is idempotent.
--
-- Products still live in Sanity. Supabase owns the *user* side of the store:
-- who they are, what they bought, what they saved, and their cart.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. PROFILES
--    auth.users is managed by Supabase and we cannot add columns to it, so we
--    keep our own row per user, joined 1:1 on the user id.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  -- Shipping address, kept as one JSON blob so you can change its shape later
  -- without a migration. Expected keys: line1, line2, city, state, zip, country.
  address     jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. ORDERS + ORDER ITEMS
--    Written by the Stripe webhook (server side, service-role key) so that a
--    user can never fake a paid order. Read by the profile page.
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete set null,
  -- Kept even for guest checkouts, so a guest order can be claimed later.
  email              text,
  stripe_session_id  text unique,
  status             text not null default 'pending'
                       check (status in ('pending', 'paid', 'failed', 'refunded')),
  total              numeric(10, 2) not null default 0,
  currency           text not null default 'usd',
  shipping_address   jsonb,
  created_at         timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  text,                       -- the Sanity _id
  title       text not null,
  price       numeric(10, 2) not null,
  quantity    integer not null default 1,
  img         text
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);


-- ----------------------------------------------------------------------------
-- 3. WISHLIST
--    product_id is the Sanity document _id. We also snapshot title/price/img so
--    the wishlist page renders in one query without calling Sanity again.
-- ----------------------------------------------------------------------------
create table if not exists public.wishlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  product_id  text not null,
  title       text,
  price       numeric(10, 2),
  img         text,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)            -- can't save the same product twice
);

create index if not exists wishlist_user_id_idx on public.wishlist (user_id);


-- ----------------------------------------------------------------------------
-- 4. CARTS
--    One row per user. Lets a cart follow you from your laptop to your phone.
--    Stored as jsonb because the cart is always read and written whole.
-- ----------------------------------------------------------------------------
create table if not exists public.carts (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
--
--    This is the part that actually makes the app secure. The browser holds the
--    anon key, which is public by design — anyone can read it out of your JS
--    bundle. RLS is what stops someone with that key from reading every user's
--    orders: Postgres itself checks auth.uid() on every single row.
--
--    Never skip this. Without RLS these tables are world-readable.
-- ----------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlist    enable row level security;
alter table public.carts       enable row level security;

-- Drop-then-create so this file can be re-run safely.
drop policy if exists "own profile: read"   on public.profiles;
drop policy if exists "own profile: insert" on public.profiles;
drop policy if exists "own profile: update" on public.profiles;

create policy "own profile: read"   on public.profiles for select using  (auth.uid() = id);
create policy "own profile: insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile: update" on public.profiles for update using  (auth.uid() = id);

-- Orders are READ-ONLY to the client. There is deliberately no insert/update
-- policy: only the Stripe webhook (service-role key, which bypasses RLS) may
-- create them. A user cannot mark their own order paid.
drop policy if exists "own orders: read" on public.orders;
create policy "own orders: read" on public.orders for select using (auth.uid() = user_id);

drop policy if exists "own order items: read" on public.order_items;
create policy "own order items: read" on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  )
);

-- Wishlist is fully user-owned.
drop policy if exists "own wishlist: read"   on public.wishlist;
drop policy if exists "own wishlist: insert" on public.wishlist;
drop policy if exists "own wishlist: delete" on public.wishlist;

create policy "own wishlist: read"   on public.wishlist for select using      (auth.uid() = user_id);
create policy "own wishlist: insert" on public.wishlist for insert with check (auth.uid() = user_id);
create policy "own wishlist: delete" on public.wishlist for delete using      (auth.uid() = user_id);

-- Cart is fully user-owned.
drop policy if exists "own cart: read"   on public.carts;
drop policy if exists "own cart: write"  on public.carts;
drop policy if exists "own cart: update" on public.carts;
drop policy if exists "own cart: delete" on public.carts;

create policy "own cart: read"   on public.carts for select using      (auth.uid() = user_id);
create policy "own cart: write"  on public.carts for insert with check (auth.uid() = user_id);
create policy "own cart: update" on public.carts for update using      (auth.uid() = user_id);
create policy "own cart: delete" on public.carts for delete using      (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 6. AUTO-CREATE A PROFILE ON SIGN UP
--    Fires for every new auth.users row — email/password and Google alike — so
--    the app never has to handle a "user exists but profile doesn't" state.
--    Google puts the display name in raw_user_meta_data.full_name; our own
--    register form passes the same key, so one branch covers both.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 7. CLAIM GUEST ORDERS
--    If someone checked out as a guest and later registers with that same
--    email, attach those past orders to their new account.
-- ----------------------------------------------------------------------------
create or replace function public.claim_guest_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set user_id = new.id
   where user_id is null
     and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_claim_orders on auth.users;
create trigger on_auth_user_created_claim_orders
  after insert on auth.users
  for each row execute function public.claim_guest_orders();
