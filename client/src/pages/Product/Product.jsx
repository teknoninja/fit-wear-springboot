import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/cartReducer"; // 1. Corrected import path
import { fetchProduct, logProductView } from "../../lib/products";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import "./Product.scss";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BalanceIcon from "@mui/icons-material/Balance";

const Product = () => {
  const { id } = useParams();
  const [selectedImg, setSelectedImg] = useState("img");
  const [quantity, setQuantity] = useState(1);
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isWishlisted, toggle } = useWishlist();
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Reset to the primary image when navigating between products, otherwise
    // a product with one image inherits the previous product's "img2" state.
    setSelectedImg("img");

    fetchProduct(id)
      .then((data) => {
        if (!active) return;
        setProductData(data);
        setLoading(false);

        // Feed the recommender. Fire-and-forget — see logProductView.
        if (data) logProductView(data._id, user?.id ?? null);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setProductData(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, user?.id]);

  if (loading) return <div>Loading...</div>;
  if (!productData) return <div>Product not found.</div>;

  const saved = isWishlisted(productData._id);

  const handleWishlist = async () => {
    const { error } = await toggle(productData);
    // The context signals "you need an account" rather than failing silently.
    if (error?.message === "AUTH_REQUIRED") {
      navigate("/login", { state: { from: `/product/${productData._id}` } });
    }
  };

  return (
    <div className="product">
      <div className="left">
        <div className="images">
          {/* 4. Update image sources to use direct URLs */}
          <img
            src={productData.img}
            alt={productData.title}
            onClick={() => setSelectedImg("img")}
          />
          <img
            src={productData.img2}
            alt={productData.title}
            onClick={() => setSelectedImg("img2")}
          />
        </div>
        <div className="mainImg">
          <img src={productData[selectedImg]} alt={productData.title} />
        </div>
      </div>
      <div className="right">
        {/* 5. Update JSX to use flat data structure */}
        <h1>{productData.title}</h1>
        <span className="price">${productData.price}</span>
        <p>{productData.desc}</p>
        <div className="quantity">
          <button onClick={() => setQuantity((prev) => (prev === 1 ? 1 : prev - 1))}>-</button>
          {quantity}
          <button onClick={() => setQuantity((prev) => prev + 1)}>+</button>
        </div>
        <button
          className="add"
          // 6. Dispatch the correct payload structure to Redux
          onClick={() =>
            dispatch(
              addToCart({
                _id: productData._id,
                title: productData.title,
                desc: productData.desc,
                price: productData.price,
                img: productData.img,
                quantity,
              })
            )
          }
        >
          <AddShoppingCartIcon /> ADD TO CART
        </button>

        <div className="links">
          <button
            className={`wishlistToggle ${saved ? "saved" : ""}`}
            onClick={handleWishlist}
          >
            {saved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            {saved ? "SAVED TO WISHLIST" : "ADD TO WISHLIST"}
          </button>
        </div>
        {/* ... rest of your JSX ... */}
      </div>
    </div>
  );
};

export default Product;