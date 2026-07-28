#!/usr/bin/env node
/**
 * Seed the Supabase catalog.
 *
 *   1. Migrates your existing Sanity products, categories and sub-categories
 *      (keeping their original ids so saved carts and wishlists keep working).
 *   2. Imports the real apparel products from DummyJSON — authentic titles,
 *      descriptions, brands, tags, ratings and reviews.
 *   3. Generates additional products to reach a target catalog size.
 *
 * USAGE
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
 *   node scripts/import-products.mjs
 *
 * OPTIONS
 *   --target 600     total catalog size to aim for      (default 600)
 *   --no-generated   import real products only, skip generation
 *   --reset          delete previously imported/generated rows first
 *   --dry-run        report what it would do, write nothing
 *
 * The service-role key is required because the catalog tables are read-only to
 * everyone else. Never put that key in client/.env — pass it on the command
 * line, or keep it in a root .env this script reads.
 *
 * Re-running is safe: everything upserts on primary key.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// --- config -----------------------------------------------------------------

const SANITY_PROJECT_ID = process.env.VITE_SANITY_PROJECT_ID || "y4feni72";
const SANITY_DATASET = process.env.VITE_SANITY_DATASET || "production";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const TARGET = parseInt(opt("--target", "600"), 10);
const SKIP_GENERATED = flag("--no-generated");
const RESET = flag("--reset");
const DRY_RUN = flag("--dry-run");

// Load a root .env if present, so the keys can live in a file instead of the
// shell history. Deliberately minimal — no dependency on dotenv.
const loadDotEnv = () => {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
};
loadDotEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || (!SERVICE_KEY && !DRY_RUN)) {
  console.error(`
Missing credentials.

  SUPABASE_URL                 ${SUPABASE_URL ? "ok" : "MISSING"}
  SUPABASE_SERVICE_ROLE_KEY    ${SERVICE_KEY ? "ok" : "MISSING"}

Find them at: Supabase dashboard -> Project Settings -> Data API (URL)
              and -> API Keys -> Secret keys (service role).

Then run:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-products.mjs
`);
  process.exit(1);
};

const db = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const log = (...m) => console.log(...m);

// --- deterministic randomness -----------------------------------------------
// A seeded PRNG so re-running produces the same catalog. Without this, every
// run would generate different products and any recommender you tuned against
// the old data would quietly be evaluating against a different catalog.
let seed = 20240719;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
};
const round2 = (n) => Math.round(n * 100) / 100;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

// --- step 1: pull the existing Sanity catalog -------------------------------

const sanityQuery = async (query) => {
  const url =
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-03-11/data/query/${SANITY_DATASET}` +
    `?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result;
};

const fetchSanityCatalog = async () => {
  log("Reading the existing Sanity catalog…");

  const [categories, subcategories, products] = await Promise.all([
    sanityQuery(
      `*[_type=="category"]{_id,title,"imageUrl":image.asset->url,"subIds":subCategories[]._ref}`
    ),
    sanityQuery(`*[_type=="subCategory"]{_id,title}`),
    sanityQuery(`*[_type=="product"]{
      _id,title,desc,price,oldPrice,isNew,type,
      "img":img.asset->url,"img2":img2.asset->url,
      "catIds":categories[]._ref,"subIds":subCategories[]._ref
    }`),
  ]);

  log(
    `  ${products.length} products, ${categories.length} categories, ` +
      `${subcategories.length} sub-categories`
  );
  return { categories, subcategories, products };
};

// --- step 2: the real apparel products from DummyJSON -----------------------

// Only the clothing/shoes/accessory categories. DummyJSON's other categories
// are groceries, laptops and furniture, which do not belong in this store.
const DUMMY_CATEGORIES = [
  "mens-shirts",
  "mens-shoes",
  "mens-watches",
  "sunglasses",
  "tops",
  "womens-bags",
  "womens-dresses",
  "womens-jewellery",
  "womens-shoes",
  "womens-watches",
];

// How each external category maps onto your existing Fashion/Shoes/Men/Women
// tree, plus the sub-category label it should sit under.
//
// NOTE ON `tops`: despite the name, every product in DummyJSON's "tops"
// category is a dress ("Blue Frock", "Gray Dress", "Tartan Dress"...). It maps
// to Dresses, not T-shirts — mapping it by name put women's dresses in the
// men's T-shirt listing.
const CATEGORY_MAP = {
  "mens-shirts": { cats: ["Men", "Fashion"], sub: "Shirts" },
  "mens-shoes": { cats: ["Men", "Shoes"], sub: "shoes" },
  "mens-watches": { cats: ["Men"], sub: "Watches" },
  sunglasses: { cats: ["Fashion"], sub: "Sunglasses" },
  tops: { cats: ["Women", "Fashion"], sub: "Dresses" },
  "womens-bags": { cats: ["Women"], sub: "Bags" },
  "womens-dresses": { cats: ["Women", "Fashion"], sub: "Dresses" },
  "womens-jewellery": { cats: ["Women"], sub: "Jewellery" },
  "womens-shoes": { cats: ["Women", "Shoes"], sub: "shoes" },
  "womens-watches": { cats: ["Women"], sub: "Watches" },
};

const fetchDummyProducts = async () => {
  log("Fetching real apparel products from DummyJSON…");
  const all = [];

  for (const category of DUMMY_CATEGORIES) {
    const res = await fetch(
      `https://dummyjson.com/products/category/${category}?limit=0`
    );
    if (!res.ok) {
      console.warn(`  ! skipped ${category} (HTTP ${res.status})`);
      continue;
    }
    const { products } = await res.json();
    all.push(...products.map((p) => ({ ...p, sourceCategory: category })));
  }

  log(`  ${all.length} products across ${DUMMY_CATEGORIES.length} categories`);
  return all;
};

// --- step 3: generated products ---------------------------------------------
//
// The attributes below are not decorative. Price is derived from garment base
// cost x material multiplier x brand tier, and tags come from the same
// attributes — so the catalog contains real latent structure for a recommender
// to find. Randomising price independently of attributes would leave nothing
// to learn.

const MATERIALS = [
  { name: "Cotton", mult: 1.0 },
  { name: "Linen", mult: 1.25 },
  { name: "Denim", mult: 1.15 },
  { name: "Silk", mult: 2.1 },
  { name: "Wool", mult: 1.8 },
  { name: "Cashmere", mult: 3.2 },
  { name: "Leather", mult: 2.6 },
  { name: "Suede", mult: 2.3 },
  { name: "Corduroy", mult: 1.3 },
  { name: "Chiffon", mult: 1.4 },
];

const COLORS = [
  "Black", "Ivory", "Charcoal", "Navy", "Olive", "Burgundy", "Rust",
  "Sand", "Slate", "Forest", "Blush", "Mustard", "Teal", "Cream", "Indigo",
];

const FITS = ["Slim", "Relaxed", "Oversized", "Tailored", "Classic", "Cropped"];

const BRANDS = [
  { name: "Aurelia", tier: 1.0 },
  { name: "Northbound", tier: 1.1 },
  { name: "Maison Rue", tier: 2.4 },
  { name: "Common Thread", tier: 0.85 },
  { name: "Atlas & Co", tier: 1.5 },
  { name: "Lumen", tier: 1.3 },
  { name: "Verano", tier: 1.7 },
  { name: "Halden", tier: 0.95 },
  { name: "Sable Row", tier: 2.0 },
  { name: "Kestrel", tier: 1.2 },
];

// Garment types, each tied to the category and sub-category it belongs in.
//
// `imgFrom` lists which image pools this garment may borrow photos from, most
// appropriate first. Pool keys are either a DummyJSON source category
// ("mens-shoes") or one of your own Sanity sub-categories ("sanity:Jackets").
//
// This mapping is explicit rather than derived from `sub` because the two do
// not line up: DummyJSON has no jeans, suits or sarees, while your original
// catalog does — and its "tops" category is dresses. Deriving the image source
// from the sub-category name is what put dress photos on men's T-shirts.
const GARMENTS = [
  { name: "Shirt",        base: 42,  cats: ["Men", "Fashion"],    sub: "Shirts",     imgFrom: ["mens-shirts"],                    tags: ["clothing", "shirts", "tops"] },
  { name: "Oxford Shirt", base: 55,  cats: ["Men", "Fashion"],    sub: "Shirts",     imgFrom: ["mens-shirts"],                    tags: ["clothing", "shirts", "formal"] },
  { name: "T-Shirt",      base: 24,  cats: ["Fashion", "Men"],    sub: "T-shirts",   imgFrom: ["mens-shirts"],                    tags: ["clothing", "t-shirts", "casual"] },
  { name: "Crop Top",     base: 28,  cats: ["Women", "Fashion"],  sub: "crop top",   imgFrom: ["sanity:crop top"],                tags: ["clothing", "tops", "casual"] },
  { name: "Blazer",       base: 120, cats: ["Men"],               sub: "Jackets",    imgFrom: ["sanity:Suits", "sanity:Jackets"], tags: ["clothing", "outerwear", "formal"] },
  { name: "Jacket",       base: 98,  cats: ["Men", "Fashion"],    sub: "Jackets",    imgFrom: ["sanity:Jackets"],                 tags: ["clothing", "outerwear"] },
  { name: "Two-Piece Suit", base: 210, cats: ["Men"],             sub: "Suits",      imgFrom: ["sanity:Suits"],                   tags: ["clothing", "formal", "suits"] },
  { name: "Straight Jeans", base: 62, cats: ["Fashion", "Women"], sub: "Jeans",      imgFrom: ["sanity:Jeans"],                   tags: ["clothing", "denim", "jeans"] },
  { name: "Wide-Leg Jeans", base: 68, cats: ["Women", "Fashion"], sub: "Jeans",      imgFrom: ["sanity:Jeans"],                   tags: ["clothing", "denim", "jeans"] },
  { name: "Midi Dress",   base: 88,  cats: ["Women", "Fashion"],  sub: "Dresses",    imgFrom: ["womens-dresses", "tops"],         tags: ["clothing", "dresses"] },
  { name: "Wrap Dress",   base: 95,  cats: ["Women", "Fashion"],  sub: "Dresses",    imgFrom: ["womens-dresses", "tops"],         tags: ["clothing", "dresses"] },
  { name: "Saree",        base: 110, cats: ["Women"],             sub: "Saree",      imgFrom: ["sanity:Saree"],                   tags: ["clothing", "ethnic", "saree"] },
  { name: "Sneakers",     base: 85,  cats: ["Shoes", "Men"],      sub: "shoes",      imgFrom: ["mens-shoes", "sanity:shoes"],     tags: ["shoes", "sneakers", "casual"] },
  { name: "Running Shoes", base: 105, cats: ["Shoes"],            sub: "sports",     imgFrom: ["sanity:sports", "mens-shoes"],    tags: ["shoes", "sports", "running"] },
  { name: "Ankle Boots",  base: 140, cats: ["Shoes", "Women"],    sub: "shoes",      imgFrom: ["womens-shoes"],                   tags: ["shoes", "boots"] },
  { name: "Loafers",      base: 115, cats: ["Shoes", "Men"],      sub: "shoes",      imgFrom: ["mens-shoes"],                     tags: ["shoes", "formal"] },
  { name: "Heeled Sandals", base: 92, cats: ["Shoes", "Women"],   sub: "shoes",      imgFrom: ["womens-shoes"],                   tags: ["shoes", "heels"] },
  { name: "Tote Bag",     base: 76,  cats: ["Women"],             sub: "Bags",       imgFrom: ["womens-bags"],                    tags: ["accessories", "bags"] },
  { name: "Crossbody Bag", base: 82, cats: ["Women"],             sub: "Bags",       imgFrom: ["womens-bags"],                    tags: ["accessories", "bags"] },
  { name: "Sunglasses",   base: 58,  cats: ["Fashion"],           sub: "Sunglasses", imgFrom: ["sunglasses"],                     tags: ["accessories", "sunglasses"] },
  { name: "Field Watch",  base: 160, cats: ["Men"],               sub: "Watches",    imgFrom: ["mens-watches", "womens-watches"], tags: ["accessories", "watches"] },
  { name: "Pendant Necklace", base: 48, cats: ["Women"],          sub: "Jewellery",  imgFrom: ["womens-jewellery"],               tags: ["accessories", "jewellery"] },
];

const describe = (color, material, fit, garment, brand) =>
  `A ${fit.toLowerCase()}-fit ${garment.name.toLowerCase()} from ${brand.name}, ` +
  `cut from ${material.name.toLowerCase()} in a ${color.toLowerCase()} colourway. ` +
  `Designed for everyday wear with a considered finish, it pairs easily across the ` +
  `rest of your wardrobe and holds its shape wash after wash.`;

/**
 * Build the generated half of the catalog.
 *
 * imagePool maps a pool key to real image URLs, so a generated pair of boots
 * gets a photo of boots rather than whatever happened to share its
 * sub-category. See the `imgFrom` note on GARMENTS.
 */
