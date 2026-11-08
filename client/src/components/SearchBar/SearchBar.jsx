import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { searchProducts } from "../../lib/products";
import "./SearchBar.scss";

const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;

// Navbar search. Collapsed to an icon until clicked, then expands into an input
// with live suggestions. Enter (or "see all") goes to the full /search page.
const SearchBar = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Focus as soon as it expands, so the user can type straight away.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced lookup. Without the delay every keystroke would fire a query.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const rows = await searchProducts(query, { limit: MAX_SUGGESTIONS });
        if (active) setResults(rows);
      } catch (err) {
        console.error(err);
        if (active) setResults([]);
      }
      if (active) setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    close();
  };

  const showPanel = query.trim().length >= 2;

  return (
    // The toggle stays in the layout at a fixed icon width and the expanded
    // form is overlaid on top of it. Rendering the wide input inline instead
    // would reflow the navbar and push the "Fit-Wear" title into the nav links.
    <div className={`searchBar ${open ? "open" : ""}`} ref={wrapRef}>
      <button
        className="searchToggle"
        onClick={() => setOpen(true)}
        title="Search products"
        aria-label="Search products"
        tabIndex={open ? -1 : 0}
      >
        <SearchIcon />
      </button>

      {open && (
        <div className="searchOverlay">
          <form className="searchForm" onSubmit={handleSubmit} role="search">
            <SearchIcon className="searchGlyph" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for shirts, sneakers, brands…"
              aria-label="Search products"
            />
            <button
              type="button"
              className="searchClose"
              onClick={close}
              aria-label="Close search"
            >
              <CloseIcon fontSize="small" />
            </button>
          </form>

          {showPanel && (
        <div className="searchPanel">
          {loading && <div className="searchNote">Searching…</div>}

          {!loading && !results.length && (
            <div className="searchNote">No products match “{query.trim()}”.</div>
          )}

          {!loading &&
            results.map((item) => (
              <Link
                className="searchResult"
                key={item._id}
                to={`/product/${item._id}`}
                onClick={close}
              >
                <img src={item.img} alt="" />
                <span className="searchResultTitle">{item.title}</span>
                <span className="searchResultPrice">${item.price}</span>
              </Link>
            ))}

          {!loading && results.length > 0 && (
            <button className="searchSeeAll" onClick={handleSubmit}>
              See all results for “{query.trim()}”
            </button>
          )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
