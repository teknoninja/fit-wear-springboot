-- ============================================================================
-- Fit-Wear — catalog schema (products move from Sanity into Postgres)
--
-- HOW TO RUN:
--   Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--   Safe to re-run.
--
-- Run this AFTER supabase/schema.sql (it adds a foreign key to `wishlist`).
--
-- WHY IDS ARE `text` AND NOT `uuid`:
--   Your cart, wishlist and order_items already store Sanity document ids as
--   strings. Keeping a text primary key lets the 24 migrated products carry
--   their original Sanity id, so nothing anyone has already saved breaks.
--   New rows use prefixed ids: `dj-83` (imported), `gen-000123` (generated).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. CATEGORIES  (Fashion / Shoes / Men / Women)
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          text primary key,
  slug        text unique,
  title       text not null,
  image_url   text,
  sort_order  integer not null default 0
);

create table if not exists public.subcategories (
  id     text primary key,
  slug   text unique,
  title  text not null
);

-- A sub-category can sit under more than one category — "Jeans" belongs to both
-- Fashion and Women in your existing tree — so this is a join table, not a
-- parent_id column.
create table if not exists public.category_subcategories (
  category_id     text not null references public.categories (id) on delete cascade,
  subcategory_id  text not null references public.subcategories (id) on delete cascade,
  primary key (category_id, subcategory_id)
);


-- ----------------------------------------------------------------------------
-- 2. PRODUCTS
--
--    The extra columns over the old Sanity schema (brand, tags, rating, stock)
--    exist for the recommender: they are the features it will group and rank by.
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id            text primary key,
  slug          text unique,
  title         text not null,
  description   text,
  price         numeric(10, 2) not null,
  old_price     numeric(10, 2),
  brand         text,
  sku           text,
  rating        numeric(3, 2) not null default 0,
  review_count  integer not null default 0,
  stock         integer not null default 0,
  tags          text[] not null default '{}',
  -- images[1] is the card's main image, images[2] the hover image.
  images        text[] not null default '{}',
  is_new        boolean not null default false,
  -- Drives the "featured products" / "trending products" rows on the homepage.
  type          text check (type in ('featured', 'trending')),
  -- Where the row came from: 'sanity' | 'dummyjson' | 'generated' | 'manual'.
  -- Makes it easy to wipe just the demo data later:
  --   delete from products where source = 'generated';
  source        text not null default 'manual',
  created_at    timestamptz not null default now()
);

create index if not exists products_type_idx     on public.products (type);
create index if not exists products_price_idx    on public.products (price);
create index if not exists products_source_idx   on public.products (source);
create index if not exists products_brand_idx    on public.products (brand);
-- GIN index so `tags && array['denim']` stays fast as the catalog grows.
create index if not exists products_tags_idx     on public.products using gin (tags);
-- Full-text search over title + description, for a real search box later.
create index if not exists products_search_idx   on public.products
  using gin (to_tsvector('english', title || ' ' || coalesce(description, '')));

