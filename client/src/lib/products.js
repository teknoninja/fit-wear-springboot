// client/src/lib/products.js
//
// Every catalog read goes through here.
//
// The mappers return the same field names the UI expects (_id, img, img2, oldPrice, desc).
import apiClient from "./apiClient";

export const toCard = (row) => ({
  _id: row.id,
  title: row.title,
  price: Number(row.price),
  oldPrice: row.oldPrice != null ? Number(row.oldPrice) : (row.old_price != null ? Number(row.old_price) : null),
  isNew: row.isNew ?? row.is_new ?? false,
  img: row.images?.[0] ?? null,
  img2: row.images?.[1] ?? row.images?.[0] ?? null,
});

const toDetail = (row) => ({
  ...toCard(row),
  desc: row.description,
  brand: row.brand,
  rating: row.rating != null ? Number(row.rating) : 0,
  reviewCount: row.reviewCount ?? row.review_count ?? 0,
  stock: row.stock ?? 0,
  tags: row.tags ?? [],
  sku: row.sku,
  images: row.images ?? [],
});

// --- categories -------------------------------------------------------------

export const fetchCategories = async () => {
  const { data } = await apiClient.get("/categories");
  return data.map((c) => ({
    _id: c.id,
    title: c.title,
    imageUrl: c.imageUrl ?? c.image_url,
  }));
};

export const fetchSubCategories = async (categoryId) => {
  const { data } = await apiClient.get(`/categories/${categoryId}/subcategories`);
  return data
    .map((s) => ({ _id: s.id, title: s.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

// --- product lists ----------------------------------------------------------

/** Homepage rows: `type` is "featured" or "trending". */
export const fetchProductsByType = async (type, limit = 8) => {
  const { data } = await apiClient.get(`/products/type/${type}`, {
    params: { limit },
  });
  return (data ?? []).map(toCard);
};

/**
 * The category listing, with its filters.
 * Returns { items, hasMore }
 */
export const fetchProducts = async ({
  categoryId,
  subCategoryIds = [],
  maxPrice = 100000,
  sort = "asc",
  page = 0,
  pageSize = 24,
}) => {
  const subcategoryId = subCategoryIds.length > 0 ? subCategoryIds[0] : undefined;

  const { data } = await apiClient.get("/products", {
    params: {
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId,
      maxPrice: maxPrice,
      sort: sort,
      page: page,
      size: pageSize,
    },
  });

  const content = data.content ?? [];
  return {
    items: content.map(toCard),
    hasMore: !data.last,
  };
};

// --- search -----------------------------------------------------------------

const sanitizeQuery = (raw) =>
  (raw ?? "")
    .replace(/[,()*\\%:."']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export const searchProducts = async (rawQuery, { limit = 48 } = {}) => {
  const q = sanitizeQuery(rawQuery);
  if (q.length < 2) return [];

  const { data } = await apiClient.get("/products/search", {
    params: { q, limit },
  });

  return (data ?? []).map(toCard);
};

// --- single product ---------------------------------------------------------

export const fetchProduct = async (id) => {
  const { data } = await apiClient.get(`/products/${id}`);
  return data ? toDetail(data) : null;
};

export const fetchProductReviews = async (productId, limit = 10) => {
  const { data } = await apiClient.get(`/products/${productId}/reviews`);
  return (data ?? []).slice(0, limit);
};

// --- behaviour logging ------------------------------------------------------

export const getSessionId = () => {
  const KEY = "fitwear_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

export const logProductView = async (productId, userId = null) => {
  try {
    await apiClient.post(`/products/${productId}/views`, {
      userId: userId || null,
      sessionId: getSessionId(),
    });
  } catch {
    // Ignored on purpose
  }
};
