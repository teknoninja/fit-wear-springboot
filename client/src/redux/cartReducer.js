import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  products: [],
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      // Find item by _id instead of id
      const item = state.products.find(
        (item) => item._id === action.payload._id
      );
      if (item) {
        item.quantity += action.payload.quantity;
      } else {
        state.products.push(action.payload);
      }
    },
    removeItem: (state, action) => {
      // Filter by _id instead of id
      state.products = state.products.filter(
        (item) => item._id !== action.payload
      );
    },
    resetCart: (state) => {
      state.products = [];
    },
    // Replaces the whole cart. Used by the cart-sync hook when a user logs in
    // and we merge their saved server cart with whatever is in this browser.
    setCart: (state, action) => {
      state.products = action.payload ?? [];
    },
  },
});

export const { addToCart, removeItem, resetCart, setCart } = cartSlice.actions;

export default cartSlice.reducer;