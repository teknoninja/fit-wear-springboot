import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import supabase from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { addToCart } from "../../redux/cartReducer";
import "./Profile.scss";

const TABS = [
  { key: "details", label: "My details" },
  { key: "orders", label: "Orders" },
  { key: "wishlist", label: "Wishlist" },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// --- My details -------------------------------------------------------------
const DetailsTab = () => {
  const { user, profile, updateProfile } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  // Fill the form once the profile row arrives.
  useEffect(() => {
    if (!profile) return;
    const address = profile.address ?? {};
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      line1: address.line1 ?? "",
      line2: address.line2 ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      zip: address.zip ?? "",
      country: address.country ?? "",
    });
  }, [profile]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus({ type: "", message: "" });

    const { full_name, phone, ...address } = form;
    const { error } = await updateProfile({ full_name, phone, address });

    setBusy(false);
    setStatus(
      error
        ? { type: "error", message: error.message }
        : { type: "success", message: "Saved." }
    );
  };

  return (
    <div className="tabPanel">
      <form className="detailsForm" onSubmit={handleSubmit}>
        {status.message && <div className={`alert ${status.type}`}>{status.message}</div>}

        <div className="fieldRow">
          <label>
            Full name
            <input type="text" value={form.full_name} onChange={set("full_name")} />
          </label>
          <label>
            Email
            {/* Read-only: changing the login email needs a re-verification flow. */}
            <input type="email" value={user?.email ?? ""} disabled />
          </label>
        </div>

        <label>
          Phone
          <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" />
        </label>

        <h3>Shipping address</h3>

        <label>
          Address line 1
          <input type="text" value={form.line1} onChange={set("line1")} />
        </label>
        <label>
          Address line 2
          <input type="text" value={form.line2} onChange={set("line2")} />
        </label>

        <div className="fieldRow">
          <label>
            City
            <input type="text" value={form.city} onChange={set("city")} />
          </label>
          <label>
            State / Province
            <input type="text" value={form.state} onChange={set("state")} />
          </label>
        </div>

        <div className="fieldRow">
          <label>
            ZIP / Postal code
            <input type="text" value={form.zip} onChange={set("zip")} />
          </label>
          <label>
            Country
            <input type="text" value={form.country} onChange={set("country")} />
          </label>
        </div>

        <button className="primaryBtn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "SAVE CHANGES"}
        </button>
      </form>
    </div>
  );
};

// --- Orders -----------------------------------------------------------------
const OrdersTab = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;

    // One query for orders + their items. RLS restricts this to the current
    // user's rows, so there is no need to filter defensively on the client.
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        setOrders(data ?? []);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (loading) return <div className="tabPanel muted">Loading your orders…</div>;
  if (error) return <div className="tabPanel alert error">{error}</div>;

  if (!orders.length) {
    return (
      <div className="tabPanel emptyState">
        <h3>No orders yet</h3>
        <p>When you complete a purchase it will show up here.</p>
        <Link className="primaryBtn" to="/">
          START SHOPPING
        </Link>
      </div>
    );
  }

  return (
    <div className="tabPanel">
      <div className="orderList">
        {orders.map((order) => (
          <div className="orderCard" key={order.id}>
            <div className="orderHeader">
              <div>
                <span className="orderId">Order #{order.id.slice(0, 8).toUpperCase()}</span>
                <span className="orderDate">{formatDate(order.created_at)}</span>
              </div>
              <div className="orderMeta">
                <span className={`status ${order.status}`}>{order.status}</span>
                <span className="orderTotal">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="orderItems">
              {order.order_items?.map((item) => (
                <div className="orderItem" key={item.id}>
                  {item.img && <img src={item.img} alt={item.title} />}
                  <div className="orderItemInfo">
                    <span className="itemTitle">{item.title}</span>
                    <span className="itemQty">
                      {item.quantity} × ${Number(item.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Wishlist ---------------------------------------------------------------
const WishlistTab = () => {
  const { items, loading, remove } = useWishlist();
  const dispatch = useDispatch();

  if (loading) return <div className="tabPanel muted">Loading your wishlist…</div>;

  if (!items.length) {
    return (
      <div className="tabPanel emptyState">
        <h3>Your wishlist is empty</h3>
        <p>Tap the heart on any product to save it for later.</p>
        <Link className="primaryBtn" to="/">
          BROWSE PRODUCTS
        </Link>
      </div>
    );
  }

  return (
    <div className="tabPanel">
      <div className="wishlistGrid">
        {items.map((item) => (
          <div className="wishlistCard" key={item.id}>
            <Link to={`/product/${item.product_id}`}>
              <img src={item.img} alt={item.title} />
            </Link>
            <div className="wishlistInfo">
              <Link className="wishlistTitle" to={`/product/${item.product_id}`}>
                {item.title}
              </Link>
              <span className="wishlistPrice">${Number(item.price).toFixed(2)}</span>
            </div>
            <div className="wishlistActions">
              <button
                className="primaryBtn small"
                onClick={() =>
                  dispatch(
                    addToCart({
                      _id: item.product_id,
                      title: item.title,
                      price: Number(item.price),
                      img: item.img,
                      quantity: 1,
                    })
                  )
                }
              >
                <AddShoppingCartIcon fontSize="small" /> ADD TO CART
              </button>
              <button
                className="iconBtn"
                title="Remove from wishlist"
                onClick={() => remove(item.product_id)}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Page shell -------------------------------------------------------------
// defaultTab lets /orders and /wishlist reuse this page, landing on the right
// tab instead of needing separate screens.
const Profile = ({ defaultTab = "details" }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(defaultTab);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "there";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="profile">
      <div className="profileHeader">
        <div className="avatar">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}
        </div>
        <div className="headerText">
          <h1>Hi, {displayName}</h1>
          <span>{user?.email}</span>
        </div>
        <button className="signOutBtn" onClick={handleSignOut}>
          SIGN OUT
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && <DetailsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "wishlist" && <WishlistTab />}
    </div>
  );
};

export default Profile;
