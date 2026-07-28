# Catalog Setup — moving products to Supabase

Products now live in Postgres alongside users, orders, wishlist and cart. This
is what makes a recommender a single SQL query instead of a cross-service
round trip.

Two steps, about five minutes.

---

## 1. Create the catalog tables

**Supabase dashboard → SQL Editor → New query** → paste all of
[`supabase/products-schema.sql`](supabase/products-schema.sql) → **Run**.

Run [`supabase/schema.sql`](supabase/schema.sql) first if you haven't — the
catalog file adds a foreign key to `wishlist`.

## 2. Import the products

The catalog is read-only to everyone except the service-role key, so the import
script needs that key. Get it from **Project Settings → API Keys → Secret keys**.

```bash
SUPABASE_URL=https://mwujewuqddkwoppdirbz.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_key_here \
node scripts/import-products.mjs
```

Takes about 30 seconds. Add `--dry-run` first if you want to see the plan
without writing anything.

Then:

```bash
cd client && npm run dev
```

---

## What gets imported

| Source | Count | What it is |
|---|---|---|
| `sanity` | 24 | Your existing products, migrated with their original ids |
| `dummyjson` | 49 | Real apparel — genuine titles, descriptions, brands, tags, ratings, 147 reviews |
| `generated` | 527 | Synthetic products built to reach the target size |
| **Total** | **600** | |

Your four categories (Fashion, Shoes, Men, Women) carry over unchanged, and six
new sub-categories are added to hold the imported items: Shirts, Watches,
Sunglasses, Bags, Dresses, Jewellery.

### Options

```bash
node scripts/import-products.mjs --target 1500   # bigger catalog
node scripts/import-products.mjs --no-generated  # only the 73 real products
node scripts/import-products.mjs --reset         # wipe and re-import
node scripts/import-products.mjs --dry-run       # plan only, no writes
```

To remove just the demo data later, keeping your own products:

```sql
delete from products where source = 'generated';
```

---

## Two decisions worth knowing about

**Product ids stayed `text`, not `uuid`.** Your cart, wishlist and order history
already store product ids as strings. Keeping text keys let the 24 migrated
products carry their original Sanity ids, so anything a customer had already
saved still resolves. Imported products use `dj-83`, generated ones
`gen-000123`.

**Generated products are not random.** Price is derived from garment type ×
material × brand tier, and tags come from those same attributes. That gives the
catalog real latent structure for a recommender to find — randomised prices
would leave nothing to learn. The generator is also seeded, so re-running
produces an identical catalog and a model you tuned yesterday is still being
evaluated against the same data today.

Their images are reused from the real imported products in the same
sub-category, so a generated pair of boots shows an actual boot. Images repeat
across the catalog — that's the visible tell that they're demo data.

---

## Building the recommender

Two things are already in place for it.

**`product_views` is collecting data now.** Every product page view is logged,
for signed-out visitors too (via a `localStorage` session id). This table exists
before the recommender does on purpose: view history cannot be backfilled, so
every day without it is training data you can never recover.

**Starter queries are in the schema file.** Section 7 of
[`products-schema.sql`](supabase/products-schema.sql) has working SQL for the
three standard approaches:

- *Customers who bought this also bought* — co-purchase counts over
  `order_items`. No machine learning needed, and usually the strongest signal
  once you have real orders.
- *More like this* — shared tags and price proximity.
- *Recommended for you* — categories you've browsed but not bought from.

Start with co-purchase. It is the simplest and tends to beat content-based
approaches as soon as you have enough orders.

When you want semantic similarity ("clothes that *feel* like this one"),
section 8 has the `pgvector` setup — commented out, since it's only worth
enabling once you have an embedding pipeline. `all-MiniLM-L6-v2` runs locally
for free and matches the 384 dimensions in that block.

---

## Notes

- **Sanity is no longer the product source of truth.** Sanity Studio will still
  show your original 24 products, but the site no longer reads them. Edits made
  in Studio will not appear on the site.
- **`client/src/sanityClient.js` is now unused.** Left in place rather than
  deleted, since the project isn't under version control — see below.
- **The Stripe webhook still writes an order copy into Sanity.** Harmless and
  non-fatal if it fails. Say the word if you'd rather drop it.
- **Editing products** without Studio: use the Supabase **Table Editor**, or ask
  for a small admin page.

> **You are not using git.** There's no repository in this project, so none of
> these changes are revertible and there's no history. Worth fixing before you
> go further:
> ```bash
> git init && git add -A && git commit -m "Auth + catalog on Supabase"
> ```
> `.gitignore` already excludes `.env` and `node_modules`.
