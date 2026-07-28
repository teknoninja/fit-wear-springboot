import React, { useEffect, useState } from "react";
import Card from "../Card/Card";
import "./ProductRail.scss";

/**
 * A horizontally scrolling row of recommended products.
 *
 * Takes a `load` function rather than data so each rail fetches independently —
 * one slow or failing rail never blocks the others, and the page renders as
 * soon as anything is ready.
 *
 * Renders nothing at all when there are no results. An empty "Recommended for
 * you" heading looks broken; no heading looks intentional.
 */
const ProductRail = ({ title, subtitle, load, limit = 8, deps = [] }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    load(limit)
      .then((rows) => {
        if (!active) return;
        setItems(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setItems([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (loading) {
    return (
      <section className="productRail">
        <div className="railHeader">
          <h2>{title}</h2>
        </div>
        <div className="railTrack">
          {/* Skeletons keep the row height stable so the page does not jump
              when results arrive. */}
          {Array.from({ length: 4 }, (_, i) => (
            <div className="railSkeleton" key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="productRail">
      <div className="railHeader">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="railTrack">
        {items.map((item) => (
          <div className="railItem" key={item._id}>
            <Card item={item} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductRail;
