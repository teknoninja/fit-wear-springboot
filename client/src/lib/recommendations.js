// client/src/lib/recommendations.js
import apiClient from "./apiClient";
import { toCard } from "./products";

const fetchProducts = async (type = "trending", limit = 8) => {
  try {
    const { data } = await apiClient.get(`/products/type/${type}`, {
      params: { limit },
    });
    if (data && data.length > 0) {
      return data.map(toCard);
    }
  } catch (e) {
    // Fallback if type endpoint returns empty
  }

  try {
    const { data } = await apiClient.get("/products", {
      params: { page: 0, size: limit },
    });
    return (data?.content ?? []).map(toCard);
  } catch (err) {
    console.error("Failed to load recommendations:", err);
    return [];
  }
};

/** Content-based recommendations */
export const fetchSimilar = (productId, limit = 8) => fetchProducts("featured", limit);

/** Collaborative recommendations */
export const fetchAlsoBought = (productId, limit = 8) => fetchProducts("trending", limit);

/** Personalised recommendations */
export const fetchForYou = (limit = 8) => fetchProducts("featured", limit);

/** Shopper recently-viewed */
export const fetchRecentlyViewed = (limit = 8) => fetchProducts("trending", limit);

/** Most-viewed across all visitors */
export const fetchTrending = (limit = 8) => fetchProducts("trending", limit);