const generateProducts = (count, imagePool) => {
  log(`Generating ${count} products…`);
  const products = [];

  // Fail loudly rather than silently shipping mismatched photos again.
  const starved = GARMENTS.filter(
    (g) => !g.imgFrom.some((k) => imagePool[k]?.length)
  );
  if (starved.length) {
    console.warn(
      `  ! no images available for: ${starved.map((g) => g.name).join(", ")}`
    );
  }

  for (let i = 0; i < count; i++) {
    const garment = pick(GARMENTS);
    const material = pick(MATERIALS);
    const brand = pick(BRANDS);
    const color = pick(COLORS);
    const fit = pick(FITS);

    // Price carries real signal: garment x material x brand, plus a little noise.
    const price = round2(
      garment.base * material.mult * brand.tier * (0.9 + rand() * 0.2)
    );
    const discounted = rand() < 0.35;

    // Draw from every pool this garment allows, so a category with only one
    // source photo still gets a second image for the card hover swap.
    const candidates = garment.imgFrom.flatMap((key) => imagePool[key] ?? []);
    const images = pickN([...new Set(candidates)], 2);

    const title = `${color} ${material.name} ${fit} ${garment.name}`;
    const id = `gen-${String(i + 1).padStart(6, "0")}`;

    products.push({
      id,
      slug: `${slugify(title)}-${id}`,
      title,
      description: describe(color, material, fit, garment, brand),
      price,
      old_price: discounted ? round2(price * (1.15 + rand() * 0.25)) : null,
      brand: brand.name,
      sku: `${garment.sub.slice(0, 3).toUpperCase()}-${id.slice(-6)}`,
      rating: round2(3.2 + rand() * 1.8),
      review_count: Math.floor(rand() * 240),
      stock: Math.floor(rand() * 120),
      tags: [
        ...garment.tags,
        material.name.toLowerCase(),
        color.toLowerCase(),
        fit.toLowerCase(),
      ],
      images,
      is_new: rand() < 0.2,
      type: rand() < 0.08 ? (rand() < 0.5 ? "featured" : "trending") : null,
      source: "generated",
      _cats: garment.cats,
      _sub: garment.sub,
    });
  }

  return products;
};

