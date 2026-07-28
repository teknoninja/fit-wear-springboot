// client/src/context/WishlistContext.jsx
//
// Backs the heart icons. Items live in Supabase (one row per user+product), so
// a wishlist follows the user across devices. Signed-out users get a prompt to
// log in rather than a silently-dropped click.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

// Exported next to the provider on purpose — it only costs full-file HMR here.
// eslint-disable-next-line react-refresh/only-export-components
export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
};

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reload on login; clear on logout.
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let active = true;
    setLoading(true);

    supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("Failed to load wishlist:", error.message);
        setItems(data ?? []);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const isWishlisted = useCallback(
    (productId) => items.some((i) => i.product_id === productId),
    [items]
  );

  const add = async (product) => {
    if (!user) return { error: new Error("AUTH_REQUIRED") };

    const row = {
      user_id: user.id,
      product_id: product._id,
      title: product.title,
      price: product.price,
      img: product.img,
    };

    // Optimistic: the heart fills instantly, and we roll back if the write fails.
    const optimistic = { ...row, id: `temp-${product._id}` };
    setItems((prev) => [optimistic, ...prev]);

    const { data, error } = await supabase
      .from("wishlist")
      .upsert(row, { onConflict: "user_id,product_id" })
      .select()
      .single();

    if (error) {
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      return { error };
    }
    // Swap the temp row for the real one so we have its DB id.
    setItems((prev) => prev.map((i) => (i.id === optimistic.id ? data : i)));
    return { error: null };
  };

  const remove = async (productId) => {
    if (!user) return { error: new Error("AUTH_REQUIRED") };

    const previous = items;
    setItems((prev) => prev.filter((i) => i.product_id !== productId));

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (error) setItems(previous);
    return { error };
  };

  const toggle = async (product) =>
    isWishlisted(product._id) ? remove(product._id) : add(product);

  const value = useMemo(
    () => ({ items, count: items.length, loading, isWishlisted, add, remove, toggle }),
    [items, loading, isWishlisted]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export default WishlistContext;
