import React, { useState } from "react";
import "./Cart.scss";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
// 1. Correct the import path to your Redux slice
import { removeItem, resetCart } from "../../redux/cartReducer";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../../context/AuthContext";

const Cart = () => {
  const products = useSelector((state) => state.cart.products);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { session, isLoggedIn } = useAuth();
  const [busy, setBusy] = useState(false);


  const totalPrice = () => {
    let total = 0;
    products.forEach((item) => {
      total += item.quantity * item.price;
    });
    return total.toFixed(2);
  };

  const handlePayment = async () => {
    // Guest checkout still works, but an order can only be filed under an
    // account if we know who is buying — so nudge people to sign in first.
    if (!isLoggedIn) {
      navigate("/login", { state: { from: "/" } });
      return;
    }

    setBusy(true);
    try {
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

      // 1. Send the cart to the serverless function. The access token goes in
      //    the Authorization header so the server can verify who the user is
      //    with Supabase — a client-supplied user id could simply be forged.
      const response = await axios.post(
        "/api/checkout",
        { products },
        {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        }
      );

      // 2. Redirect to Stripe's checkout page using the URL or session ID.
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else if (response.data?.id) {
        await stripe.redirectToCheckout({ sessionId: response.data.id });
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert(err.response?.data?.error || "Checkout failed. Please try again.");
      setBusy(false);
    }
  };


  return (
    <div className="cart">
      <h1>Products in your cart</h1>
      {products?.map((item) => (
        // 2. Use item._id for the key
        <div className="item" key={item._id}> 
          {/* 3. Use the direct image URL from item.img */}
          <img src={item.img} alt={item.title} /> 
          <div className="details">
            <h1>{item.title}</h1>
            <p>{item.desc?.substring(0, 100)}</p>
            <div className="price">
              {item.quantity} x ${item.price}
            </div>
          </div>
          <DeleteOutlinedIcon
            className="delete"
            // 4. Dispatch removeItem with item._id
            onClick={() => dispatch(removeItem(item._id))} 
          />
        </div>
      ))}
      <div className="total">
        <span>SUBTOTAL</span>
        <span>${totalPrice()}</span>
      </div>
      <button onClick={handlePayment} disabled={busy || !products.length}>
        {busy
          ? "REDIRECTING…"
          : isLoggedIn
          ? "PROCEED TO CHECKOUT"
          : "SIGN IN TO CHECKOUT"}
      </button>
      <span className="reset" onClick={() => dispatch(resetCart())}>
        Reset Cart
      </span>
    </div>
  );
};

export default Cart;