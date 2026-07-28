import React from "react";
import "./Card.scss";
import { Link, useNavigate } from "react-router-dom";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useWishlist } from "../../context/WishlistContext";

const Card = ({ item }) => {
  // item is now a flat object from Sanity: { _id, title, price, img, img2, ... }
  const { isWishlisted, toggle } = useWishlist();
  const navigate = useNavigate();

  if (!item) {
    return null;
  }

  const saved = isWishlisted(item._id);

  const handleWishlist = async (e) => {
    // The whole card is a <Link>, so stop the click from navigating away.
    e.preventDefault();
    e.stopPropagation();

    const { error } = await toggle(item);
    if (error?.message === "AUTH_REQUIRED") {
      navigate("/login", { state: { from: `/product/${item._id}` } });
    }
  };

  return (
    // 1. Use item._id for the link, which is Sanity's default ID
    <Link className="link" to={`/product/${item._id}`}>
      <div className="card">
        <div className="image">
          {item.isNew && <span>New Season</span>}

          <button
            className={`wishlistBtn ${saved ? "saved" : ""}`}
            onClick={handleWishlist}
            title={saved ? "Remove from wishlist" : "Add to wishlist"}
            aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          >
            {saved ? (
              <FavoriteIcon fontSize="small" />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </button>

          <img
            // 2. Use the direct image URL from the GROQ query
            src={item.img}
            alt=""
            className="mainImg"
          />
          <img
            // 3. Use the direct image URL for the second image
            src={item.img2}
            alt=""
            className="secondImg"
          />
        </div>
        <h2>{item.title}</h2>
        <div className="prices">
          <h3>${item.oldPrice || item.price + 20}</h3>
          <h3>${item.price}</h3>
        </div>
      </div>
    </Link>
  );
};

export default Card;
