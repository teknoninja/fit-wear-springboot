import React, { useEffect, useState } from 'react';
import Card from "../Card/Card";
import "./FeaturedProducts.scss";
import { fetchProductsByType } from "../../lib/products";

const FeaturedProducts = ({ type }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    fetchProductsByType(type)
      .then((products) => {
        if (!active) return;
        setData(products);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [type]); // Re-run the query if the 'type' prop changes

  return (
    <div className="featuredProducts">
      <div className="top">
        <h1>{type} products</h1>
        <p>
        Welcome to a curated showcase of our most distinguished pieces. Each item in our Featured Collection is selected for its superior craftsmanship, timeless design, and exceptional quality. Discover the styles everyone is talking about. This handpicked selection features our latest arrivals and all-time favorites, chosen for their standout quality and modern appeal. Shop the best of the season right here
        </p>
      </div>
      <div className="bottom">
        {error
          ? "Something went wrong!"
          : loading
          ? "loading"
          : data?.map((item) => <Card item={item} key={item._id} />)}
      </div>
    </div>
  );
};

export default FeaturedProducts;
