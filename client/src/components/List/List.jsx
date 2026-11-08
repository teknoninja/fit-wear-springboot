import React, { useState, useEffect, useCallback } from "react";
import "./List.scss";
import Card from "../Card/Card";
import { fetchProducts } from "../../lib/products";

const List = ({ subCats, maxPrice, sort, catId }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // subCats is a new array identity on every parent render, so depend on a
  // stable string of it rather than the array itself — otherwise this refetches
  // in a loop.
  const subCatsKey = subCats.join(",");

  const load = useCallback(
    async (nextPage, append) => {
      setLoading(true);
      setError(false);
      try {
        const { items: rows, hasMore: more } = await fetchProducts({
          categoryId: catId,
          subCategoryIds: subCatsKey ? subCatsKey.split(",") : [],
          maxPrice,
          sort,
          page: nextPage,
        });
        setItems((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(more);
      } catch (err) {
        console.error(err);
        setError(true);
      }
      setLoading(false);
    },
    [catId, subCatsKey, maxPrice, sort]
  );

  // Any filter change resets to the first page.
  useEffect(() => {
    setPage(0);
    load(0, false);
  }, [load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, true);
  };

  if (error) return <div className="list">Something went wrong!</div>;

  return (
    <>
      <div className="list">
        {items.map((item) => (
          <Card item={item} key={item._id} />
        ))}
      </div>

      {loading && <div className="listStatus">loading…</div>}

      {!loading && !items.length && (
        <div className="listStatus">No products match these filters.</div>
      )}

      {!loading && hasMore && (
        <button className="loadMore" onClick={loadMore}>
          LOAD MORE
        </button>
      )}
    </>
  );
};

export default List;
