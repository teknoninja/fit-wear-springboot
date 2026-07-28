// client/src/lib/recommendations.js
//
// Thin wrappers over the Postgres functions in supabase/recommendations.sql.
// All the ranking happens in the database — one round trip per rail, no
// external AI service, no API key.
import supabase from "./supabaseClient";
import { toCard, getSessionId } from "./products";

// Every RPC returns `setof products`, so one mapper covers them all.
const run = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    // A rail failing should never take the page down with it.
    console.error(`Recommendation "${fn}" failed:`, error.message);
    return [];
  }
  return (data ?? []).map(toCard);
};

/** Content-based. Works with no history, so it is safe on any product page. */
export const fetchSimilar = (productId, limit = 8) =>
  run("recommend_similar", { p_product_id: productId, p_limit: limit });

/** Collaborative, falling back to content-based until orders exist. */
export const fetchAlsoBought = (productId, limit = 8) =>
  run("recommend_also_bought", { p_product_id: productId, p_limit: limit });

/** Personalised from views + wishlist; top-rated for a brand-new visitor. */
export const fetchForYou = (limit = 8) =>
  run("recommend_for_user", { p_session_id: getSessionId(), p_limit: limit });

/** The shopper's own recently-viewed products. */
export const fetchRecentlyViewed = (limit = 8) =>
  run("recently_viewed", { p_session_id: getSessionId(), p_limit: limit });

/** Most-viewed across all visitors in the last 7 days. */
export const fetchTrending = (limit = 8) =>
  run("trending_products", { p_limit: limit });