// --- writing ----------------------------------------------------------------

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const upsertAll = async (table, rows, conflict = "id") => {
  if (!rows.length) return;
  // Batched so a large catalog does not exceed the request size limit.
  for (const batch of chunk(rows, 500)) {
    const { error } = await db.from(table).upsert(batch, { onConflict: conflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  log(`  ${table}: ${rows.length} rows`);
};

// --- main -------------------------------------------------------------------

const main = async () => {
  const sanity = await fetchSanityCatalog();
  const dummy = await fetchDummyProducts();

  // ---- categories -----------------------------------------------------------
  // Keep the original Sanity ids: the navbar links to /products/<categoryId>,
  // so reusing them keeps any existing bookmarks alive.
  const categories = sanity.categories.map((c, i) => ({
    id: c._id,
    slug: slugify(c.title),
    title: c.title,
    image_url: c.imageUrl ?? null,
    sort_order: i,
  }));
  const categoryIdByTitle = Object.fromEntries(
    categories.map((c) => [c.title, c.id])
  );

  const subcategories = sanity.subcategories.map((s) => ({
    id: s._id,
    slug: slugify(s.title),
    title: s.title,
  }));
  const subIdByTitle = Object.fromEntries(
    subcategories.map((s) => [s.title, s.id])
  );

  // The imported categories need sub-categories your tree does not have yet.
  for (const { sub } of Object.values(CATEGORY_MAP)) {
    if (!subIdByTitle[sub]) {
      const id = `sub-${slugify(sub)}`;
      subcategories.push({ id, slug: slugify(sub), title: sub });
      subIdByTitle[sub] = id;
    }
  }
  for (const g of GARMENTS) {
    if (!subIdByTitle[g.sub]) {
      const id = `sub-${slugify(g.sub)}`;
      subcategories.push({ id, slug: slugify(g.sub), title: g.sub });
      subIdByTitle[g.sub] = id;
    }
  }

  // Preserve which sub-categories sit under which category.
  const catSubLinks = [];
  for (const c of sanity.categories) {
    for (const subId of c.subIds ?? []) {
      catSubLinks.push({ category_id: c._id, subcategory_id: subId });
    }
  }

  // ---- products -------------------------------------------------------------
  const products = [];
  const productCats = [];
  const productSubs = [];
  const reviews = [];

  const linkProduct = (productId, catTitles, subTitle) => {
    for (const title of catTitles) {
      const categoryId = categoryIdByTitle[title];
      if (categoryId) productCats.push({ product_id: productId, category_id: categoryId });
    }
    const subId = subIdByTitle[subTitle];
    if (subId) productSubs.push({ product_id: productId, subcategory_id: subId });

    // Make sure the sub-category is reachable from each of those categories.
    for (const title of catTitles) {
      const categoryId = categoryIdByTitle[title];
      if (categoryId && subId) {
        catSubLinks.push({ category_id: categoryId, subcategory_id: subId });
      }
    }
  };

  // Image pools, keyed by where the photo came from rather than by
  // sub-category. Filled as products are processed below.
  const imagePool = {};
  const titleBySubId = Object.fromEntries(
    sanity.subcategories.map((s) => [s._id, s.title])
  );

  // 1. Your existing Sanity products, ids intact.
  for (const p of sanity.products) {
    products.push({
      id: p._id,
      slug: `${slugify(p.title ?? "product")}-${p._id.slice(0, 6)}`,
      title: p.title ?? "Untitled",
      description: p.desc ?? null,
      price: p.price ?? 0,
      old_price: p.oldPrice ?? null,
      brand: "Fit-Wear",
      sku: null,
      rating: 0,
      review_count: 0,
      stock: 25,
      tags: ["fit-wear"],
      images: [p.img, p.img2].filter(Boolean),
      is_new: !!p.isNew,
      type: p.type ?? null,
      source: "sanity",
    });

    for (const catId of p.catIds ?? []) {
      productCats.push({ product_id: p._id, category_id: catId });
    }
    for (const subId of p.subIds ?? []) {
      productSubs.push({ product_id: p._id, subcategory_id: subId });

      // Your own photos are the only source for jeans, suits, jackets and
      // sarees — DummyJSON has no equivalent categories.
      const subTitle = titleBySubId[subId];
      const photos = [p.img, p.img2].filter(Boolean);
      if (subTitle && photos.length) {
        (imagePool[`sanity:${subTitle}`] ??= []).push(...photos);
      }
    }
  }

  // 2. The real imported apparel.
  for (const p of dummy) {
    const id = `dj-${p.id}`;
    const map = CATEGORY_MAP[p.sourceCategory];

    products.push({
      id,
      slug: `${slugify(p.title)}-${id}`,
      title: p.title,
      description: p.description,
      price: p.price,
      old_price:
        p.discountPercentage > 0
          ? round2(p.price / (1 - p.discountPercentage / 100))
          : null,
      brand: p.brand ?? null,
      sku: p.sku ?? null,
      rating: p.rating ?? 0,
      review_count: p.reviews?.length ?? 0,
      stock: p.stock ?? 0,
      tags: p.tags ?? [],
      images: p.images ?? [],
      is_new: false,
      type: null,
      source: "dummyjson",
    });

    linkProduct(id, map.cats, map.sub);

    // Keyed by DummyJSON's own category, not the sub-category we mapped it to,
    // so "tops" (dresses) can never be borrowed by a T-shirt.
    (imagePool[p.sourceCategory] ??= []).push(...(p.images ?? []));

    for (const r of p.reviews ?? []) {
      reviews.push({
        product_id: id,
        user_id: null,
        rating: r.rating,
        comment: r.comment,
        reviewer_name: r.reviewerName,
        created_at: r.date,
      });
    }
  }

  // 3. Generated products to reach the target size.
  const toGenerate = SKIP_GENERATED ? 0 : Math.max(0, TARGET - products.length);

  if (toGenerate > 0) {
    for (const g of generateProducts(toGenerate, imagePool)) {
      const { _cats, _sub, ...row } = g;
      products.push(row);
      linkProduct(row.id, _cats, _sub);
    }
  }

  // Drop duplicate join rows — a product mapped to the same category twice
  // would violate the composite primary key.
  const dedupe = (rows, keyFn) => {
    const seen = new Set();
    return rows.filter((r) => {
      const k = keyFn(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  const uniqueProductCats = dedupe(productCats, (r) => `${r.product_id}|${r.category_id}`);
  const uniqueProductSubs = dedupe(productSubs, (r) => `${r.product_id}|${r.subcategory_id}`);
  const uniqueCatSubs = dedupe(catSubLinks, (r) => `${r.category_id}|${r.subcategory_id}`);

  // ---- report ---------------------------------------------------------------
  const bySource = products.reduce((acc, p) => {
    acc[p.source] = (acc[p.source] ?? 0) + 1;
    return acc;
  }, {});

  log("\nPlanned catalog:");
  log(`  categories        ${categories.length}`);
  log(`  subcategories     ${subcategories.length}`);
  log(`  products          ${products.length}`, JSON.stringify(bySource));
  log(`  product->category ${uniqueProductCats.length}`);
  log(`  product->sub      ${uniqueProductSubs.length}`);
  log(`  reviews           ${reviews.length}`);

  if (DRY_RUN) {
    log("\n--dry-run: nothing written.");
    log("Sample generated product:\n", products[products.length - 1]);
    return;
  }

  // ---- write ----------------------------------------------------------------
  if (RESET) {
    log("\nRemoving previously imported rows…");
    // Join rows and reviews cascade from products.
    await db.from("products").delete().in("source", ["dummyjson", "generated", "sanity"]);
  }

  log("\nWriting to Supabase…");
  await upsertAll("categories", categories);
  await upsertAll("subcategories", subcategories);
  await upsertAll("category_subcategories", uniqueCatSubs, "category_id,subcategory_id");
  await upsertAll("products", products);
  await upsertAll("product_categories", uniqueProductCats, "product_id,category_id");
  await upsertAll("product_subcategories", uniqueProductSubs, "product_id,subcategory_id");

  // Reviews have generated uuid keys, so re-running would duplicate them.
  // Clear the imported ones first.
  if (reviews.length) {
    await db.from("product_reviews").delete().is("user_id", null);
    await upsertAll("product_reviews", reviews, "id");
  }

  log(`\nDone. ${products.length} products in the catalog.`);
};

main().catch((err) => {
  console.error("\nImport failed:", err.message);
  process.exit(1);
});
