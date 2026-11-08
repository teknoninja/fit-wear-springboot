// client/src/context/WishlistContext.jsx
//
// Backs the heart icons. Items live in the Spring Boot database.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../lib/apiClient";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
};

const normalizeItem = (item) => ({
  ...item,
  product_id: item.productId ?? item.product_id,
});

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

    apiClient
      .get(`/wishlist/${user.id}`)
      .then(({ data }) => {
        if (!active) return;
        const normalized = (data ?? []).map(normalizeItem);
        setItems(normalized);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load wishlist:", error.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const isWishlisted = useCallback(
    (productId) => items.some((i) => (i.product_id ?? i.productId) === productId),
    [items]
  );

  const add = async (product) => {
    if (!user) return { error: new Error("AUTH_REQUIRED") };

    const payload = {
      userId: user.id,
      productId: product._id,
      title: product.title,
      price: product.price,
      img: product.img,
    };

    // Optimistic: the heart fills instantly, and we roll back if the write fails.
    const optimistic = { ...payload, id: `temp-${product._id}`, product_id: product._id };
    setItems((prev) => [optimistic, ...prev]);

    try {
      const { data } = await apiClient.post("/wishlist", payload);
      const normalized = normalizeItem(data);
      // Swap the temp row for the real one so we have its DB id.
      setItems((prev) => prev.map((i) => (i.id === optimistic.id ? normalized : i)));
      return { error: null };
    } catch (err) {
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      return { error: err };
    }
  };

  const remove = async (productId) => {
    if (!user) return { error: new Error("AUTH_REQUIRED") };

    const previous = items;
    setItems((prev) => prev.filter((i) => (i.product_id ?? i.productId) !== productId));

    try {
      await apiClient.delete(`/wishlist/${user.id}/product/${productId}`);
      return { error: null };
    } catch (err) {
      setItems(previous);
      return { error: err };
    }
  };

  const toggle = async (product) =>
    isWishlisted(product._id) ? remove(product._id) : add(product);

  const value = useMemo(
    () => ({
      items,
      loading,
      isWishlisted,
      add,
      remove,
      toggle,
    }),
    [items, loading, isWishlisted]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export default WishlistContext;