create table if not exists public.product_categories (
  product_id   text not null references public.products (id) on delete cascade,
  category_id  text not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists product_categories_category_idx
  on public.product_categories (category_id);

create table if not exists public.product_subcategories (
  product_id      text not null references public.products (id) on delete cascade,
  subcategory_id  text not null references public.subcategories (id) on delete cascade,
  primary key (product_id, subcategory_id)
);
create index if not exists product_subcategories_subcategory_idx
  on public.product_subcategories (subcategory_id);


-- ----------------------------------------------------------------------------
-- 3. REVIEWS
--    Imported reviews arrive with user_id null; reviews left by real customers
--    will carry theirs.
-- ----------------------------------------------------------------------------
create table if not exists public.product_reviews (
  id             uuid primary key default gen_random_uuid(),
  product_id     text not null references public.products (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,
  rating         integer not null check (rating between 1 and 5),
  comment        text,
  reviewer_name  text,
  created_at     timestamptz not null default now()
);
create index if not exists product_reviews_product_idx
  on public.product_reviews (product_id);


-- ----------------------------------------------------------------------------
-- 4. PRODUCT VIEWS  — behavioural data for the recommender
--
--    Worth creating NOW even though the recommender comes later: view history
--    cannot be backfilled. Every day this table does not exist is a day of
--    training data you can never recover.
--
--    session_id lets you track signed-out visitors too, which is most of your
--    traffic early on.
-- ----------------------------------------------------------------------------
create table if not exists public.product_views (
  id          bigserial primary key,
  user_id     uuid references auth.users (id) on delete cascade,
  session_id  text,
  product_id  text not null references public.products (id) on delete cascade,
  viewed_at   timestamptz not null default now()
);
create index if not exists product_views_user_idx
  on public.product_views (user_id, viewed_at desc);
create index if not exists product_views_product_idx
  on public.product_views (product_id);


-- ----------------------------------------------------------------------------
-- 5. LINK THE WISHLIST TO REAL PRODUCTS
--    Now that products live in the same database, the wishlist can have a real
--    foreign key — saved items disappear cleanly if a product is deleted.
--
--    order_items deliberately gets NO foreign key: an order is a historical
--    record and must survive the product being removed from the catalog.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wishlist_product_id_fkey'
  ) then
    alter table public.wishlist
      add constraint wishlist_product_id_fkey
      foreign key (product_id) references public.products (id) on delete cascade;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
--
--    The catalog is public — anyone may read it, signed in or not. Writes are
--    reserved for the service-role key (the import script and any future admin
--    tooling), which bypasses RLS.
-- ----------------------------------------------------------------------------
alter table public.categories             enable row level security;
alter table public.subcategories          enable row level security;
alter table public.category_subcategories enable row level security;
alter table public.products               enable row level security;
alter table public.product_categories     enable row level security;
alter table public.product_subcategories  enable row level security;
alter table public.product_reviews        enable row level security;
alter table public.product_views          enable row level security;

drop policy if exists "catalog: public read" on public.categories;
drop policy if exists "catalog: public read" on public.subcategories;
drop policy if exists "catalog: public read" on public.category_subcategories;
drop policy if exists "catalog: public read" on public.products;
drop policy if exists "catalog: public read" on public.product_categories;
drop policy if exists "catalog: public read" on public.product_subcategories;
drop policy if exists "catalog: public read" on public.product_reviews;

create policy "catalog: public read" on public.categories             for select using (true);
create policy "catalog: public read" on public.subcategories          for select using (true);
create policy "catalog: public read" on public.category_subcategories for select using (true);
create policy "catalog: public read" on public.products               for select using (true);
create policy "catalog: public read" on public.product_categories     for select using (true);
create policy "catalog: public read" on public.product_subcategories  for select using (true);
create policy "catalog: public read" on public.product_reviews        for select using (true);

-- Signed-in customers may leave a review under their own name.
drop policy if exists "own review: insert" on public.product_reviews;
drop policy if exists "own review: update" on public.product_reviews;
drop policy if exists "own review: delete" on public.product_reviews;

create policy "own review: insert" on public.product_reviews
  for insert with check (auth.uid() = user_id);
create policy "own review: update" on public.product_reviews
  for update using (auth.uid() = user_id);
create policy "own review: delete" on public.product_reviews
  for delete using (auth.uid() = user_id);

-- Views: anyone may log one (guests included, hence the `user_id is null`
-- branch), but nobody may attribute a view to a different user, and you can
-- only read back your own history.
drop policy if exists "views: insert own"  on public.product_views;
drop policy if exists "views: read own"    on public.product_views;

create policy "views: insert own" on public.product_views
  for insert with check (user_id is null or auth.uid() = user_id);
create policy "views: read own" on public.product_views
  for select using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 7. RECOMMENDER STARTER QUERIES
--    Not run here — copy these into the SQL editor when you start building.
--    They are the payoff for having products and behaviour in one database:
--    each is a single query instead of a cross-service round trip.
-- ----------------------------------------------------------------------------

-- (a) "Customers who bought this also bought" — collaborative filtering by
--     co-purchase, which needs no machine learning at all to be useful.
--
--   select p.*, count(*) as bought_together
--     from order_items a
--     join order_items b on a.order_id = b.order_id and b.product_id <> a.product_id
--     join products p on p.id = b.product_id
--    where a.product_id = 'some-product-id'
--    group by p.id
--    order by bought_together desc
--    limit 10;

-- (b) "More like this" — content-based, using shared tags and category.
--
--   select p.*, cardinality(p.tags & t.tags) as shared_tags
--     from products p, products t
--    where t.id = 'some-product-id' and p.id <> t.id
--      and p.tags && t.tags
--    order by shared_tags desc, abs(p.price - t.price)
--    limit 10;

-- (c) "Recommended for you" — from what the user has viewed but not bought.
--
--   select p.*, count(*) as affinity
--     from product_views v
--     join product_categories pc on pc.product_id = v.product_id
--     join product_categories pc2 on pc2.category_id = pc.category_id
--     join products p on p.id = pc2.product_id
--    where v.user_id = auth.uid()
--      and p.id not in (select product_id from product_views where user_id = auth.uid())
--    group by p.id
--    order by affinity desc
--    limit 10;


-- ----------------------------------------------------------------------------
-- 8. OPTIONAL — semantic similarity with pgvector
--
--    Run this block only once you have a way to generate embeddings (an
--    OpenAI/Cohere call, or a local sentence-transformers model). Until then it
--    would just be an empty column, so it is left commented out.
--
--    384 dimensions matches all-MiniLM-L6-v2, a good free local model.
-- ----------------------------------------------------------------------------
--
--   create extension if not exists vector;
--   alter table public.products add column if not exists embedding vector(384);
--   create index on public.products
--     using hnsw (embedding vector_cosine_ops);
--
--   -- then: select * from products
--   --        order by embedding <=> (select embedding from products where id = $1)
--   --        limit 10;
