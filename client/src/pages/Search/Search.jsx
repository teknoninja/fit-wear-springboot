import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import Card from "../../components/Card/Card";
import { searchProducts } from "../../lib/products";
import "./Search.scss";

// Suggestions for an empty or fruitless search, so the page is never a dead end.
const SUGGESTED = ["shirt", "sneakers", "dress", "watch", "leather", "denim"];

const Search = () => {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";

  // Local copy so typing stays responsive; the URL updates on submit, which
  // keeps results shareable and the back button working.
  const [draft, setDraft] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);

    searchProducts(query)
      .then((rows) => {
        if (!active) return;
        setResults(rows);
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
  }, [query]);

  const submit = (e) => {
    e.preventDefault();
    const q = draft.trim();
    if (q.length >= 2) setParams({ q });
  };

  return (
    <div className="searchPage">
      <form className="searchPageForm" onSubmit={submit} role="search">
        <SearchIcon />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search for shirts, sneakers, brands…"
          aria-label="Search products"
        />
        <button type="submit">SEARCH</button>
      </form>

      {query && (
        <p className="searchSummary">
          {loading
            ? "Searching…"
            : error
            ? "Something went wrong with that search."
            : `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”`}
        </p>
      )}

      {!loading && !error && query && !results.length && (
        <div className="searchEmpty">
          <h2>No matches</h2>
          <p>Try a different word, or browse one of these:</p>
          <div className="searchChips">
            {SUGGESTED.map((s) => (
              <Link key={s} to={`/search?q=${s}`} className="searchChip">
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!query && (
        <div className="searchEmpty">
          <h2>What are you looking for?</h2>
          <p>Search by product name, brand, material or colour.</p>
          <div className="searchChips">
            {SUGGESTED.map((s) => (
              <Link key={s} to={`/search?q=${s}`} className="searchChip">
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="searchResults">
        {results.map((item) => (
          <Card item={item} key={item._id} />
        ))}
      </div>
    </div>
  );
};

export default Search;
