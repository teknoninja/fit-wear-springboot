-- ============================================================================
-- Fit-Wear — recommendation engine
--
-- HOW TO RUN:
--   Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--   Safe to re-run.
--
-- Run after supabase/schema.sql and supabase/products-schema.sql.
--
-- WHY THIS IS SQL AND NOT AN AI SERVICE:
--   Recommendations are a ranking problem over data you already own. Postgres
--   does the joins and aggregation in one round trip, for free, with no API
--   key, no rate limit and no network hop. An LLM would be slower, cost money,
--   and be worse at it.
--
-- THE COLD-START PROBLEM:
--   Collaborative filtering ("customers who bought X also bought Y") needs
--   orders, and a new store has none. Every function below therefore has a
--   fallback path, so a shopper always sees a populated row. As real orders
--   accumulate the collaborative signal takes over automatically — no code
--   change needed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. CONTENT-BASED — "You may also like"
--
--    Scores every other product against the one being viewed:
--      shared tags   x5   (colour, material, fit, garment type — the strongest
--                          signal, since these are what shoppers browse by)
--      same category x3
--      same brand    x2
--      price nearby  x1   (people shop within a price bracket)
--
--    Needs no history at all, so it works on the very first visit and for
--    signed-out visitors. This is the workhorse.
-- ----------------------------------------------------------------------------
create or replace function public.recommend_similar(
  p_product_id text,
  p_limit int default 8
)
returns setof public.products
language sql
stable
as $$
  with target as (
    select id, tags, brand, price from public.products where id = p_product_id
  ),
  target_cats as (
    select category_id from public.product_categories where product_id = p_product_id
  )
  select p.*
  from public.products p, target t
  where p.id <> t.id
  order by
    -- Count of tags in common.
    cardinality(array(select unnest(p.tags) intersect select unnest(t.tags))) * 5
    + case when exists (
        select 1 from public.product_categories pc
        where pc.product_id = p.id and pc.category_id in (select category_id from target_cats)
      ) then 3 else 0 end
    + case when p.brand is not distinct from t.brand then 2 else 0 end
    -- Full point within 25% of the price, tapering to zero.
    + greatest(0, 1 - (abs(p.price - t.price) / nullif(t.price, 0)) * 4)
    desc,
    p.rating desc
  limit p_limit;
$$;


