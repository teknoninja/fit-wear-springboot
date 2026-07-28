// client/src/lib/products.js
//
// Every catalog read goes through here.
//
// The mappers below deliberately return the same field names the old Sanity
// queries did (`_id`, `img`, `img2`, `oldPrice`, `desc`). That keeps Card,
// the cart and the wishlist working unchanged — and, more importantly, means
// product ids already saved in someone's cart still resolve after the move.
import supabase from "./supabaseClient";

// Columns needed to render a product card. Listing them explicitly keeps the
// payload small — `select("*")` over 600 products would ship descriptions and
// tags nobody is going to read.
const CARD_COLUMNS = "id, title, price, old_price, is_new, images";
const DETAIL_COLUMNS =
  "id, title, description, price, old_price, is_new, images, brand, rating, review_count, stock, tags, sku";

// Exported so the recommendation RPCs, which return the same product rows,
// can reuse the mapping instead of duplicating it.
export const toCard = (row) => ({
  _id: row.id,
  title: row.title,
  price: Number(row.price),
  oldPrice: row.old_price != null ? Number(row.old_price) : null,
  isNew: row.is_new,
  img: row.images?.[0] ?? null,
  // Card cross-fades to a second image on hover; reuse the first if there is
  // only one, so the hover does not flash an empty box.
  img2: row.images?.[1] ?? row.images?.[0] ?? null,
});

const toDetail = (row) => ({
  ...toCard(row),
  desc: row.description,
  brand: row.brand,
  rating: row.rating != null ? Number(row.rating) : 0,
  reviewCount: row.review_count ?? 0,
  stock: row.stock ?? 0,
  tags: row.tags ?? [],
  sku: row.sku,
  images: row.images ?? [],
});

// --- categories -------------------------------------------------------------

export const fetchCategories = async () => {
  const { data, error } = await supabase
    .from("categories")
    .select("id, title, image_url")
    .order("sort_order");

  if (error) throw error;
  return data.map((c) => ({ _id: c.id, title: c.title, imageUrl: c.image_url }));
};

export const fetchSubCategories = async (categoryId) => {
  const { data, error } = await supabase
    .from("category_subcategories")
    .select("subcategories(id, title)")
    .eq("category_id", categoryId);

  if (error) throw error;

  return data
    .map((row) => row.subcategories)
    .filter(Boolean)
    .map((s) => ({ _id: s.id, title: s.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

// --- product lists ----------------------------------------------------------

/** Homepage rows: `type` is "featured" or "trending". */
export const fetchProductsByType = async (type, limit = 8) => {
  const { data, error } = await supabase
    .from("products")
    .select(CARD_COLUMNS)
    .eq("type", type)
    .limit(limit);

  if (error) throw error;
  return data.map(toCard);
};

/**
 * The category listing, with its filters.
 *
 * Returns { items, hasMore } so the page can offer "load more" — with 600
 * products, fetching the lot on every filter change would be wasteful.
 */
export const fetchProducts = async ({
  categoryId,
  subCategoryIds = [],
  maxPrice = 100000,
  sort = "asc",
  page = 0,
  pageSize = 24,
}) => {
  // `!inner` turns the join into an INNER JOIN, so filtering on the joined
  // table actually restricts which products come back. Without it, Postgres
  // returns every product with an empty join array.
  let select = `${CARD_COLUMNS}, product_categories!inner(category_id)`;
  if (subCategoryIds.length) {
    select += ", product_subcategories!inner(subcategory_id)";
  }

  // Over-fetch by one row: if the extra row exists, there is another page.
  const from = page * pageSize;
  const to = from + pageSize;

  let query = supabase
    .from("products")
    .select(select)
    .lte("price", maxPrice)
    .order("price", { ascending: sort === "asc" })
    .range(from, to);

  if (categoryId) query = query.eq("product_categories.category_id", categoryId);
  if (subCategoryIds.length) {
    query = query.in("product_subcategories.subcategory_id", subCategoryIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  // A product matching two selected sub-categories comes back twice, so
  // de-duplicate before rendering or React will warn about repeated keys.
  const seen = new Set();
  const unique = data.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return {
    items: unique.slice(0, pageSize).map(toCard),
    hasMore: unique.length > pageSize,
  };
};

// --- search -----------------------------------------------------------------

// PostgREST's `or=` filter is a comma-separated expression, so commas, parens
// and wildcards in user input would break the query (or let someone inject
// extra filters). Strip them rather than escaping — none are useful in a
// product search anyway.
const sanitizeQuery = (raw) =>
  (raw ?? "")
    .replace(/[,()*\\%:."']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

/**
 * Keyword search over title, brand, description and tags.
 *
 * Uses ILIKE substring matching rather than Postgres full-text search: people
 * type partial words ("shir", "sneak") and full-text only matches whole tokens.
 * At 600 rows the sequential scan is imperceptible. See the note in
 * supabase/products-schema.sql for the trigram index to add if the catalog
 * grows into the tens of thousands.
 */
export const searchProducts = async (rawQuery, { limit = 48 } = {}) => {
  const q = sanitizeQuery(rawQuery);
  if (q.length < 2) return [];

  const pattern = `*${q}*`;
  const clauses = [
    `title.ilike.${pattern}`,
    `brand.ilike.${pattern}`,
    `description.ilike.${pattern}`,
  ];
  // Tags are an array, matched exactly — only meaningful for a single word.
  // The value must be quoted inside an `or(...)`; bare {shirt} is parsed as a
  // malformed array literal. sanitizeQuery already strips quotes, so this
  // cannot be broken out of.
  if (!q.includes(" ")) clauses.push(`tags.cs.{"${q}"}`);

  const { data, error } = await supabase
    .from("products")
    .select(CARD_COLUMNS)
    .or(clauses.join(","))
    .limit(limit);

  if (error) throw error;

  // Crude relevance ranking: a title hit beats a description hit, and an exact
  // prefix beats a match buried mid-string. Postgres could rank this properly
  // with full-text, but that would lose partial-word matching.
  const needle = q.toLowerCase();
  const score = (row) => {
    const title = row.title.toLowerCase();
    if (title === needle) return 0;
    if (title.startsWith(needle)) return 1;
    if (title.includes(needle)) return 2;
    return 3;
  };

  return data.sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title)).map(toCard);
};

// --- single product ---------------------------------------------------------

export const fetchProduct = async (id) => {
  const { data, error } = await supabase
    .from("products")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toDetail(data) : null;
};

export const fetchProductReviews = async (productId, limit = 10) => {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, rating, comment, reviewer_name, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

// --- behaviour logging ------------------------------------------------------

// A stable id for signed-out visitors, so their browsing still forms a trail
// the recommender can use. Regenerated if they clear storage, which is fine.
export const getSessionId = () => {
  const KEY = "fitwear_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

/**
 * Record that a product was viewed. Fire-and-forget: a failure here must never
 * interfere with actually showing the product, so errors are swallowed.
 *
 * This is training data for the recommender, and it cannot be backfilled —
 * which is why it is being collected before the recommender exists.
 */
export const logProductView = async (productId, userId = null) => {
  try {
    await supabase.from("product_views").insert({
      product_id: productId,
      user_id: userId,
      session_id: getSessionId(),
    });
  } catch {
    // Ignored on purpose.
  }
};
