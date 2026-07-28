// client/src/hooks/useCartSync.js
//
// Keeps the Redux cart and the user's `carts` row in Supabase in step.
//
//   log in  -> merge the guest cart in this browser with the saved server cart
//   change  -> push the cart up (debounced, so we don't write on every +/- tap)
//   log out -> clear the local cart so the next person on this machine
//              doesn't inherit it
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import supabase from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { setCart } from "../redux/cartReducer";

const DEBOUNCE_MS = 800;

// Union of both carts. When the same product is in each, keep the larger
// quantity — that loses less than summing (which double-counts a cart the user
// already had open on two tabs) and less than overwriting.
const mergeCarts = (local = [], remote = []) => {
  const byId = new Map();
  for (const item of remote) byId.set(item._id, { ...item });
  for (const item of local) {
    const existing = byId.get(item._id);
    if (existing) {
      existing.quantity = Math.max(existing.quantity ?? 1, item.quantity ?? 1);
    } else {
      byId.set(item._id, { ...item });
    }
  }
  return [...byId.values()];
};

const useCartSync = () => {
  const dispatch = useDispatch();
  const { user, loading } = useAuth();
  const products = useSelector((state) => state.cart.products);

  // Which user id we have already pulled + merged for. Stops the pull effect
  // from re-running (and re-merging) on every token refresh.
  const hydratedFor = useRef(null);

  // --- pull + merge on login ------------------------------------------------
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Logged out. Clear the cart, but only if we had actually hydrated one —
      // otherwise this would wipe a guest's cart on every page load.
      if (hydratedFor.current) {
        hydratedFor.current = null;
        dispatch(setCart([]));
      }
      return;
    }

    if (hydratedFor.current === user.id) return;

    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("carts")
        .select("items")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Failed to load saved cart:", error.message);
        hydratedFor.current = user.id;
        return;
      }

      const merged = mergeCarts(products, data?.items ?? []);
      hydratedFor.current = user.id;
      dispatch(setCart(merged));
    })();

    return () => {
      active = false;
    };
    // `products` is deliberately not a dependency: we only want the cart the
    // user happened to have at the moment they signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading, dispatch]);

  // --- push on change -------------------------------------------------------
  useEffect(() => {
    // Wait until the merge above has run, or we would immediately overwrite the
    // saved cart with the (possibly empty) local one.
    if (!user || hydratedFor.current !== user.id) return;

    const timer = setTimeout(() => {
      supabase
        .from("carts")
        .upsert({
          user_id: user.id,
          items: products,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error("Failed to save cart:", error.message);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [products, user?.id]);
};

export default useCartSync;