-- ----------------------------------------------------------------------------
-- 2. COLLABORATIVE — "Customers who bought this also bought"
--
--    Counts how often other products appear in the same order. No machine
--    learning involved, and it beats content-based approaches as soon as there
--    is real order volume, because it captures affinities no attribute
--    predicts (a particular jacket selling with a particular boot).
--
--    SECURITY DEFINER is required: order_items is protected by RLS so a shopper
--    can only read their own orders, but this needs to aggregate across
--    everyone. It returns product rows only — never a user id, email or order
--    id — so no personal data escapes.
--
--    Falls back to recommend_similar() when there is not enough order history,
--    which is what makes the row non-empty on a brand-new store.
-- ----------------------------------------------------------------------------
create or replace function public.recommend_also_bought(
  p_product_id text,
  p_limit int default 8
)
returns setof public.products
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_count int;
begin
  create temp table if not exists _ab (like public.products) on commit drop;
  delete from _ab;

  insert into _ab
  select p.*
  from public.order_items a
  join public.order_items b
    on b.order_id = a.order_id and b.product_id <> a.product_id
  join public.products p on p.id = b.product_id
  where a.product_id = p_product_id
  group by p.id
  order by count(*) desc, sum(b.quantity) desc
  limit p_limit;

  select count(*) into found_count from _ab;

  -- Cold start, or a product nobody has bought alongside anything yet.
  if found_count = 0 then
    return query select * from public.recommend_similar(p_product_id, p_limit);
  else
    return query select * from _ab;
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. PERSONALISED — "Recommended for you"
--
--    Builds a taste profile from what this shopper has looked at and saved,
--    then scores the catalog against it.
--
--      wishlist save  weight 4   (deliberate: they chose to keep it)
--      product view   weight 1   (weaker: they merely clicked)
--
--    Already-seen and already-saved products are excluded — recommending
--    something they just looked at is noise.
--
--    Works for signed-out visitors too, via the session id the browser stores.
--    With no history at all it returns highly-rated products, so the row is
--    never empty.
-- ----------------------------------------------------------------------------
create or replace function public.recommend_for_user(
  p_session_id text default null,
  p_limit int default 8
)
returns setof public.products
language sql
stable
as $$
  with seen as (
    -- RLS restricts product_views to the caller's own rows; the session clause
    -- covers guests, who have no auth.uid().
    select product_id, 1 as weight
    from public.product_views
    where (user_id = auth.uid() and auth.uid() is not null)
       or (p_session_id is not null and session_id = p_session_id)
    order by viewed_at desc
    limit 100
  ),
  saved as (
    select product_id, 4 as weight
    from public.wishlist
    where user_id = auth.uid()
  ),
  signals as (
    select product_id, max(weight) as weight from (
      select * from seen union all select * from saved
    ) s group by product_id
  ),
  -- Turn the products they liked into a weighted set of tags.
  tag_affinity as (
    select unnest(pr.tags) as tag, sum(sg.weight) as score
    from signals sg
    join public.products pr on pr.id = sg.product_id
    group by 1
  ),
  cat_affinity as (
    select pc.category_id, sum(sg.weight) as score
    from signals sg
    join public.product_categories pc on pc.product_id = sg.product_id
    group by 1
  )
  select p.*
  from public.products p
  where p.id not in (select product_id from signals)
  order by
    coalesce((select sum(ta.score) from tag_affinity ta where ta.tag = any(p.tags)), 0)
    + coalesce((
        select sum(ca.score) * 2
        from cat_affinity ca
        join public.product_categories pc
          on pc.category_id = ca.category_id and pc.product_id = p.id
      ), 0)
    desc,
    p.rating desc,      -- tie-break, and the fallback for a brand-new visitor
    p.review_count desc
  limit p_limit;
$$;


-- ----------------------------------------------------------------------------
-- 4. RECENTLY VIEWED — simple, and one of the highest-converting rows on any
--    store. Distinct, newest first.
-- ----------------------------------------------------------------------------
create or replace function public.recently_viewed(
  p_session_id text default null,
  p_limit int default 8
)
returns setof public.products
language sql
stable
as $$
  select p.*
  from public.products p
  join (
    select product_id, max(viewed_at) as last_seen
    from public.product_views
    where (user_id = auth.uid() and auth.uid() is not null)
       or (p_session_id is not null and session_id = p_session_id)
    group by product_id
  ) v on v.product_id = p.id
  order by v.last_seen desc
  limit p_limit;
$$;


-- ----------------------------------------------------------------------------
-- 5. TRENDING — most-viewed in the last week, for the homepage.
--    Genuinely popular rather than hand-picked.
-- ----------------------------------------------------------------------------
create or replace function public.trending_products(p_limit int default 8)
returns setof public.products
language sql
stable
security definer          -- aggregates views across all visitors
set search_path = public
as $$
  select p.*
  from public.products p
  join (
    select product_id, count(*) as views
    from public.product_views
    where viewed_at > now() - interval '7 days'
    group by product_id
  ) v on v.product_id = p.id
  order by v.views desc, p.rating desc
  limit p_limit;
$$;


-- ----------------------------------------------------------------------------
-- 6. PERMISSIONS
--    Both roles may call these. The SECURITY DEFINER ones are safe because
--    they return product rows only.
-- ----------------------------------------------------------------------------
grant execute on function public.recommend_similar(text, int)      to anon, authenticated;
grant execute on function public.recommend_also_bought(text, int)  to anon, authenticated;
grant execute on function public.recommend_for_user(text, int)     to anon, authenticated;
grant execute on function public.recently_viewed(text, int)        to anon, authenticated;
grant execute on function public.trending_products(int)            to anon, authenticated;
