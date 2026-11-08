import React, { useState, useEffect } from "react";
import "./Categories.scss";
import { Link } from "react-router-dom";
import { fetchCategories } from "../../lib/products";

const Categories = () => {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => {
        console.error(err);
        setCategories([]);
      });
  }, []);

  if (!categories) return <div>Loading categories...</div>;

  // This creates a more flexible grid based on your data
  return (
    <div className="categories">
      {categories.map((category) => (
        <div className="col" key={category._id}>
          <div className="row">
            <img src={category.imageUrl} alt={category.title} />
            <Link to={`/products/${category._id}`} className="link">
              {category.title}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Categories;
