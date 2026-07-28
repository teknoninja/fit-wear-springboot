import React from "react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import List from "../../components/List/List";
import { fetchSubCategories } from "../../lib/products";
import "./Products.scss";

const Products = () => {
  const { id: catId } = useParams();

  const [data, setData] = useState(null); // State for sub-categories
  const [loading, setLoading] = useState(true);

  const [maxPrice, setMaxPrice] = useState(1000);
  const [sort, setSort] = useState("asc");
  const [selectedSubCats, setSelectedSubCats] = useState([]);

  // Fetch sub-categories associated with the current category
  useEffect(() => {
    let active = true;
    setLoading(true);
    // Filters must reset when the category changes, or a sub-category from the
    // previous category would silently return an empty listing.
    setSelectedSubCats([]);

    fetchSubCategories(catId)
      .then((subs) => {
        if (!active) return;
        setData(subs);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setData([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [catId]); // Re-fetch when the category ID changes

  const handleChange = (e) => {
    const value = e.target.value;
    const isChecked = e.target.checked;

    setSelectedSubCats(
      isChecked
        ? [...selectedSubCats, value]
        : selectedSubCats.filter((item) => item !== value)
    );
  };

  return (
    <div className="products">
      <div className="left">
        <div className="filterItem">
          <h2>Product Categories</h2>
          {loading ? "loading..." : data?.map((item) => (
            <div className="inputItem" key={item._id}>
              <input
                type="checkbox"
                id={item._id}
                value={item._id}
                checked={selectedSubCats.includes(item._id)}
                onChange={handleChange}
              />
              <label htmlFor={item._id}>{item.title}</label>
            </div>
          ))}
        </div>

        {/* Worth having now that the catalog spans a wide price range. */}
        <div className="filterItem">
          <h2>Max price</h2>
          <div className="inputItem">
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
            <span>${maxPrice}</span>
          </div>
        </div>

        <div className="filterItem">
          <h2>Sort by</h2>
          <div className="inputItem">
            <input
              type="radio"
              id="asc"
              value="asc"
              name="price"
              checked={sort === "asc"}
              onChange={() => setSort("asc")}
            />
            <label htmlFor="asc">Low to High Price</label>
          </div>
          <div className="inputItem">
            <input
              type="radio"
              id="desc"
              value="desc"
              name="price"
              checked={sort === "desc"}
              onChange={() => setSort("desc")}
            />
            <label htmlFor="desc">High to Low Price</label>
          </div>
        </div>
      </div>
      <div className="right">
        <img
          className="catImg"
          src="/img/fashion2.jpg"
          alt=""
        />
        <List catId={catId} maxPrice={maxPrice} sort={sort} subCats={selectedSubCats}/>
      </div>
    </div>
  );
};

export default Products;