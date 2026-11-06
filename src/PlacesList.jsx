import React from "react";
export function PlacesList({ state }) {
  const {
    category,
    setCategory,
    places,
    selected,
    listLoading,
    listError,
    error,
    rating,
    busy,
    select,
    review,
    setRevision,
  } = state;
  return (
    <aside>
      <div className="explore-title">
        <h2>Explore the city</h2>
        <span>{places.length} places</span>
      </div>
      <div className="filters" aria-label="Filter by category">
        {["All", "History", "Food", "Nature"].map((c) => (
          <button
            disabled={busy}
            key={c}
            aria-pressed={category === c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="sort">
        <span>CURATED BY COMMUNITY</span>
        <label>
          Sort:{" "}
          <select aria-label="Sort places" value="top" onChange={() => {}}>
            <option value="top">Top rated</option>
          </select>
        </label>
      </div>
      <div className="place-list">
        {listLoading ? (
          <p className="list-message" role="status">
            Finding places…
          </p>
        ) : listError ? (
          <p className="list-message error" role="alert">
            {listError}{" "}
            <button onClick={() => setRevision((v) => v + 1)}>Retry</button>
          </p>
        ) : (
          places.map((p) => (
            <button
              disabled={busy}
              key={p.id}
              onClick={() => select(p.id)}
              aria-current={selected === p.id ? "page" : undefined}
              className={`place ${selected === p.id ? "selected" : ""}`}
            >
              <span className={`place-icon ${p.category.toLowerCase()}`}>
                {p.category === "History"
                  ? "⌂"
                  : p.category === "Nature"
                    ? "♧"
                    : "☕"}
              </span>
              <span className="place-info">
                <strong>{p.name}</strong>
                <small>
                  {p.category} <span>·</span> {p.neighborhood}
                </small>
                <span className="rating-line">
                  <b>★ {p.average_rating.toFixed(1)}</b>
                  <span>
                    ({p.review_count}{" "}
                    {p.review_count === 1 ? "review" : "reviews"})
                  </span>
                  {p.review_count < 3 && <em>New</em>}
                </span>
              </span>
              <span className="place-arrow">↗</span>
            </button>
          ))
        )}
      </div>
      <div className="honest-note">
        <span>✧</span>
        <p>
          <strong>Good ratings take more than one voice.</strong>Our ranking
          balances stars with review count, giving well-loved places their due.
        </p>
      </div>
    </aside>
  );
}
