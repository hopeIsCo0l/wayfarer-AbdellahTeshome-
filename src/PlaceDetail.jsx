import React from "react";
import { dateFormat, timeFormat } from "./dates.js";
export function PlaceDetail({ state }) {
  const {
    category,
    detail,
    loading,
    error,
    notice,
    rating,
    setRating,
    body,
    setBody,
    busy,
    seatCounts,
    setSeatCounts,
    select,
    review,
    book,
    setRevision,
  } = state;
  return (
    <article className="detail">
      {notice && (
        <div className="notice" role="status">
          ✓ {notice}
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button onClick={() => setRevision((v) => v + 1)}>Refresh</button>
        </div>
      )}
      {loading ? (
        <div className="loading" role="status">
          Finding the details…
        </div>
      ) : (
        detail && (
          <>
            <div className="place-heading">
              <div>
                <p className="eyebrow">
                  {detail.category} <span>/</span> {detail.neighborhood}
                </p>
                <h2>{detail.name}</h2>
                <p className="detail-rating">
                  <b>★ {detail.average_rating.toFixed(1)}</b>{" "}
                  <span>{detail.review_count} traveller reviews</span>
                  <span className="hours">◷ {detail.opening_hours}</span>
                </p>
              </div>
              <span className="detail-mark">
                {detail.category === "History"
                  ? "⌂"
                  : detail.category === "Nature"
                    ? "♧"
                    : "☕"}
              </span>
            </div>
            <p className="description">{detail.description}</p>
            <section className="tours">
              <div className="section-title">
                <h3>A little more than a visit</h3>
                <span>GUIDED TOURS</span>
              </div>
              <p className="section-subtitle">
                A local perspective makes all the difference. Save your spot.
              </p>
              {detail.slots.length ? (
                <>
                  <p className="timezone">All times in Addis Ababa (EAT)</p>
                  {detail.slots.map((slot) => (
                    <div className="tour" key={slot.id}>
                      <span className="calendar-icon">▦</span>
                      <div className="tour-time">
                        <strong>
                          {dateFormat.format(new Date(slot.starts_at))}
                        </strong>
                        <span>
                          {timeFormat.format(new Date(slot.starts_at))} · Guided
                          visit
                        </span>
                      </div>
                      <div
                        className={`availability ${slot.seats_left === 1 ? "last" : ""}`}
                      >
                        <span className="dot" />
                        {slot.seats_left
                          ? `${slot.seats_left} of ${slot.capacity} seats left`
                          : "Fully booked"}
                        {slot.my_seats > 0 && (
                          <small>
                            You booked {slot.my_seats} seat
                            {slot.my_seats === 1 ? "" : "s"}
                          </small>
                        )}
                      </div>
                      {slot.seats_left > 0 && (
                        <select
                          aria-label={`Seats for ${timeFormat.format(new Date(slot.starts_at))}`}
                          disabled={busy}
                          value={Math.min(
                            seatCounts[slot.id] || 1,
                            slot.seats_left,
                          )}
                          onChange={(e) =>
                            setSeatCounts({
                              ...seatCounts,
                              [slot.id]: Number(e.target.value),
                            })
                          }
                        >
                          {Array.from({ length: slot.seats_left }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1} {i === 0 ? "seat" : "seats"}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        className="primary book"
                        disabled={busy || !slot.seats_left}
                        onClick={() => book(slot)}
                      >
                        {slot.seats_left ? "Book tour ↗" : "Sold out"}
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <p className="empty">
                  No upcoming guided tours. Explore this place at your own pace.
                </p>
              )}
            </section>
            <section className="reviews">
              <div className="section-title">
                <h3>Stories from fellow travellers</h3>
                <span>{detail.review_count} REVIEWS</span>
              </div>
              <div className="review-grid">
                {detail.reviews.slice(0, 4).map((r) => (
                  <div className="review" key={r.id}>
                    <div
                      className="review-stars"
                      aria-label={`${r.rating} out of 5 stars`}
                    >
                      {"★".repeat(r.rating)}
                      <span>{"★".repeat(5 - r.rating)}</span>
                    </div>
                    <p>“{r.body}”</p>
                    <small>
                      <span className="mini-avatar">{r.name[0]}</span>
                      {r.name}
                    </small>
                  </div>
                ))}
              </div>
              <p className="review-caption">
                Showing {Math.min(4, detail.reviews.length)} recent reviews
              </p>
            </section>
            <form className="review-form" onSubmit={review}>
              <div>
                <h3>
                  {detail.myReview
                    ? "Update your story"
                    : "Been here? Share your story."}
                </h3>
                <p>Your perspective helps the next traveller.</p>
              </div>
              <fieldset disabled={busy}>
                <legend>Your rating</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    className={n <= rating ? "star chosen" : "star"}
                    key={n}
                  >
                    <input
                      type="radio"
                      name="rating"
                      required
                      value={n}
                      checked={rating === n}
                      onChange={() => setRating(n)}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    />
                    ★
                  </label>
                ))}
              </fieldset>
              <label className="review-text">
                Your review
                <textarea
                  required
                  maxLength={500}
                  disabled={busy}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What made this place worth the visit?"
                />
              </label>
              <div className="form-bottom">
                <small>
                  One review per place. You can always update it. ·{" "}
                  {body.length}/500
                </small>
                <button className="primary" disabled={busy || !rating}>
                  {busy
                    ? "Saving…"
                    : detail.myReview
                      ? "Update review"
                      : "Share review ↗"}
                </button>
              </div>
            </form>
          </>
        )
      )}
    </article>
  );
}
